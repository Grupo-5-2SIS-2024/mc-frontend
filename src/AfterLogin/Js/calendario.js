// Small shared download utilities
// Ensure a single shared API_BASE on window to avoid redeclaration errors across scripts
if (!window.API_BASE) {
    window.API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : '';
}
const API_BASE_LOCAL = window.API_BASE;

async function BaixarExcelGeral() {
    try {
        const resposta = await fetch(`${API_BASE_LOCAL}/mc/consultas/export/csv`, {
            method: 'GET',
            headers: { Accept: 'text/csv' }
        });

        if (!resposta.ok) throw new Error(`Erro ao baixar o arquivo: ${resposta.statusText}`);

        const blob = await resposta.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'consultas.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao baixar o arquivo:', error);
    }
}

// Exporta a semana atual para CSV (abre para Excel)
function exportarSemanaCSV() {
    try {
        const start = new Date(dataInicioAtual);
        const rows = [];
        rows.push(['Data', 'Hora', 'Paciente', 'CPF', 'Profissional', 'Área', 'Status', 'Descrição', 'Duração']);

        for (let i = 0; i < 5; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const tarefas = obterTarefasParaData(d);
            tarefas.forEach(t => {
                const dataHora = new Date(t.datahoraConsulta);
                const dataStr = dataHora.toLocaleDateString('pt-BR');
                const horaStr = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const paciente = t.paciente ? `${t.paciente.nome || ''} ${t.paciente.sobrenome || ''}`.trim() : '';
                const cpf = t.paciente ? (t.paciente.cpf || '') : '';
                const medico = t.medico ? `${t.medico.nome || ''} ${t.medico.sobrenome || ''}`.trim() : '';
                const area = t.medico?.especificacaoMedica?.area || t.especificacaoMedica?.area || '';
                const status = t.statusConsulta?.nomeStatus || '';
                const descricao = t.descricao ? String(t.descricao).replace(/\r?\n/g, ' ') : '';
                let duracao = '';
                const rawDur = t.duracaoConsulta ?? t.duracao ?? null;
                if (rawDur) {
                    if (typeof rawDur === 'number') duracao = `${rawDur} min`;
                    else duracao = String(rawDur);
                }
                rows.push([dataStr, horaStr, paciente, cpf, medico, area, status, descricao, duracao]);
            });
        }

        const csvContent = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const stamp = formatarData(new Date(dataInicioAtual)).replace(/-/g, '');
        a.download = `agenda_semana_${stamp}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Erro ao exportar semana CSV:', err);
    }
}

// Abre uma nova janela com a tabela da semana atual para imprimir/salvar como PDF
function exportarSemanaPDF() {
    try {
        const start = new Date(dataInicioAtual);
        let html = `<html><head><title>Agenda Semanal</title><style>body{font-family:Arial,Helvetica,sans-serif}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#f4f4f4}</style></head><body>`;
        html += `<h2>Agenda Semanal: ${document.getElementById('dias').innerText}</h2>`;
        html += `<table><thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Profissional</th><th>Área</th><th>Status</th><th>Descrição</th><th>Duração</th></tr></thead><tbody>`;

        for (let i = 0; i < 5; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const tarefas = obterTarefasParaData(d);
            if (tarefas.length === 0) {
                html += `<tr><td>${d.toLocaleDateString('pt-BR')}</td><td colspan="7">Sem tarefas</td></tr>`;
            } else {
                tarefas.forEach(t => {
                    const dataHora = new Date(t.datahoraConsulta);
                    const dataStr = dataHora.toLocaleDateString('pt-BR');
                    const horaStr = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const paciente = t.paciente ? `${t.paciente.nome || ''} ${t.paciente.sobrenome || ''}`.trim() : '';
                    const medico = t.medico ? `${t.medico.nome || ''} ${t.medico.sobrenome || ''}`.trim() : '';
                    const area = t.medico?.especificacaoMedica?.area || t.especificacaoMedica?.area || '';
                    const status = t.statusConsulta?.nomeStatus || '';
                    const descricao = t.descricao ? String(t.descricao).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
                    const rawDur = t.duracaoConsulta ?? t.duracao ?? null;
                    let duracao = '';
                    if (rawDur) duracao = typeof rawDur === 'number' ? `${rawDur} min` : String(rawDur);
                    html += `<tr><td>${dataStr}</td><td>${horaStr}</td><td>${paciente}</td><td>${medico}</td><td>${area}</td><td>${status}</td><td>${descricao}</td><td>${duracao}</td></tr>`;
                });
            }
        }

        html += `</tbody></table></body></html>`;
        const w = window.open('', '_blank');
        if (!w) {
            alert('Permita popups para gerar o PDF.');
            return;
        }
        w.document.write(html);
        w.document.close();
        // Pequeno atraso para garantir que o conteúdo carregue antes do print
        setTimeout(() => { w.print(); }, 500);
    } catch (err) {
        console.error('Erro ao gerar PDF da semana:', err);
    }
}


//Agendamento - calendario

let dataInicioAtual = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let consultasOriginais = []; // Para armazenar todas as consultas
let modoCalendario = 'ABA'; // Modo padrão: ABA ou CONVENCIONAL
let procedimentosList = []; // Lista de procedimentos/especificações
// Dataset e filtros persistentes
let bancoDeDadosFiltrado = [];
let datasetAposPermissao = [];
let consultaRequestToken = 0;
let filtrosAtivos = false;
let currentFilters = {
    medicoId: null,
    pacienteId: null,
    statusId: null,
    areaConsultaId: null,
    idadePaciente: null,
    generoPaciente: '',
    dataInicio: '',
    dataFim: ''
};

function filtrarComEstado(base, f) {
    return base.filter(consulta => {
        const filtroMedico = f.medicoId == null || (consulta.medico && Number(consulta.medico.id) === f.medicoId);
        const filtroPaciente = f.pacienteId == null || (consulta.paciente && Number(consulta.paciente.id) === f.pacienteId);
        const filtroStatus = f.statusId == null || (consulta.statusConsulta && Number(consulta.statusConsulta.id) === f.statusId);
        const filtroAreaConsulta = f.areaConsultaId == null || (consulta.especificacaoMedica && Number(consulta.especificacaoMedica.id) === f.areaConsultaId);
        const filtroIdade = f.idadePaciente == null || (consulta.paciente && calcularIdade(consulta.paciente.dtNasc) === f.idadePaciente);
        const filtroGenero = !f.generoPaciente || (consulta.paciente && (consulta.paciente.genero || '') === f.generoPaciente);
        const dataConsulta = new Date(consulta.datahoraConsulta);
        const filtroDataInicio = !f.dataInicio || new Date(f.dataInicio) <= dataConsulta;
        const filtroDataFim = !f.dataFim || new Date(f.dataFim) >= dataConsulta;
        return filtroMedico && filtroPaciente && filtroStatus && filtroAreaConsulta && filtroIdade && filtroGenero && filtroDataInicio && filtroDataFim;
    });
}

function aplicarFiltrosPersistentes() {
    if (!Array.isArray(datasetAposPermissao)) datasetAposPermissao = consultasOriginais || [];
    bancoDeDadosFiltrado = filtrosAtivos ? filtrarComEstado(datasetAposPermissao, currentFilters) : datasetAposPermissao;
}

function setCalendarioLoading(isLoading) {
    const colunas = document.getElementById('colunasTarefas');
    if (!colunas) return;
    colunas.classList.toggle('is-loading', !!isLoading);
}

async function buscarMedicos() {
    try {

        const resposta = await fetch(`${API_BASE_LOCAL}/mc/medicos`);
        if (!resposta.ok) {
            throw new Error(`HTTP error! Status: ${resposta.status}`);
        }
        const medicos = await resposta.json();

        const filtroMedico = document.getElementById('filtroMedico');
        filtroMedico.innerHTML = '<option value="">Todos os Profissionais</option>';
        medicos.forEach(medico => {
            const option = document.createElement('option');
            option.value = medico.id;
            option.textContent = medico.nome + ' ' + medico.sobrenome;
            filtroMedico.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao buscar Profissionais:', error);
    }
}

async function buscarPacientes() {
    try {

        const resposta = await fetch(`${API_BASE_LOCAL}/mc/pacientes`);
        if (!resposta.ok) {
            throw new Error(`HTTP error! Status: ${resposta.status}`);
        }
        // Some endpoints may return empty body (204) — handle gracefully
        let pacientes = [];
        try {
            const text = await resposta.text();
            pacientes = text ? JSON.parse(text) : [];
        } catch (err) {
            console.warn('Resposta de pacientes não pôde ser parseada como JSON, usando array vazio.', err);
            pacientes = [];
        }

        const filtroPaciente = document.getElementById('filtroPaciente');
        filtroPaciente.innerHTML = '<option value="">Todos os Pacientes</option>';
        pacientes.forEach(paciente => {
            const option = document.createElement('option');
            option.value = paciente.id;
            option.textContent = (paciente.nome || '') + ' ' + (paciente.sobrenome || '');
            filtroPaciente.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
    }
}

async function buscarEspecificacoesMedicas() {
    try {
        const resposta = await fetch(`${API_BASE_LOCAL}/mc/especificacoes`);
        if (!resposta.ok) {
            throw new Error(`HTTP error! Status: ${resposta.status}`);
        }
        const especificacoes = await resposta.json();

        // Armazena lista global para referência
        procedimentosList = especificacoes;

        const filtroAreaConsulta = document.getElementById('filtroAreaConsulta');
        filtroAreaConsulta.innerHTML = '<option value="">Todas as Áreas</option>';
        especificacoes.forEach(especificacao => {
            const option = document.createElement('option');
            option.value = especificacao.id;
            option.textContent = especificacao.area;
            filtroAreaConsulta.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao buscar áreas de consulta:', error);
    }
}

async function buscarStatusConsulta() {
    try {
        const resposta = await fetch(`${API_BASE_LOCAL}/mc/statusConsultas`);
        if (!resposta.ok) {
            throw new Error(`HTTP error! Status: ${resposta.status}`);
        }
        const statusConsultas = await resposta.json();

        const filtroStatus = document.getElementById('filtroStatus');
        filtroStatus.innerHTML = '<option value="">Todos os Status</option>';
        statusConsultas.forEach(status => {
            const option = document.createElement('option');
            option.value = status.id;
            option.textContent = status.nomeStatus;
            filtroStatus.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao buscar status de consulta:', error);
    }
}

async function buscarConsultas(options = {}) {
    const { showLoading = false } = options;
    const reqToken = ++consultaRequestToken;
    try {
        const inicioSemana = obterInicioDaSemana(dataInicioAtual || new Date());
        const inicioParam = formatarData(inicioSemana);
        if (showLoading) setCalendarioLoading(true);

        const resposta = await fetch(`${API_BASE_LOCAL}/mc/consultas/semana?inicio=${encodeURIComponent(inicioParam)}`);
        if (!resposta.ok) {
            throw new Error(`HTTP error! Status: ${resposta.status}`);
        }

        // Se outra requisição mais nova já começou, ignora esta resposta
        if (reqToken !== consultaRequestToken) return;

        consultasOriginais = await resposta.json();

        // Apply permission-based filtering:
        // - Médico: show only consultas where medico.id == ID_MEDICO
        // - Supervisor: show consultas that belong to the supervisor's area (ESPECIFICACAO_MEDICA)
        // - Others (Admin): show all
        try {
            // normalize function: remove diacritics and lowercase
            const normalize = (s) => {
                if (!s) return '';
                try { return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim(); }
                catch (e) { return s.replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
            };

            const perm = normalize(sessionStorage.getItem('PERMISSIONAMENTO_MEDICO') || '');
            if (perm.includes('medic')) {
                const idMed = Number(sessionStorage.getItem('ID_MEDICO')) || null;
                if (idMed) {
                    bancoDeDadosFiltrado = consultasOriginais.filter(c => c && c.medico && Number(c.medico.id) === idMed);
                } else {
                    bancoDeDadosFiltrado = []; // no medico id, show none
                }
            } else if (perm.includes('supervi') || perm.includes('supervisor')) {
                const espec = normalize(sessionStorage.getItem('ESPECIFICACAO_MEDICA') || '');
                if (espec) {
                    bancoDeDadosFiltrado = consultasOriginais.filter(c => {
                        const area = normalize(c?.medico?.especificacaoMedica?.area || c?.especificacaoMedica?.area || '');
                        return area.includes(espec);
                    });
                } else {
                    bancoDeDadosFiltrado = consultasOriginais; // no area known, fallback to all
                }
            } else {
                bancoDeDadosFiltrado = consultasOriginais; // Admin or other roles
            }
        } catch (err) {
            console.warn('Erro ao aplicar filtro por permissão, mostrando todas as consultas', err);
            bancoDeDadosFiltrado = consultasOriginais;
        }
        // Definir dataset base pós-permissão e re-aplicar filtros persistentes
        datasetAposPermissao = Array.isArray(bancoDeDadosFiltrado) ? bancoDeDadosFiltrado : (consultasOriginais || []);
        aplicarFiltrosPersistentes();

        atualizarDisplayData(dataInicioAtual);
        if (showLoading) setCalendarioLoading(false);
    } catch (error) {
        if (reqToken !== consultaRequestToken) return;
        console.error('Erro ao buscar consultas:', error);
        if (showLoading) setCalendarioLoading(false);
    }
}

function obterInicioDaSemana(date) {
    // Semana começa na segunda-feira (1). Retorna a segunda da semana da data.
    const day = date.getDay(); // 0=Dom,1=Seg,...6=Sab
    const diff = (day + 6) % 7; // dias a voltar até segunda
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - diff);
    startDate.setHours(0, 0, 0, 0);
    return startDate;
}

function formatarData(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calcularIdade(dataNasc) {
    const hoje = new Date();
    const nascimento = new Date(dataNasc);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
    }
    return idade;
}

// Função auxiliar para determinar se procedimento é Terapia Convencional
function isTerapiaConvencional(especificacaoArea) {
    if (!especificacaoArea) return false;
    const area = (especificacaoArea || '').toLowerCase().trim();
    const keywordsTerapiaConvencional = [
        'convencional',
        'terapia convencional',
        'fonoaudiologia',
        'fono',
        'psicologia',
        'psico',
        'terapia ocupacional',
        'ocupacional',
        't.o',
        'to ',
        'psicopedagogia',
        'psicopedagogo'
    ];
    return keywordsTerapiaConvencional.some(keyword => area.includes(keyword));
}

// Obtém a duração em minutos a partir de diferentes formatos ("HH:MM:SS", "HH:MM", número em minutos)
function getDuracaoMinutos(entry) {
    const raw = entry?.duracaoConsulta ?? entry?.duracao;
    if (raw == null) return null;
    if (typeof raw === 'number' && isFinite(raw)) return raw; // já em minutos
    if (typeof raw === 'string') {
        const s = raw.trim();
        // HH:MM:SS
        let m = s.match(/^([0-9]{1,2}):([0-9]{2}):([0-9]{2})$/);
        if (m) {
            const hh = Number(m[1]);
            const mm = Number(m[2]);
            return (hh * 60) + mm;
        }
        // HH:MM
        m = s.match(/^([0-9]{1,2}):([0-9]{2})$/);
        if (m) {
            const hh = Number(m[1]);
            const mm = Number(m[2]);
            return (hh * 60) + mm;
        }
        // número como string
        const n = Number(s);
        if (!Number.isNaN(n) && isFinite(n)) return n;
    }
    return null; // formato desconhecido
}

// Verifica se a consulta corresponde ao modo selecionado considerando duração (50/30) e área
function matchesModo(entry, modo) {
    const area = entry?.especificacaoMedica?.area || entry?.medico?.especificacaoMedica?.area || '';
    const ehConvencional = isTerapiaConvencional(area);
    const minutos = getDuracaoMinutos(entry);

    if (modo === 'ABA') {
        if (minutos != null) {
            // ABA aceita 50min e 60min, independente da área
            return minutos === 50 || minutos === 60;
        }
        // Fallback: sem duração, usar apenas a área não convencional
        return !ehConvencional;
    } else if (modo === 'CONVENCIONAL') {
        if (minutos != null) {
            // Convencional é 30min
            return minutos === 30;
        }
        // Fallback: sem duração, usar apenas a área convencional
        return ehConvencional;
    }
    return true; // caso algum outro modo no futuro
}

// Helpers de recorrência
function timeHHMMFromISO(iso) {
    try {
        const d = new Date(iso);
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    } catch { return ''; }
}

function computeSeriesKeyFromConsulta(c) {
    const medicoId = c?.medico?.id ?? '';
    const pacienteId = c?.paciente?.id ?? '';
    const especId = c?.especificacaoMedica?.id ?? '';
    const salaId = c?.sala?.id ?? '';
    const durMin = getDuracaoMinutos(c);
    const hhmm = timeHHMMFromISO(c?.datahoraConsulta);
    return `${medicoId}|${pacienteId}|${especId}|${salaId}|${durMin ?? ''}|${hhmm}`;
}

// Obtém as consultas para uma data considerando o modo de visualização
function obterTarefasParaData(date) {
    const formattedDate = formatarData(date);
    let entries = (bancoDeDadosFiltrado || []).filter(entry => (entry?.datahoraConsulta || '').startsWith(formattedDate));
    entries = entries.filter(entry => matchesModo(entry, modoCalendario));
    return entries;
}

function atualizarDisplayData(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 4); // segunda a sexta

    const options = { day: '2-digit', month: 'long' };
    const startStr = `${startDate.toLocaleDateString('pt-BR', options).replace(/^\d{2}/, match => match.padStart(2, '0'))} ${startDate.getFullYear()}`;
    const endStr = `${endDate.toLocaleDateString('pt-BR', options).replace(/^\d{2}/, match => match.padStart(2, '0'))} ${endDate.getFullYear()}`;

    document.getElementById('dias').innerText = `${startStr} - ${endStr}`;
    atualizarDiasDaSemana(startDate);
}

function atualizarDiasDaSemana(startDate) {
    const diasSemanaElement = document.getElementById('diasSemana');
    diasSemanaElement.innerHTML = '';

    for (let i = 0; i < 5; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        const options = { weekday: 'short', day: '2-digit' };
        const dayStr = currentDate.toLocaleDateString('pt-BR', options);

        const dayElement = document.createElement('div');
        dayElement.className = 'day';
        dayElement.innerText = dayStr;

        diasSemanaElement.appendChild(dayElement);
    }

    atualizarColunasDeTarefas(startDate);
}

function atualizarColunasDeTarefas(startDate) {
    const colunasTarefasElement = document.getElementById('colunasTarefas');
    colunasTarefasElement.innerHTML = '';

    for (let i = 0; i < 5; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);

        // Obter todas as consultas para o dia específico
        const tasks = obterTarefasParaData(currentDate);

        // Ordenar as consultas por data e hora (mais cedo para mais tarde)
        tasks.sort((a, b) => new Date(a.datahoraConsulta) - new Date(b.datahoraConsulta));

        const columnElement = document.createElement('div');
        columnElement.className = 'column';

        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task';

            const dt = task && task.datahoraConsulta ? new Date(task.datahoraConsulta) : null;
            const horaStr = dt ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
            const pacienteNome = task?.paciente ? `${task.paciente.nome || ''} ${task.paciente.sobrenome || ''}`.trim() : 'Paciente —';
            const medicoNome = task?.medico ? `${task.medico.nome || ''} ${task.medico.sobrenome || ''}`.trim() : 'Profissional —';
            const statusNome = task?.statusConsulta?.nomeStatus || '—';
            const descricao = task?.descricao || '';
            const salaNome = getSalaNome(task);

            const statusClass = 'status-' + String(statusNome)
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-');

            taskElement.innerHTML = `
    <div class="task-title" title="${escapeHTML(descricao)}">${escapeHTML(descricao)}</div>
    <div class="task-info">
        <div class="info-line"><i class="fa-regular fa-clock"></i><span>${escapeHTML(horaStr)}</span></div>
        <div class="info-line"><i class="fa-solid fa-user"></i><span>${escapeHTML(pacienteNome)}</span></div>
        <div class="info-line"><i class="fa-solid fa-user-md"></i><span>${escapeHTML(medicoNome)}</span></div>
        <div class="info-line"><i class="fa-solid fa-door-open"></i><span>${escapeHTML(salaNome)}</span></div>
        <div class="info-line">
            <span class="status-badge ${escapeHTML(statusClass)}">${escapeHTML(statusNome)}</span>
        </div>
    </div>
`;

            taskElement.onclick = () => abrirDetalhesTarefa(task);
            columnElement.appendChild(taskElement);
        });

        // Se não houver tarefas para o dia, adicione um elemento indicando "Sem tarefas"
        if (tasks.length === 0) {
            const noTaskElement = document.createElement('div');
            noTaskElement.className = 'task inactive';
            noTaskElement.innerText = 'Sem tarefas';
            columnElement.appendChild(noTaskElement);
        }

        colunasTarefasElement.appendChild(columnElement);
    }
}

async function semanaPassada() {
    dataInicioAtual.setDate(dataInicioAtual.getDate() - 7);
    dataInicioAtual = obterInicioDaSemana(dataInicioAtual);
    await buscarConsultas({ showLoading: true });
    atualizarDisplayData(dataInicioAtual);
}

async function proximaSemana() {
    dataInicioAtual.setDate(dataInicioAtual.getDate() + 7);
    dataInicioAtual = obterInicioDaSemana(dataInicioAtual);
    await buscarConsultas({ showLoading: true });
    atualizarDisplayData(dataInicioAtual);
}

// Inicialização
async function inicializarPagina() {
    dataInicioAtual = obterInicioDaSemana(new Date());
    await buscarMedicos();
    await buscarPacientes();
    await buscarEspecificacoesMedicas();
    await buscarStatusConsulta();
    await buscarConsultas();

    atualizarDisplayData(dataInicioAtual);

    // Atualiza as informações a cada 30 segundos
    setInterval(async () => {
        await buscarConsultas(); // Atualiza as consultas do banco de dados
        atualizarDisplayData(dataInicioAtual); // Atualiza a exibição dos dados na página
    }, 30000); // Intervalo de 30000 milissegundos (30 segundos)
}

inicializarPagina();

function abrirModalFiltro() {
    document.getElementById('modalFiltro').style.display = 'flex';
}

function fecharModalFiltro() {
    document.getElementById('modalFiltro').style.display = 'none';
}

function aplicarFiltros() {
    // Read raw values and convert safely; empty strings should become null so they are ignored in filters
    const medicoRaw = document.getElementById('filtroMedico').value;
    const pacienteRaw = document.getElementById('filtroPaciente').value;
    const statusRaw = document.getElementById('filtroStatus').value;
    const areaRaw = document.getElementById('filtroAreaConsulta').value;
    const idadeRaw = document.getElementById('filtroIdade').value;
    const generoPaciente = document.getElementById('filtroGenero').value;
    const dataInicio = document.getElementById('filtroDataInicio').value;
    const dataFim = document.getElementById('filtroDataFim').value;

    currentFilters = {
        medicoId: medicoRaw ? Number(medicoRaw) : null,
        pacienteId: pacienteRaw ? Number(pacienteRaw) : null,
        statusId: statusRaw ? Number(statusRaw) : null,
        areaConsultaId: areaRaw ? Number(areaRaw) : null,
        idadePaciente: idadeRaw ? Number(idadeRaw) : null,
        generoPaciente,
        dataInicio,
        dataFim
    };
    filtrosAtivos = true;
    aplicarFiltrosPersistentes();

    fecharModalFiltro();
    atualizarDisplayData(dataInicioAtual);
}

function limparFiltros() {
    // Resetar todos os campos de filtro
    document.getElementById('filtroMedico').value = '';
    document.getElementById('filtroPaciente').value = '';
    document.getElementById('filtroStatus').value = '';
    document.getElementById('filtroAreaConsulta').value = '';
    document.getElementById('filtroIdade').value = '';
    document.getElementById('filtroGenero').value = '';
    document.getElementById('filtroDataInicio').value = '';
    document.getElementById('filtroDataFim').value = '';

    // Restaurar dados base e desativar filtros persistentes
    filtrosAtivos = false;
    currentFilters = { medicoId: null, pacienteId: null, statusId: null, areaConsultaId: null, idadePaciente: null, generoPaciente: '', dataInicio: '', dataFim: '' };
    datasetAposPermissao = Array.isArray(datasetAposPermissao) ? datasetAposPermissao : (consultasOriginais || []);
    bancoDeDadosFiltrado = datasetAposPermissao;
    atualizarDisplayData(dataInicioAtual);
}

function abrirDetalhesTarefa(consulta) {
    // Formatando a data e hora para exibição (defensivo)
    const dataHora = consulta && consulta.datahoraConsulta ? new Date(consulta.datahoraConsulta) : null;
    const dataFormatada = dataHora ? dataHora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Desconhecida';
    const horaFormatada = dataHora ? dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

    const pacienteNome = consulta?.paciente ? `${consulta.paciente.nome || ''} ${consulta.paciente.sobrenome || ''}`.trim() : 'Desconhecido';
    const medicoNome = consulta?.medico ? `${consulta.medico.nome || ''} ${consulta.medico.sobrenome || ''}`.trim() : 'Desconhecido';
    const medicoArea = consulta?.medico?.especificacaoMedica?.area || 'Desconhecida';
    const statusNome = consulta?.statusConsulta?.nomeStatus || 'Desconhecido';
    const descricao = consulta?.descricao || 'Sem descrição';
    const salaNome = getSalaNome(consulta);
    // Support different possible duration fields and format them for display
    const rawDur = consulta?.duracaoConsulta ?? consulta?.duracao ?? null;
    let duracao = '—';
    if (rawDur) {
        if (typeof rawDur === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(rawDur)) {
            const [hh, mm] = rawDur.split(':').map(Number);
            if (hh === 0) duracao = `${mm} min`;
            else duracao = `${hh}h ${mm}m`;
        } else if (typeof rawDur === 'string' && /^\d{1,2}:\d{2}$/.test(rawDur)) {
            // sometimes duration may be 'HH:MM'
            const [hh, mm] = rawDur.split(':').map(Number);
            if (hh === 0) duracao = `${mm} min`;
            else duracao = `${hh}h ${mm}m`;
        } else if (typeof rawDur === 'number') {
            // treat numeric value as minutes
            duracao = `${rawDur} min`;
        } else {
            duracao = String(rawDur);
        }
    }

    const detalhesDiv = document.getElementById('detalhesTarefa');
    if (!detalhesDiv) return;

    detalhesDiv.innerHTML = `
    <p><strong>Descrição:</strong> ${escapeHTML(descricao)}</p>
    <p><strong>Data e Hora:</strong> ${escapeHTML(dataFormatada)} às ${escapeHTML(horaFormatada)}</p>
    <p><strong>Paciente:</strong> ${escapeHTML(pacienteNome)}</p>
    <p><strong>Profissional:</strong> ${escapeHTML(medicoNome)} - ${escapeHTML(medicoArea)}</p>
    <p><strong>Sala:</strong> ${escapeHTML(salaNome)}</p>
    <p><strong>Status:</strong> ${escapeHTML(statusNome)}</p>
    <p><strong>Duração:</strong> ${escapeHTML(duracao)}</p>
`;
    const btnEditar = document.getElementById('btnEditarConsulta');
    if (btnEditar) {
        btnEditar.onclick = () => { window.location.href = `editarConsulta.html?id=${consulta.id}`; };
    }
    const btnDeletar = document.getElementById('btnDeletarConsulta');
    if (btnDeletar) {
        btnDeletar.onclick = async () => {
            try {
                // Escolha: excluir somente esta ou recorrentes a partir desta
                const mode = await Swal.fire({
                    title: 'Excluir recorrência?',
                    text: 'Deseja excluir somente esta consulta ou todas as recorrentes deste dia em diante?',
                    icon: 'question',
                    showCancelButton: true,
                    showDenyButton: true,
                    confirmButtonText: 'Somente esta',
                    denyButtonText: 'Recorrentes a partir desta',
                    cancelButtonText: 'Cancelar'
                });
                if (mode.isDismissed) return;

                if (mode.isConfirmed) {
                    const result = await Swal.fire({
                        title: 'Tem certeza?',
                        text: 'Deseja excluir esta consulta?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sim, excluir',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#d33'
                    });
                    if (!result.isConfirmed) return;

                    const resp = await fetch(`${API_BASE_LOCAL}/mc/consultas/${consulta.id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
                    if (!resp.ok) {
                        const msg = await resp.text();
                        await Swal.fire({ icon: 'error', title: 'Erro', text: `Erro ao excluir a consulta: ${msg || resp.status}` });
                        return;
                    }
                    fecharModalDetalhes();
                    await buscarConsultas();
                    atualizarDisplayData(dataInicioAtual);
                    await Swal.fire({ icon: 'success', title: 'Excluída', text: 'Consulta excluída com sucesso.' });
                    return;
                }

                // Excluir recorrentes a partir desta
                const confirmSeries = await Swal.fire({
                    title: 'Tem certeza?',
                    text: 'Isto irá excluir todas as consultas recorrentes deste dia em diante.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sim, excluir todas',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#d33'
                });
                if (!confirmSeries.isConfirmed) return;

                // Show loading without awaiting; proceed with deletions
                Swal.fire({ title: 'Excluindo recorrências...', text: 'Removendo consultas futuras.', allowOutsideClick: false, showConfirmButton: false, didOpen: () => { Swal.showLoading(); } });
                const allRes = await fetch(`${API_BASE_LOCAL}/mc/consultas`);
                const todas = allRes.ok ? await allRes.json() : [];
                const startDate = new Date(consulta.datahoraConsulta);
                const key = computeSeriesKeyFromConsulta(consulta);
                const alvo = (todas || []).filter(c => {
                    const d = new Date(c.datahoraConsulta);
                    return computeSeriesKeyFromConsulta(c) === key && d >= startDate;
                });

                const dels = alvo.map(c2 => fetch(`${API_BASE_LOCAL}/mc/consultas/${c2.id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } }));
                const results = await Promise.allSettled(dels);
                const failed = results.filter(r => r.status === 'rejected' || (r.value && !r.value.ok));
                fecharModalDetalhes();
                await buscarConsultas();
                atualizarDisplayData(dataInicioAtual);
                if (failed.length === 0) {
                    Swal.close();
                    await Swal.fire({ icon: 'success', title: 'Excluídas', text: `Consultas recorrentes excluídas (${alvo.length}).` });
                } else {
                    Swal.close();
                    await Swal.fire({ icon: 'warning', title: 'Exclusão parcial', text: `Algumas não puderam ser excluídas (${failed.length}).` });
                }
            } catch (err) {
                console.error('Falha ao excluir consulta(s)', err);
                Swal.close();
                await Swal.fire({ icon: 'error', title: 'Erro', text: 'Erro ao excluir consulta(s).' });
            }
        };
    }
    const modal = document.getElementById('modalDetalhes');
    if (modal) modal.style.display = 'flex';
}

function fecharModalDetalhes() {
    document.getElementById('modalDetalhes').style.display = 'none';
}

function escapeHTML(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getSalaNome(consulta) {
    return consulta?.sala?.nome || 'Sem sala';
}

// Função para alternar entre modos ABA e Terapia Convencional
function alternarModoCalendario(modo) {
    modoCalendario = modo;
    console.log('Modo do calendário alterado para:', modo);

    // Atualiza visual dos botões
    const btnABA = document.getElementById('btnModoABA');
    const btnConvencional = document.getElementById('btnModoConvencional');
    const labelModo = document.getElementById('modoAtualLabel');

    if (modo === 'ABA') {
        btnABA.style.background = '#4CAF50';
        btnABA.style.color = 'white';
        btnABA.style.borderColor = '#4CAF50';
        btnABA.classList.add('active');

        btnConvencional.style.background = 'white';
        btnConvencional.style.color = '#666';
        btnConvencional.style.borderColor = '#ccc';
        btnConvencional.classList.remove('active');

        labelModo.textContent = 'Modo: ABA (50min)';
        labelModo.style.background = '#e8f5e9';
        labelModo.style.color = '#2e7d32';
    } else {
        btnConvencional.style.background = '#2196F3';
        btnConvencional.style.color = 'white';
        btnConvencional.style.borderColor = '#2196F3';
        btnConvencional.classList.add('active');

        btnABA.style.background = 'white';
        btnABA.style.color = '#666';
        btnABA.style.borderColor = '#ccc';
        btnABA.classList.remove('active');

        labelModo.textContent = 'Modo: Terapia Convencional (30min)';
        labelModo.style.background = '#e3f2fd';
        labelModo.style.color = '#1565c0';
    }

    // Re-renderiza o calendário com o novo filtro
    atualizarDisplayData(dataInicioAtual);
}