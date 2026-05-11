// Agenda Diaria (expansao do Painel do Dia)
// Fonte principal: GET /mc/consultas com filtro de data/horario no front-end

const API_BASES = window.location.origin.includes('localhost')
    ? ['http://localhost:8080', window.location.origin, '']
    : [''];

let consultasPainel = [];
let consultasFiltradas = [];
let medicosFiltro = [];
let medicoSelecionadoNome = '';

let usuarioLogado = {
    id: null,
    perfil: null,
    especificacao: null
};

let filtroTerapia = 'ABA'; // ABA | Convencional

function obterDuracaoPorModo() {
    return filtroTerapia === 'Convencional' ? 30 : 50;
}

function obterNomeFiltroApiMedico(nomeCompleto) {
    const nome = String(nomeCompleto || '').trim();
    if (!nome) return '';
    return nome.split(/\s+/)[0] || '';
}

document.addEventListener('DOMContentLoaded', async () => {
    carregarDadosUsuario();
    exibirDataAtual();
    configurarViewToggle();
    await carregarMedicos();
    await carregarConsultas();

    setInterval(() => {
        carregarConsultas();
    }, 300000);
});

async function apiFetch(path, options = {}) {
    let ultimoErro = null;

    for (const base of API_BASES) {
        const url = `${base}${path}`;
        try {
            const resp = await fetch(url, options);
            if (resp.status !== 404) return resp;
        } catch (erro) {
            ultimoErro = erro;
        }
    }

    if (ultimoErro) throw ultimoErro;
    throw new Error('Nao foi possivel conectar em nenhuma base da API.');
}

function formatarDataIsoLocal(data) {
    const d = new Date(data);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function normalizarTexto(v) {
    return String(v || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function carregarDadosUsuario() {
    usuarioLogado.id = parseInt(sessionStorage.getItem('ID_MEDICO'), 10) || null;
    const nome = (sessionStorage.getItem('NOME_MEDICO') || '').trim();
    const sobrenome = (sessionStorage.getItem('SOBRENOME_MEDICO') || '').trim();
    const nomeCompleto = `${nome} ${sobrenome}`.trim();
    const nivelPermissao = sessionStorage.getItem('PERMISSIONAMENTO_MEDICO') || '';
    const especificacao = sessionStorage.getItem('ESPECIFICACAO_MEDICA') || '';

    const nivelNorm = normalizarTexto(nivelPermissao);

    if (nivelNorm.includes('admin')) {
        usuarioLogado.perfil = 'admin';
    } else if (nivelNorm.includes('supervi')) {
        usuarioLogado.perfil = 'supervisor';
        usuarioLogado.especificacao = especificacao;
    } else {
        usuarioLogado.perfil = 'medico';
    }

    if (usuarioLogado.perfil === 'medico' && nomeCompleto) {
        medicoSelecionadoNome = nomeCompleto;
    }
}

function statusNomePorId(statusId) {
    const mapa = {
        1: 'Agendada',
        2: 'Confirmada',
        3: 'Atendida',
        4: 'Cancelada',
        5: 'Faltou'
    };
    return mapa[Number(statusId)] || '';
}

function obterNomeProfissional(linha) {
    if (linha?.medico && linha?.medicoSobrenome) {
        return `${linha.medico} ${linha.medicoSobrenome}`.trim();
    }
    if (typeof linha?.medico === 'string') return linha.medico.trim();
    if (linha?.medico?.nome) {
        return `${linha.medico.nome} ${linha?.medico?.sobrenome || ''}`.trim();
    }
    return String(linha?.profissional || '').trim();
}

function obterNomePaciente(linha) {
    if (linha?.paciente && linha?.pacienteSobrenome) {
        return `${linha.paciente} ${linha.pacienteSobrenome}`.trim();
    }
    if (typeof linha?.paciente === 'string') return linha.paciente.trim();
    if (linha?.paciente?.nome) {
        return `${linha.paciente.nome} ${linha?.paciente?.sobrenome || ''}`.trim();
    }
    return '';
}

function obterEspecialidade(linha) {
    return String(
        linha?.especialidade ||
        linha?.medico?.especificacaoMedica?.area ||
        linha?.especificacaoMedica?.area ||
        ''
    ).trim();
}

function exibirDataAtual() {
    const hoje = new Date();
    const opcoes = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dataFormatada = hoje.toLocaleDateString('pt-BR', opcoes);
    const el = document.getElementById('dataAtual');
    if (el) {
        el.textContent = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
    }
}

async function carregarMedicos() {
    try {
        const resposta = await apiFetch('/mc/medicos');
        if (!resposta.ok) throw new Error('Erro ao carregar medicos');

        const todosMedicos = await resposta.json();

        if (usuarioLogado.perfil === 'supervisor') {
            medicosFiltro = todosMedicos.filter((medico) =>
                normalizarTexto(medico?.especificacaoMedica?.area) === normalizarTexto(usuarioLogado.especificacao)
            );
        } else if (usuarioLogado.perfil === 'medico') {
            medicosFiltro = todosMedicos.filter((medico) => medico?.id === usuarioLogado.id);
        } else {
            medicosFiltro = todosMedicos;
        }

        const select = document.getElementById('filtroMedico');
        if (!select) return;

        if (usuarioLogado.perfil === 'medico') {
            const filterGroup = select.closest('.filter-group');
            if (filterGroup) filterGroup.style.display = 'none';

            const filterButtons = document.querySelectorAll('.filter-button');
            if (filterButtons.length > 1) {
                // Mantem apenas o botao de atualizar e imprimir visiveis.
                const botaoFiltrar = Array.from(filterButtons).find((btn) => btn.textContent.includes('Filtrar'));
                if (botaoFiltrar) botaoFiltrar.style.display = 'none';
            }
        } else {
            select.innerHTML = '<option value="">Todos os Profissionais</option>';
            medicosFiltro.forEach((medico) => {
                const option = document.createElement('option');
                const nome = `${medico.nome || ''} ${medico.sobrenome || ''}`.trim();
                option.value = nome;
                option.textContent = `${nome}${medico.especificacaoMedica?.area ? ` - ${medico.especificacaoMedica.area}` : ''}`.trim();
                select.appendChild(option);
            });
        }
    } catch (erro) {
        console.error('Erro ao carregar medicos:', erro);
    }
}

async function carregarConsultas() {
    try {
        const dataHojeIso = formatarDataIsoLocal(new Date());
        const query = new URLSearchParams();
        query.set('data', dataHojeIso);
        const medicoFiltroApi = obterNomeFiltroApiMedico(medicoSelecionadoNome);
        if (medicoFiltroApi) query.set('medico', medicoFiltroApi);
        query.set('duracao', String(obterDuracaoPorModo()));

        const caminhos = [
            `/mc/consultas/painel-dia?${query.toString()}`,
            `/consultas/painel-dia?${query.toString()}`,
            `/mc/painel-dia?${query.toString()}`,
            `/painel-dia?${query.toString()}`
        ];

        let linhas = [];
        let respondeu = false;

        for (const path of caminhos) {
            console.info('[AgendaDiaria] GET', path, 'bases:', API_BASES);
            try {
                const resposta = await apiFetch(path);
                if (!resposta.ok) continue;
                const data = await resposta.json();
                if (!Array.isArray(data)) continue;
                linhas = data;
                respondeu = true;
                break;
            } catch (erro) {
                console.warn('[AgendaDiaria] falha ao buscar painel do dia:', path, erro);
            }
        }

        if (!respondeu) throw new Error('Erro ao carregar consultas do dia.');

        consultasPainel = normalizarLinhasPainel(linhas, dataHojeIso);

        consultasFiltradas = aplicarFiltroTerapia(aplicarFiltroProfissional([...consultasPainel]));
        exibirConsultas();
        atualizarResumo();
    } catch (erro) {
        console.error('Erro ao carregar consultas do painel do dia:', erro);
        exibirMensagemErro();
    }
}

function normalizarLinhasPainel(linhas, dataIso) {
    if (!Array.isArray(linhas)) return [];

    return linhas.map((linha, idx) => {
        const dataHoraOriginal = linha?.datahoraConsulta ? new Date(linha.datahoraConsulta) : null;
        const horario = extrairHoraMinuto(linha?.datahoraConsulta || linha?.horario) || '00:00';
        const datahoraConsulta = dataHoraOriginal && !isNaN(dataHoraOriginal.getTime())
            ? linha.datahoraConsulta
            : `${dataIso}T${horario}:00`;
        return {
            id: linha?.consultaId ?? linha?.id ?? linha?.consulta?.id ?? null,
            _idx: idx,
            datahoraConsulta: datahoraConsulta,
            horario: horario,
            pacienteNome: obterNomePaciente(linha),
            profissionalNome: obterNomeProfissional(linha),
            especialidadeNome: obterEspecialidade(linha),
            convenioNome: linha?.convenio?.nome ?? linha?.convenioNome ?? linha?.convenio ?? null,
            salaNome: linha?.sala?.nome ?? linha?.salaNome ?? linha?.sala ?? null,
            idade: linha?.idade ?? linha?.painelIdade ?? null,
            statusId: linha?.statusId ?? linha?.statusConsulta?.idStatus ?? linha?.statusConsulta?.id ?? linha?.status?.id ?? null,
            statusNome: String(
                (linha?.statusConsulta?.nomeStatus ?? (typeof linha?.status === 'string' ? linha.status : '')) ||
                statusNomePorId(linha?.statusId ?? linha?.statusConsulta?.idStatus ?? linha?.statusConsulta?.id ?? linha?.status?.id) ||
                'Agendada'
            ).trim(),
            duracaoConsulta: linha?.duracaoConsulta ?? linha?.duracao ?? null,
            tipoTerapia: linha?.tipoTerapia ?? null
        };
    }).filter((consulta) => {
        const dt = consulta?.datahoraConsulta ? new Date(consulta.datahoraConsulta) : null;
        if (dt && !isNaN(dt.getTime())) {
            return formatarDataIsoLocal(dt) === dataIso;
        }
        return true;
    }).sort((a, b) => new Date(a.datahoraConsulta) - new Date(b.datahoraConsulta));
}

function aplicarFiltroProfissional(lista) {
    if (!medicoSelecionadoNome) return lista;
    const alvo = normalizarTexto(medicoSelecionadoNome);
    return lista.filter((c) => normalizarTexto(c?.profissionalNome) === alvo);
}

function extrairHoraMinuto(valor) {
    if (!valor) return '';
    if (typeof valor === 'string') {
        const m = valor.match(/(\d{2}):(\d{2})/);
        return m ? `${m[1]}:${m[2]}` : '';
    }
    const d = new Date(valor);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
    const tipoDaApi = normalizarTexto(consulta?.tipoTerapia);
    if (tipoDaApi === 'aba') return 'ABA';
    if (tipoDaApi.includes('convenc')) return 'Convencional';

    const mins = duracaoEmMinutos(consulta);
    if (mins === 50 || mins === 60) return 'ABA';
    if (mins === 30) return 'Convencional';

    // Sem informacao de tipo/duracao: nao forca exclusao no filtro.
    return null;
}

function aplicarFiltroTerapia(lista) {
    return lista.filter((c) => {
        const tipo = tipoTerapia(c);
        if (!tipo) return filtroTerapia === 'ABA';
        return tipo === filtroTerapia;
    });
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

    if (btnAba) {
        btnAba.addEventListener('click', async () => {
            filtroTerapia = 'ABA';
            atualizarUI();
            await carregarConsultas();
        });
    }

    if (btnConv) {
        btnConv.addEventListener('click', async () => {
            filtroTerapia = 'Convencional';
            atualizarUI();
            await carregarConsultas();
        });
    }

    atualizarUI();
}

async function aplicarFiltroMedico() {
    const select = document.getElementById('filtroMedico');
    medicoSelecionadoNome = select?.value || '';
    await carregarConsultas();
    fecharModalFiltro();
}

async function limparFiltros() {
    const select = document.getElementById('filtroMedico');
    if (select) select.value = '';
    medicoSelecionadoNome = '';
    await carregarConsultas();
    fecharModalFiltro();
}

function abrirModalFiltro() {
    const modal = document.getElementById('modalFiltro');
    if (modal) modal.style.display = 'flex';
}

function fecharModalFiltro() {
    const modal = document.getElementById('modalFiltro');
    if (modal) modal.style.display = 'none';
}

function exibirConsultas() {
    const timeline = document.getElementById('agendaTimeline');
    const empty = document.getElementById('agendaEmpty');
    if (!timeline || !empty) return;

    const lista = aplicarFiltroTerapia(consultasFiltradas);

    if (!lista.length) {
        timeline.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    timeline.style.display = 'flex';
    empty.style.display = 'none';

    timeline.innerHTML = lista.map((consulta) => {
        const dataHora = new Date(consulta.datahoraConsulta);
        const hora = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const status = consulta.statusNome || 'Agendada';
        const statusClass = normalizarTexto(status).replace(/\s+/g, '');

        const paciente = consulta.pacienteNome || 'Nao informado';
        const medico = consulta.profissionalNome || 'Nao informado';
        const convenio = consulta.convenioNome || 'Nao informado';
        const sala = consulta.salaNome || 'Nao informada';
        const idade = consulta.idade !== null && consulta.idade !== undefined ? `${consulta.idade} anos` : 'Nao informada';

        return `
            <div class="task ${statusClass}">
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
                        <i class="fas fa-id-card"></i>
                        <span><strong>Idade:</strong> ${idade}</span>
                    </div>
                    <div class="task-detail">
                        <i class="fas fa-hospital"></i>
                        <span><strong>Convenio:</strong> ${convenio}</span>
                    </div>
                    <div class="task-detail">
                        <i class="fas fa-door-open"></i>
                        <span><strong>Sala:</strong> ${sala}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function atualizarResumo() {
    const lista = aplicarFiltroTerapia(consultasFiltradas);

    const total = lista.length;
    const agendadas = lista.filter((c) => normalizarTexto(c.statusNome) === 'agendada').length;
    const realizadas = lista.filter((c) => {
        const s = normalizarTexto(c.statusNome);
        return s === 'realizada' || s === 'concluida' || s === 'atendida';
    }).length;
    const canceladas = lista.filter((c) => normalizarTexto(c.statusNome) === 'cancelada').length;

    const elTotal = document.getElementById('totalConsultas');
    const elAg = document.getElementById('consultasAgendadas');
    const elReal = document.getElementById('consultasRealizadas');
    const elCanc = document.getElementById('consultasCanceladas');

    if (elTotal) elTotal.textContent = String(total);
    if (elAg) elAg.textContent = String(agendadas);
    if (elReal) elReal.textContent = String(realizadas);
    if (elCanc) elCanc.textContent = String(canceladas);
}

function fecharModal() {
    const modal = document.getElementById('modalDetalhes');
    if (modal) modal.style.display = 'none';
}

function atualizarAgenda() {
    const btnRefresh = document.querySelector('.filter-button i');
    if (btnRefresh) btnRefresh.classList.add('fa-spin');

    carregarConsultas().finally(() => {
        setTimeout(() => {
            if (btnRefresh) btnRefresh.classList.remove('fa-spin');
        }, 500);
    });
}

function imprimirAgenda() {
    const timeline = document.getElementById('agendaTimeline');
    const vazio = document.getElementById('agendaEmpty');
    if (!timeline) return;

    const temConsultas = timeline.innerHTML.trim().length > 0 && (!vazio || vazio.style.display !== 'block');

    const dataCabecalho = (document.getElementById('dataAtual')?.textContent || '').trim();
    const modo = typeof filtroTerapia === 'string' ? filtroTerapia : 'ABA';

    let contexto = '';
    const sel = document.getElementById('filtroMedico');
    if (usuarioLogado?.perfil === 'admin') {
        const textoSel = sel && sel.options && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].text : 'Todos os Profissionais';
        contexto = textoSel || 'Todos os Profissionais';
    } else if (usuarioLogado?.perfil === 'supervisor') {
        contexto = usuarioLogado?.especificacao ? `Area: ${usuarioLogado.especificacao}` : 'Minha area';
    } else {
        contexto = 'Meu painel';
    }

    const css = `
        body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        h2 { font-size: 14px; margin: 0 0 16px; color: #444; font-weight: 600; }
        .timeline { display: grid; grid-template-columns: 1fr; gap: 10px; }
        .task { border: 1px solid #ccc; border-radius: 8px; padding: 10px; break-inside: avoid; }
        .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .task-time { font-weight: 700; }
        .task-status { font-weight: 700; }
        .task-info { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
        .task-detail { display: flex; gap: 6px; align-items: center; }
        i { display: none; }
        @page { margin: 12mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `;

    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write('<html><head><title>Agenda Diaria</title>');
    w.document.write(`<style>${css}</style>`);
    w.document.write('</head><body>');

    const titulo = dataCabecalho || new Date().toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    w.document.write('<h1>Agenda Diaria</h1>');
    w.document.write(`<h2>${titulo} • Modo: ${modo} • ${contexto}</h2>`);

    if (temConsultas) {
        w.document.write(`<div class="timeline">${timeline.innerHTML}</div>`);
    } else {
        w.document.write('<p>Sem consultas para imprimir.</p>');
    }

    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    w.print();
    w.close();
}

function exibirMensagemErro() {
    const timeline = document.getElementById('agendaTimeline');
    const empty = document.getElementById('agendaEmpty');
    if (!timeline || !empty) return;

    timeline.style.display = 'none';
    empty.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>Erro ao carregar consultas do painel do dia. Tente novamente.</p>
    `;
    empty.style.display = 'block';
}

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
