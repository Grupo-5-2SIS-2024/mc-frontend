// Base da API: usa localhost em dev, vazio em produção
const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : '';

// Variáveis globais
let todasConsultas = [];
let consultasFiltradas = [];
let medicosFiltro = [];
let usuarioLogado = {
    id: null,
    perfil: null,
    especificacao: null,
    areaId: null
};
let filtroTerapia = 'ABA'; // ABA | Convencional (alinhado ao calendário)

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosUsuario();
    exibirDataAtual();
    carregarMedicos();
    carregarConsultas();
    configurarViewToggle();
    
    // Atualizar a cada 5 minutos
    setInterval(carregarConsultas, 300000);
});

// Carrega dados do usuário logado
function carregarDadosUsuario() {
    usuarioLogado.id = parseInt(sessionStorage.getItem("ID_MEDICO"));
    const nivelPermissao = sessionStorage.getItem("PERMISSIONAMENTO_MEDICO") || '';
    const especificacao = sessionStorage.getItem("ESPECIFICACAO_MEDICA") || '';
    
    // Normaliza e identifica o perfil
    const nivelNorm = nivelPermissao.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
    
    if (nivelNorm.includes('admin')) {
        usuarioLogado.perfil = 'admin';
    } else if (nivelNorm.includes('supervi')) {
        usuarioLogado.perfil = 'supervisor';
        usuarioLogado.especificacao = especificacao;
    } else {
        usuarioLogado.perfil = 'medico';
    }
    
    console.log('Usuário logado:', usuarioLogado);
}

// Exibe a data atual no formato extenso
function exibirDataAtual() {
    const hoje = new Date();
    const opcoes = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dataFormatada = hoje.toLocaleDateString('pt-BR', opcoes);
    document.getElementById('dataAtual').textContent = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
}

// Carrega lista de médicos para o filtro
async function carregarMedicos() {
    try {
        const resposta = await fetch(`${API_BASE}/mc/medicos`);
        if (!resposta.ok) throw new Error('Erro ao carregar médicos');
        
        let todosMedicos = await resposta.json();
        
        // Filtra médicos baseado no perfil do usuário
        if (usuarioLogado.perfil === 'supervisor') {
            // Supervisor vê apenas médicos da sua área
            medicosFiltro = todosMedicos.filter(medico => 
                medico.especificacaoMedica?.area === usuarioLogado.especificacao
            );
        } else if (usuarioLogado.perfil === 'medico') {
            // Médico vê apenas ele mesmo
            medicosFiltro = todosMedicos.filter(medico => medico?.id === usuarioLogado.id);
        } else {
            // Admin vê todos
            medicosFiltro = todosMedicos;
        }
        
        const select = document.getElementById('filtroMedico');
        
        // Se for médico (apenas 1 opção), esconde o filtro e o botão
        if (usuarioLogado.perfil === 'medico') {
            const filterGroup = select.closest('.filter-group');
            if (filterGroup) filterGroup.style.display = 'none';
            
            const filterButton = document.querySelector('.filter-button');
            if (filterButton) filterButton.style.display = 'none';
        } else {
            select.innerHTML = '<option value="">Todos os Profissionais</option>';
            medicosFiltro.forEach(medico => {
                const option = document.createElement('option');
                option.value = medico.id;
                option.textContent = `${medico.nome} ${medico.sobrenome} - ${medico.especificacaoMedica?.area || ''}`;
                select.appendChild(option);
            });
        }
    } catch (erro) {
        console.error('Erro ao carregar médicos:', erro);
    }
}

// Carrega consultas do dia atual
async function carregarConsultas() {
    try {
        const resposta = await fetch(`${API_BASE}/mc/consultas`);
        if (!resposta.ok) throw new Error('Erro ao carregar consultas');
        
        const consultas = await resposta.json();
        
        // Filtra apenas consultas de hoje (usando horário local, não UTC)
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        const dataHoje = `${ano}-${mes}-${dia}`; // YYYY-MM-DD no horário local
        
        let consultasHoje = consultas.filter(consulta => {
            const dataConsulta = consulta.datahoraConsulta.split('T')[0];
            return dataConsulta === dataHoje;
        });
        
        // Aplica filtro baseado no perfil do usuário
        if (usuarioLogado.perfil === 'medico') {
            // Médico vê apenas suas próprias consultas
            consultasHoje = consultasHoje.filter(c => c.medico?.id === usuarioLogado.id);
        } else if (usuarioLogado.perfil === 'supervisor') {
            // Supervisor vê apenas consultas da sua área (comparação case-insensitive)
            const areaUsuario = (usuarioLogado.especificacao || '').toLowerCase().trim();
            consultasHoje = consultasHoje.filter(c => {
                const areaConsulta = (c.especificacaoMedica?.area || '').toLowerCase().trim();
                const areaMedico = (c.medico?.especificacaoMedica?.area || '').toLowerCase().trim();
                return areaConsulta === areaUsuario || areaMedico === areaUsuario;
            });
        }
        // Admin vê todas (sem filtro adicional)
        
        todasConsultas = consultasHoje;
        
        // Ordena por horário
        todasConsultas.sort((a, b) => {
            return new Date(a.datahoraConsulta) - new Date(b.datahoraConsulta);
        });
        
        consultasFiltradas = aplicarFiltroTerapia([...todasConsultas]);
        aplicarFiltroMedico();
        
    } catch (erro) {
        console.error('Erro ao carregar consultas:', erro);
        exibirMensagemErro();
    }
}

function duracaoEmMinutos(consulta) {
    const d = consulta?.duracaoConsulta;
    if (typeof d === 'number') return d;
    if (typeof d === 'string') {
        const partes = d.split(':');
        if (partes.length >= 2) {
            const horas = parseInt(partes[0], 10) || 0;
            const minutos = parseInt(partes[1], 10) || 0;
            return horas * 60 + minutos;
        }
        const m = parseInt(d, 10);
        return isNaN(m) ? 0 : m;
    }
    return 0;
}

function tipoTerapia(consulta) {
    const mins = duracaoEmMinutos(consulta);
    if (mins === 50) return 'ABA';
    if (mins === 30) return 'Convencional';
    return 'Outros';
}

function aplicarFiltroTerapia(lista) {
    return lista.filter(c => tipoTerapia(c) === filtroTerapia);
}

function configurarViewToggle() {
    const btnAba = document.getElementById('btnModoABA');
    const btnConv = document.getElementById('btnModoConvencional');
    const labelModo = document.getElementById('modoAtualLabel');

    const atualizarUI = () => {
        if (btnAba && btnConv) {
            if (filtroTerapia === 'ABA') {
                btnAba.classList.add('active');
                btnConv.classList.remove('active');
                btnAba.setAttribute('aria-pressed', 'true');
                btnConv.setAttribute('aria-pressed', 'false');
            } else {
                btnConv.classList.add('active');
                btnAba.classList.remove('active');
                btnConv.setAttribute('aria-pressed', 'true');
                btnAba.setAttribute('aria-pressed', 'false');
            }
        }
        if (labelModo) {
            labelModo.textContent = `Modo: ${filtroTerapia}`;
            labelModo.style.background = filtroTerapia === 'ABA' ? '#E8F5E9' : '#E3F2FD';
            labelModo.style.color = filtroTerapia === 'ABA' ? '#2E7D32' : '#1565C0';
        }
    };

    if (btnAba) btnAba.addEventListener('click', () => { filtroTerapia = 'ABA'; consultasFiltradas = aplicarFiltroTerapia([...todasConsultas]); atualizarUI(); exibirConsultas(); atualizarResumo(); });
    if (btnConv) btnConv.addEventListener('click', () => { filtroTerapia = 'Convencional'; consultasFiltradas = aplicarFiltroTerapia([...todasConsultas]); atualizarUI(); exibirConsultas(); atualizarResumo(); });

    atualizarUI();
}

// Aplica filtro por médico
function aplicarFiltroMedico() {
    const medicoId = document.getElementById('filtroMedico').value;
    
    if (medicoId) {
        consultasFiltradas = todasConsultas.filter(c => c.medico?.id == medicoId);
    } else {
        consultasFiltradas = [...todasConsultas];
    }
    
    exibirConsultas();
    atualizarResumo();
    fecharModalFiltro();
}

// Limpa filtros
function limparFiltros() {
    document.getElementById('filtroMedico').value = '';
    consultasFiltradas = [...todasConsultas];
    exibirConsultas();
    atualizarResumo();
    fecharModalFiltro();
}

// Abre modal de filtro
function abrirModalFiltro() {
    document.getElementById('modalFiltro').style.display = 'flex';
}

// Fecha modal de filtro
function fecharModalFiltro() {
    document.getElementById('modalFiltro').style.display = 'none';
}

// Exibe consultas na timeline
function exibirConsultas() {
    const timeline = document.getElementById('agendaTimeline');
    const empty = document.getElementById('agendaEmpty');
    
    if (consultasFiltradas.length === 0) {
        timeline.style.display = 'none';
        empty.style.display = 'block';
        return;
    }
    
    timeline.style.display = 'flex';
    empty.style.display = 'none';
    
    const lista = aplicarFiltroTerapia(consultasFiltradas);
    timeline.innerHTML = lista.map(consulta => {
        const dataHora = new Date(consulta.datahoraConsulta);
        const hora = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const status = consulta.statusConsulta?.nomeStatus || 'Agendada';
        const statusClass = status.toLowerCase().replace(/\s+/g, '');
        const isAgendada = status.toLowerCase() === 'agendada';
        
        const paciente = `${consulta.paciente?.nome || ''} ${consulta.paciente?.sobrenome || ''}`.trim();
        const medico = `${consulta.medico?.nome || ''} ${consulta.medico?.sobrenome || ''}`.trim();
        const area = consulta.especificacaoMedica?.area || consulta.medico?.especificacaoMedica?.area || '';
        const duracao = formatarDuracao(consulta.duracaoConsulta);
        
        return `
            <div class="task ${statusClass}" onclick="abrirDetalhes(${consulta.id})">
                <div class="task-header">
                    <div class="task-time">
                        <i class="fas fa-clock"></i>
                        ${hora}
                    </div>
                    <span class="task-status ${statusClass}">${status}</span>
                </div>
                
                <div class="task-info">
                    <div class="task-detail">
                        <i class="fas fa-user"></i>
                        <span><strong>Paciente:</strong> ${paciente}</span>
                    </div>
                    <div class="task-detail">
                        <i class="fas fa-user-md"></i>
                        <span><strong>Profissional:</strong> ${medico}</span>
                    </div>
                    <div class="task-detail">
                        <i class="fas fa-stethoscope"></i>
                        <span><strong>Área:</strong> ${area}</span>
                    </div>
                    <div class="task-detail">
                        <i class="fas fa-hourglass-half"></i>
                        <span><strong>Duração:</strong> ${duracao}</span>
                    </div>
                </div>
                
                ${consulta.descricao ? `
                    <div class="task-description">
                        <i class="fas fa-comment-dots"></i> ${consulta.descricao}
                    </div>
                ` : ''}
                ${isAgendada ? `
                <div class="task-actions" style="margin-top:8px; display:flex; gap:6px;">
                    <button class="filter-button" onclick="mudarStatus(${consulta.id}, 'Atendida', event)"><i class="fas fa-check"></i> Atendida</button>
                    <button class="filter-button" onclick="mudarStatus(${consulta.id}, 'Cancelada', event)"><i class="fas fa-ban"></i> Cancelada</button>
                    <button class="filter-button" onclick="mudarStatus(${consulta.id}, 'Faltou', event)"><i class="fas fa-user-slash"></i> Faltou</button>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function mudarStatus(consultaId, novoStatus, event) {
    if (event) event.stopPropagation();
    // Só permite alterar se o status atual for 'Agendada'
    const consultaAtual = (todasConsultas.find(c => c.id === consultaId) || consultasFiltradas.find(c => c.id === consultaId));
    const statusAtual = (consultaAtual?.statusConsulta?.nomeStatus || 'Agendada').toLowerCase();
    if (statusAtual !== 'agendada') {
        alert('Esta consulta não pode mais ser alterada.');
        return;
    }
    try {
        const resposta = await fetch(`${API_BASE}/mc/consultas/${consultaId}/status?status=${encodeURIComponent(novoStatus)}`, {
            method: 'PATCH'
        });
        if (!resposta.ok) throw new Error('Erro ao atualizar status');
        // Atualiza localmente
        [todasConsultas, consultasFiltradas].forEach(lista => {
            const idx = lista.findIndex(c => c.id === consultaId);
            if (idx >= 0) {
                lista[idx].statusConsulta = lista[idx].statusConsulta || {};
                lista[idx].statusConsulta.nomeStatus = novoStatus;
            }
        });
        exibirConsultas();
        atualizarResumo();
    } catch (erro) {
        console.error('Falha ao mudar status:', erro);
        alert('Não foi possível atualizar o status da consulta.');
    }
}

// Atualiza resumo do dia
function atualizarResumo() {
    const total = consultasFiltradas.length;
    const agendadas = consultasFiltradas.filter(c => 
        c.statusConsulta?.nomeStatus?.toLowerCase() === 'agendada'
    ).length;
    const realizadas = consultasFiltradas.filter(c => 
        c.statusConsulta?.nomeStatus?.toLowerCase() === 'realizada' ||
        c.statusConsulta?.nomeStatus?.toLowerCase() === 'concluída'
    ).length;
    const canceladas = consultasFiltradas.filter(c => 
        c.statusConsulta?.nomeStatus?.toLowerCase() === 'cancelada'
    ).length;
    
    document.getElementById('totalConsultas').textContent = total;
    document.getElementById('consultasAgendadas').textContent = agendadas;
    document.getElementById('consultasRealizadas').textContent = realizadas;
    document.getElementById('consultasCanceladas').textContent = canceladas;
}

// Formata duração da consulta
function formatarDuracao(duracao) {
    if (!duracao) return 'Não definida';
    
    // Se for string no formato HH:MM:SS
    if (typeof duracao === 'string' && duracao.includes(':')) {
        const partes = duracao.split(':');
        const horas = parseInt(partes[0]);
        const minutos = parseInt(partes[1]);
        
        if (horas > 0) {
            return `${horas}h ${minutos}min`;
        }
        return `${minutos} min`;
    }
    
    // Se for número (minutos)
    if (typeof duracao === 'number') {
        return `${duracao} min`;
    }
    
    return duracao;
}

// Abre modal com detalhes da consulta
function abrirDetalhes(consultaId) {
    const consulta = consultasFiltradas.find(c => c.id === consultaId);
    if (!consulta) return;
    
    const dataHora = new Date(consulta.datahoraConsulta);
    const dataFormatada = dataHora.toLocaleDateString('pt-BR');
    const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const paciente = `${consulta.paciente?.nome || ''} ${consulta.paciente?.sobrenome || ''}`.trim();
    const medico = `${consulta.medico?.nome || ''} ${consulta.medico?.sobrenome || ''}`.trim();
    const area = consulta.especificacaoMedica?.area || consulta.medico?.especificacaoMedica?.area || '';
    const status = consulta.statusConsulta?.nomeStatus || 'Agendada';
    const duracao = formatarDuracao(consulta.duracaoConsulta);
    
    const detalhesHTML = `
        <div class="detalhe-item">
            <strong><i class="fas fa-calendar"></i> Data</strong>
            <span>${dataFormatada}</span>
        </div>
        <div class="detalhe-item">
            <strong><i class="fas fa-clock"></i> Horário</strong>
            <span>${horaFormatada}</span>
        </div>
        <div class="detalhe-item">
            <strong><i class="fas fa-user"></i> Paciente</strong>
            <span>${paciente}</span>
        </div>
        <div class="detalhe-item">
            <strong><i class="fas fa-id-card"></i> CPF do Paciente</strong>
            <span>${consulta.paciente?.cpf || 'Não informado'}</span>
        </div>
        <div class="detalhe-item">
            <strong><i class="fas fa-user-md"></i> Profissional</strong>
            <span>${medico}</span>
        </div>
        <div class="detalhe-item">
            <strong><i class="fas fa-stethoscope"></i> Área</strong>
            <span>${area}</span>
        </div>
        <div class="detalhe-item">
            <strong><i class="fas fa-hourglass-half"></i> Duração</strong>
            <span>${duracao}</span>
        </div>
        <div class="detalhe-item">
            <strong><i class="fas fa-info-circle"></i> Status</strong>
            <span>${status}</span>
        </div>
        ${consulta.descricao ? `
            <div class="detalhe-item">
                <strong><i class="fas fa-comment-dots"></i> Descrição</strong>
                <span>${consulta.descricao}</span>
            </div>
        ` : ''}
    `;
    
    document.getElementById('detalhesConsulta').innerHTML = detalhesHTML;
    document.getElementById('modalDetalhes').style.display = 'flex';
}

// Fecha modal
function fecharModal() {
    document.getElementById('modalDetalhes').style.display = 'none';
}

// Atualiza agenda (recarrega)
function atualizarAgenda() {
    const btnRefresh = document.querySelector('.filter-button i');
    if (btnRefresh) {
        btnRefresh.classList.add('fa-spin');
    }
    
    carregarConsultas().then(() => {
        setTimeout(() => {
            if (btnRefresh) {
                btnRefresh.classList.remove('fa-spin');
            }
        }, 500);
    });
}

// Imprime agenda
function imprimirAgenda() {
    window.print();
}

// Exibe mensagem de erro
function exibirMensagemErro() {
    const timeline = document.getElementById('agendaTimeline');
    const empty = document.getElementById('agendaEmpty');
    
    timeline.style.display = 'none';
    empty.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>Erro ao carregar consultas. Tente novamente.</p>
    `;
    empty.style.display = 'block';
}

// Fecha modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modalDetalhes');
    const modalFiltro = document.getElementById('modalFiltro');
    if (event.target === modal) {
        fecharModal();
    }
    if (event.target === modalFiltro) {
        fecharModalFiltro();
    }
};

