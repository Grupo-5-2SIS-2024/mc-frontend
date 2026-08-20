// Base da API: usa o mesmo origin do frontend para evitar CORS
const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : '';

function normalizarLead(lead) {
    const nome = lead?.nome || '';
    const sobrenome = lead?.sobrenome || '';
    const email = lead?.email || '';
    const telefone = lead?.telefone || '';
    const fase = lead?.fase || '';
    const dataEntrada = lead?.dataInsercao || null;

    return {
        ...lead,
        id: lead?.id ?? lead?.idPossivelCliente,
        nome,
        sobrenome,
        email,
        cpf: lead?.cpf || '',
        telefone,
        dataNascimento: lead?.dataNascimento || null,
        fase,
        dataEntrada,
        tipoDeContato: lead?.tipoDeContato || null
    };
}

function formatarData(data, opcoes) {
    if (!data) return 'Não informada';
    const dataFormatada = new Date(data);
    return Number.isNaN(dataFormatada.getTime())
        ? 'Não informada'
        : dataFormatada.toLocaleDateString('pt-BR', opcoes);
}

function obterTipoDeContato(tipoDeContato) {
    if (!tipoDeContato) return 'Não informado';
    if (typeof tipoDeContato === 'string') return tipoDeContato;

    return tipoDeContato.faseContato ||
        tipoDeContato.nome ||
        tipoDeContato.descricao ||
        tipoDeContato.tipo ||
        (tipoDeContato.id ? `Tipo ${tipoDeContato.id}` : 'Não informado');
}

function abrirModalConversaoLead(leadId) {
    const modal = document.getElementById('modalConversaoLead');
    const lead = window.leadsAtuais?.find(item => String(item.id) === String(leadId));
    if (!modal || !lead) return;

    modal.dataset.leadId = leadId;
    modal.style.display = 'flex';
}

function fecharModalConversaoLead() {
    const modal = document.getElementById('modalConversaoLead');
    if (modal) modal.style.display = 'none';
}

function somenteNumeros(valor) {
    return valor ? String(valor).replace(/\D/g, '') : '';
}

async function cadastrarLeadDepois() {
    const modal = document.getElementById('modalConversaoLead');
    const lead = window.leadsAtuais?.find(item => String(item.id) === String(modal?.dataset.leadId));
    if (!lead) return;

    const dadosPaciente = {
        nome: lead.nome,
        sobrenome: lead.sobrenome,
        email: lead.email,
        telefone: somenteNumeros(lead.telefone),
        cpf: somenteNumeros(lead.cpf) || null,
        dataNascimento: lead.dataNascimento || null,
        ativo: true
    };

    try {
        const resposta = await fetch(`${API_BASE}/mc/pacientes/SemResponsavel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(dadosPaciente)
        });

        if (!resposta.ok) {
            throw new Error(`HTTP ${resposta.status}`);
        }

        try {
            const exclusao = await fetch(`${API_BASE}/mc/possivel-cliente/${encodeURIComponent(lead.id)}`, {
                method: 'DELETE'
            });
            if (!exclusao.ok) throw new Error(`HTTP ${exclusao.status}`);
            window.leadsAtuais = window.leadsAtuais.filter(item => String(item.id) !== String(lead.id));
            atualizarListagemLeads(window.leadsAtuais);
        } catch (erroExclusao) {
            console.error('Paciente criado, mas o lead não foi excluído:', erroExclusao);
        }

        fecharModalConversaoLead();
        Swal.fire({
            icon: 'success',
            title: 'Paciente cadastrado',
            text: 'Os dados disponíveis do lead foram cadastrados.',
            timer: 1800,
            showConfirmButton: false
        });
    } catch (erro) {
        console.error('Erro ao cadastrar lead como paciente:', erro);
        Swal.fire({
            icon: 'error',
            title: 'Não foi possível cadastrar',
            text: 'O backend pode exigir campos adicionais para o cadastro do paciente.'
        });
    }
}

function iniciarCadastroDoLead() {
    const modal = document.getElementById('modalConversaoLead');
    const lead = window.leadsAtuais?.find(item => String(item.id) === String(modal?.dataset.leadId));
    if (!lead) return;

    sessionStorage.setItem('leadParaCadastroPaciente', JSON.stringify({
        nome: lead.nome,
        sobrenome: lead.sobrenome,
        email: lead.email,
        telefone: lead.telefone,
        cpf: lead.cpf,
        dataNascimento: lead.dataNascimento,
        leadId: lead.id,
        leadEmail: lead.email
    }));

    window.location.href = 'cadastroPaciente.html';
}

// Funções para abrir e fechar o modal de filtros
function abrirModalFiltroLeads() {
    document.getElementById("modalFiltroLeads").style.display = "block";
}
function fecharModalFiltroLeads() {
    document.getElementById("modalFiltroLeads").style.display = "none";
}

// Funções para limpar e aplicar filtros
function limparFiltrosLeads() {
    document.getElementById('filtroNomeLead').value = '';
    document.getElementById('filtroEmailLead').value = '';
    document.getElementById('filtroDataEntradaLead').value = '';
    document.getElementById('filtroFaseLead').value = '';
    document.getElementById('listaFiltrosAtivosLeads').innerHTML = ''; // Limpa a lista de filtros ativos
    buscarLeads(); // Busca os leads sem filtros
}

function aplicarFiltrosLeads() {
    const nome = document.getElementById('filtroNomeLead').value.toLowerCase();
    const email = document.getElementById('filtroEmailLead').value.toLowerCase();
    const dataEntrada = document.getElementById('filtroDataEntradaLead').value;
    const fase = document.getElementById('filtroFaseLead').value.toLowerCase();

    const filtrosAtivos = {
        nome: nome,
        email: email,
        dataEntrada: dataEntrada,
        fase: fase
    };

    const listaFiltrosAtivos = document.getElementById('listaFiltrosAtivosLeads');
    listaFiltrosAtivos.innerHTML = '';

    // Adiciona cada filtro ativo à lista com um botão "X" para remover
    for (const [key, value] of Object.entries(filtrosAtivos)) {
        if (value) {
            const li = document.createElement('li');
            li.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;

            // Cria o botão "X" para remover o filtro
            const botaoRemover = document.createElement('button');
            botaoRemover.textContent = 'X';
            botaoRemover.classList.add('removerFiltro');
            botaoRemover.addEventListener('click', () => removerFiltroEspecifico(key));

            li.appendChild(botaoRemover);
            listaFiltrosAtivos.appendChild(li);
        }
    }

    // Busca leads com os filtros aplicados
    buscarLeads(nome, email, dataEntrada, fase);
}

// Função para remover um filtro específico
function removerFiltroEspecifico(filtro) {
    document.getElementById(`filtro${filtro.charAt(0).toUpperCase() + filtro.slice(1)}Lead`).value = '';
    aplicarFiltrosLeads(); // Reaplica os filtros após remover o específico
}

// Função para buscar leads com filtros específicos
async function buscarLeads(nomeFiltro = '', emailFiltro = '', dataEntradaFiltro = '', faseFiltro = '') {
    try {
        const resposta = await fetch(`${API_BASE}/mc/possivel-cliente`);
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const listaLeads = await resposta.json();

        const leadsNormalizados = (Array.isArray(listaLeads) ? listaLeads : []).map(normalizarLead);

        const leadsFiltrados = leadsNormalizados.filter(lead => {
            const nomeCompleto = `${lead.nome} ${lead.sobrenome}`.toLowerCase();
            const dataEntrada = lead.dataEntrada ? lead.dataEntrada.substring(0, 10) : '';
            return (
                (nomeCompleto.includes(nomeFiltro) || nomeFiltro === '') &&
                ((lead.email || '').toLowerCase().includes(emailFiltro) || emailFiltro === '') &&
                (dataEntrada === dataEntradaFiltro || dataEntradaFiltro === '') &&
                ((lead.fase || '').toLowerCase().includes(faseFiltro) || faseFiltro === '')
            );
        });

        atualizarListagemLeads(leadsFiltrados);
    } catch (e) {
        console.log(e);
    }
}

// Função para atualizar a listagem de leads
function atualizarListagemLeads(listaLeads) {
    const cardsLeads = document.getElementById("listagemLeads");
    if (!cardsLeads) return;

    if (!Array.isArray(listaLeads) || listaLeads.length === 0) {
        cardsLeads.innerHTML = '<div class="cardLead empty-state">Nenhum lead encontrado.</div>';
        return;
    }

    window.leadsAtuais = listaLeads;
    cardsLeads.innerHTML = listaLeads.map(lead => {
        const nomeCompleto = [lead.nome, lead.sobrenome].filter(Boolean).join(' ').trim() || 'Nome não informado';
        const dataEntradaFormatada = formatarData(lead.dataEntrada, { day: '2-digit', month: '2-digit', year: 'numeric' });
        const dataNascimentoFormatada = formatarData(lead.dataNascimento, { day: '2-digit', month: '2-digit', year: 'numeric' });
        const formatarTelefone = (telefone) => telefone ? telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : 'Não informado';

        return `
            <div class="cardLead" data-lead-id="${lead.id ?? ''}">
                <div class="info">
                    <div class="field">
                        <label>Nome</label>
                        <p>${nomeCompleto}</p>
                    </div>
                    <div class="field">
                        <label>Email</label>
                        <p>${lead.email || 'Não informado'}</p>
                    </div>
                    <div class="field">
                        <label>CPF</label>
                        <p>${lead.cpf || 'Não informado'}</p>
                    </div>
                    <div class="field">
                        <label>Dt. de Entrada</label>
                        <p>${dataEntradaFormatada}</p>
                    </div>
                    <div class="field">
                        <label>Dt. de Nasc.</label>
                        <p>${dataNascimentoFormatada}</p>
                    </div>
                    <div class="field">
                        <label>Telefone</label>
                        <p>${formatarTelefone(lead.telefone)}</p>
                    </div>
                    <div class="field">
                        <label>Fase</label>
                        <p>${lead.fase || 'Não informada'}</p>
                    </div>
                    <div class="field">
                        <label>Contato</label>
                        <p>${obterTipoDeContato(lead.tipoDeContato)}</p>
                    </div>
                </div>
                <div class="actions">
                    <button class="convert" title="Converter em paciente" onclick="abrirModalConversaoLead('${lead.id ?? ''}')">
                        <i class="fas fa-user-plus"></i>
                    </button>
                    
                    <button class="update" title="Atualizar lead" onclick="window.location.href='cadastroLead.html?id=${encodeURIComponent(lead.id ?? '')}'">
                        <i class="fas fa-edit"></i>
                    </button>
                    
                    <button class="delete" title="Excluir lead"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `;
    }).join('');

    // Adiciona evento de clique para os botões de exclusão
    cardsLeads.querySelectorAll('.delete').forEach((botao) => {
        botao.addEventListener('click', function () {
            const card = this.closest('.cardLead');
            const id = card.dataset.leadId;

            if (id) {
                Swal.fire({
                    title: 'Tem certeza?',
                    text: "Você não poderá reverter isso!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Sim, deletar!',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        deletarLead(id);
                    }
                });
            } else {
                console.error('ID do lead não encontrado.');
            }
        });
    });
}

async function deletarLead(id) {
    try {
        const resposta = await fetch(`${API_BASE}/mc/possivel-cliente/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        console.log('Lead deletado com sucesso.');
        buscarLeads();
    } catch (erro) {
        console.error('Erro ao deletar lead:', erro);
    }
}

async function buscarLeadPorId(id) {
    const resposta = await fetch(`${API_BASE}/mc/possivel-cliente/${encodeURIComponent(id)}`);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return resposta.json();
}

async function criarLead(payload) {
    const resposta = await fetch(`${API_BASE}/mc/possivel-cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return resposta.json();
}

async function atualizarLead(id, payload) {
    const resposta = await fetch(`${API_BASE}/mc/possivel-cliente/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return resposta.json();
}

// Chama a função para listar os leads ao carregar a página
buscarLeads();

async function buscarKPIsLeads() {
    try {
        const resposta = await fetch(`${API_BASE}/mc/possivel-cliente`);
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
        const listaLeads = await resposta.json();
        const leadsNormalizados = (Array.isArray(listaLeads) ? listaLeads : []).map(normalizarLead);
        const totalLeads = leadsNormalizados.length;
        const leadsConvertidos = leadsNormalizados.filter(lead =>
            lead.fase.trim().toLowerCase() === 'convertido'
        ).length;
        const porcentagemConvertidos = totalLeads === 0
            ? 0
            : Math.round((leadsConvertidos / totalLeads) * 100);

        // Filtrar leads com mais de 6 meses de cadastro
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

        const leadsMaisDeSeisMeses = leadsNormalizados.filter(lead => {
            const dataEntrada = lead.dataEntrada ? new Date(lead.dataEntrada) : null;
            return dataEntrada && dataEntrada < seisMesesAtras;
        });
        const totalLeadsMaisDeSeisMeses = leadsMaisDeSeisMeses.length;

        // Função para adicionar zero à esquerda se necessário
        const formatarNumero = (numero) => numero.toString().padStart(2, '0');

        // Atualizar os valores nos elementos HTML, com zero à esquerda
        document.querySelector('.cardKpi:nth-child(1) .kpiNumber').textContent = formatarNumero(totalLeads);
        document.querySelector('.cardKpi:nth-child(2) .kpiNumber').textContent = porcentagemConvertidos + '%';
        document.querySelector('.cardKpi:nth-child(3) .kpiNumber').textContent = formatarNumero(totalLeadsMaisDeSeisMeses);

    } catch (erro) {
        console.error('Erro ao buscar os dados dos KPIs:', erro);
    }
}

buscarKPIsLeads();