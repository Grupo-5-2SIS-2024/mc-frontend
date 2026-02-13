// Definição dos slots para ABA (50 minutos) e Terapia Convencional (30 minutos)
const SLOT_DURATION_ABA = '00:50:00';
const SLOT_DURATION_CONVENCIONAL = '00:30:00';
const SLOT_DURATION_NEURO = '01:00:00';

// Slots para ABA (50min) - conforme regra existente (manhã e tarde)
const SCHEDULE_SLOTS_ABA = [
    '08:00', '08:50', '09:40', '10:30','11:00','11:50', '12:40',// manhã termina 11:20
    '13:40', '14:30', '15:20', '16:10', '17:00' // tarde termina 17:50 (encerrando 18:00)
];

// Slots para Terapia Convencional (30min) - intervalos de :00 e :30
const SCHEDULE_SLOTS_CONVENCIONAL = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00','11:30','12:00','12:30','13:00', // manhã
    '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30' // tarde
];

// Slots para Neuropsicologia (60min)
const SCHEDULE_SLOTS_NEURO = [
    '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00'
];

// Variáveis para controlar o procedimento atual e modo de terapia selecionado
let procedimentoAtual = null;
let procedimentosList = [];
let consultas = []; // Variável global para armazenar as consultas
let modoTerapia = 'ABA'; // ABA | Convencional

// Base da API: usa localhost em dev, vazio em produção
const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : '';
document.getElementById('responsavel').addEventListener('input', () => {
    updateAvailablePatients();
});

// Idempotência e checagem de duplicidade
function makeConsultaKey({ dia, hora, medicoId, pacienteId, procedimentoId, duracao }) {
    return `CONSULTA:${dia}T${hora}|M${medicoId}|P${pacienteId}|E${procedimentoId}|D${duracao}`;
}

function isStatusAtivo(c) {
    const id = Number(c?.statusConsulta?.id);
    const nome = String(c?.statusConsulta?.nomeStatus || '').toLowerCase();
    return !(id === 3 || nome.includes('cancel'));
}

function isDuplicate(consultasArr, { dia, hora, medicoId, pacienteId }) {
    return (consultasArr || []).some(c => {
        if (typeof c?.datahoraConsulta !== 'string') return false;
        if (!isStatusAtivo(c)) return false;
        const sameDay = c.datahoraConsulta.startsWith(dia);
        const cHora = c.datahoraConsulta.split('T')[1]?.substring(0, 5) || '';
        const sameHour = cHora === hora;
        const sameMedico = String(c?.medico?.id) === String(medicoId);
        const samePaciente = String(c?.paciente?.id) === String(pacienteId);
        return sameDay && sameHour && (sameMedico || samePaciente);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const diaInput = document.getElementById('dia');
    const diaConsulta = sessionStorage.getItem('DIA_CONSULTA');
    if (diaConsulta) {
        diaInput.value = diaConsulta;
        sessionStorage.removeItem('DIA_CONSULTA');
    }
    // Carrega consultas para cálculo de disponibilidade
    await buscarConsultas();
    // Configura toggle de terapia e estados iniciais dos campos
    configurarToggleTerapia();
    setInitialState();
    // Carrega horários se já houver data preenchida
    updateAvailableHours();
});

function withLabelNomeSobrenome(lista) {
    return (lista || []).map(item => ({
        ...item,
        label: `${item.nome} ${item.sobrenome}`.trim()
    }));
}

function formatarData(dataISO) {
    const data = new Date(dataISO)
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();

    const horas = String(data.getHours()).padStart(2, '0')
    const minutos = String(data.getMinutes()).padStart(2, '0')
    const segundos = String(data.getSeconds()).padStart(2, '0')

    return `${dia}/${mes}/${ano} - ${horas}:${minutos}:${segundos}`


}
// Função para determinar o ícone com base no gênero do paciente
function obterIconeGenero(genero) {
    if (genero.toLowerCase() === 'masculino') {
        return '<i class="fas fa-male" style="font-size: 50px; color: #1E90FF;"></i>'; // Azul para homens
    } else if (genero.toLowerCase() === 'feminino') {
        return '<i class="fas fa-female" style="font-size: 50px; color: #E91E63;"></i>'; // Rosa para mulheres
    } else {
        return '<i class="fas fa-user" style="font-size: 50px; color: #9E9E9E;"></i>'; // Ícone genérico para outros casos
    }
}

async function buscarConsultas() {
    console.log("Buscando consultas...");
    try {
        const resposta = await fetch(`${API_BASE}/mc/consultas`);
        if (!resposta.ok) {
            throw new Error(`HTTP error! Status: ${resposta.status}`);
        }
        consultas = await resposta.json(); // Armazena as consultas na variável global
        console.log(consultas);

        // (Removed inline list rendering: the agendamento page no longer shows the full consultas list.)
        // consultas are still stored in the global `consultas` variable for other operations.
        return consultas;
    } catch (error) {
        console.error('Erro ao buscar consultas:', error);
        return []; // Retorna um array vazio em caso de erro
    }
}


function verFeedback(consultaId) {
    window.location.href = `FeedbackConsulta.html?consultaId=${consultaId}&viewOnly=true`;
}

async function buscarEspecificacoes() {
    console.log("Buscando procedimentos/especializações...");
    try {
        const resp = await fetch(`${API_BASE}/mc/especificacoes`);
        if (!resp.ok) throw new Error(`HTTP error! Status: ${resp.status}`);
        const especificacoes = await resp.json();

        // Armazena lista global para referência
        procedimentosList = especificacoes;

        // Opção padrão + lista
        populateSelect('procedimento', [{ area: 'Selecione um Procedimento', id: '' }, ...especificacoes], 'area', 'id');
    } catch (error) {
        console.error('Erro ao buscar procedimentos:', error);
        // fallback mínimo
        populateSelect('procedimento', [{ area: 'Nenhum procedimento encontrado', id: '' }], 'area', 'id');
    }
}



// Função para buscar dados da API para pacientes e Profissionais e popular os selects
async function buscarPacientesEMedicos() {
    console.log("Buscando pacientes e Profissionais...");

    try {
        const respostaPacientes = await fetch(`${API_BASE}/mc/pacientes`);
        if (!respostaPacientes.ok) {
            throw new Error(`HTTP error! Status: ${respostaPacientes.status}`);
        }
        const pacientes = await respostaPacientes.json();
        console.log(pacientes);

        const respostaMedicos = await fetch(`${API_BASE}/mc/medicos`);
        if (!respostaMedicos.ok) {
            throw new Error(`HTTP error! Status: ${respostaMedicos.status}`);
        }
        const medicos = await respostaMedicos.json();
        console.log(medicos);

        // Adiciona a opção padrão antes de popular as opções reais
        const pacientesLabel = withLabelNomeSobrenome(pacientes);
        const medicosLabel = withLabelNomeSobrenome(medicos);

        // Adiciona a opção padrão antes de popular as opções reais
        populateSelect('paciente', [{ label: 'Selecione um Paciente', id: '' }, ...pacientesLabel], 'label', 'id');
        populateSelect('medico', [{ label: 'Selecione um Profissional', id: '' }, ...medicosLabel], 'label', 'id');
    } catch (error) {
        console.error('Erro ao buscar pacientes e Profissionais:', error);
    }
}

// Função para popular as opções dos selects
function populateSelect(selectId, options, textKey = 'nome', valueKey = 'id') {
    const selectElement = document.getElementById(selectId);
    selectElement.innerHTML = ''; // Limpar opções existentes

    // Verifica se a lista de opções é válida e não está vazia
    if (options.length === 0 || options[0] === 'Sem horários disponíveis') {
        const optionElement = document.createElement('option');
        optionElement.textContent = 'Nenhum horário disponível';
        optionElement.value = ''; // Define o valor como vazio
        selectElement.appendChild(optionElement);
        return;
    }

    options.forEach(option => {
        const optionElement = document.createElement('option');

        if (typeof option === 'string') {
            // Caso seja uma string, adiciona diretamente
            optionElement.textContent = option;
            optionElement.value = option;
        } else {
            // Caso contrário, utiliza as chaves fornecidas
            optionElement.textContent = option[textKey];
            optionElement.value = option[valueKey];
        }

        selectElement.appendChild(optionElement);
    });
}

// Função auxiliar para determinar se procedimento é Terapia Convencional
function isTerapiaConvencional() {
    // Usa a seleção explícita do usuário (corrige mudança automática em fono)
    return modoTerapia === 'Convencional';
}

function configurarToggleTerapia() {
    const btnABA = document.getElementById('btnModoABA');
    const btnConv = document.getElementById('btnModoConvencional');
    const label = document.getElementById('modoAtualLabel');

    const updateUI = () => {
        if (modoTerapia === 'ABA') {
            btnABA?.classList.add('active');
            btnConv?.classList.remove('active');
            btnABA?.setAttribute('aria-pressed', 'true');
            btnConv?.setAttribute('aria-pressed', 'false');
            if (label) { label.textContent = 'Modo: ABA'; label.style.background = '#E8F5E9'; label.style.color = '#2E7D32'; }
        } else {
            btnConv?.classList.add('active');
            btnABA?.classList.remove('active');
            btnConv?.setAttribute('aria-pressed', 'true');
            btnABA?.setAttribute('aria-pressed', 'false');
            if (label) { label.textContent = 'Modo: Convencional'; label.style.background = '#E3F2FD'; label.style.color = '#1565C0'; }
        }
    };

    btnABA?.addEventListener('click', () => { modoTerapia = 'ABA'; updateUI(); updateAvailableHours(); });
    btnConv?.addEventListener('click', () => { modoTerapia = 'Convencional'; updateUI(); updateAvailableHours(); });
    updateUI();
}

function setInitialState() {
    const selProcedimento = document.getElementById('procedimento');
    const selMedico = document.getElementById('medico');
    const selPaciente = document.getElementById('paciente');
    const inputDia = document.getElementById('dia');
    const selHora = document.getElementById('hora');

    // disable downstream controls until prior selections are made
    selMedico.disabled = true; selPaciente.disabled = true; inputDia.disabled = true; selHora.disabled = true;

    selProcedimento.addEventListener('change', () => {
        procedimentoAtual = selProcedimento.value || null;
        selMedico.disabled = false;
        updateAvailableDoctors();
        // reset downstream
        selPaciente.disabled = true; inputDia.disabled = true; selHora.disabled = true;
        selPaciente.innerHTML = ''; selHora.innerHTML = '';
    });

    selMedico.addEventListener('change', () => {
        selPaciente.disabled = false;
        updateAvailablePatients();
        // permitir selecionar data após escolher profissional
        inputDia.disabled = false;
    });

    selPaciente.addEventListener('change', () => {
        inputDia.disabled = false;
        updateAvailableHours();
    });

    inputDia.addEventListener('change', () => {
        selHora.disabled = false;
        updateAvailableHours();
    });
}

// Função auxiliar para verificar se há sobreposição entre dois horários
function verificarSobreposicao(inicio1, duracao1Min, inicio2, duracao2Min) {
    // Converte horários para minutos desde meia-noite
    const [h1, m1] = inicio1.split(':').map(Number);
    const minutos1Inicio = h1 * 60 + m1;
    const minutos1Fim = minutos1Inicio + duracao1Min;

    const [h2, m2] = inicio2.split(':').map(Number);
    const minutos2Inicio = h2 * 60 + m2;
    const minutos2Fim = minutos2Inicio + duracao2Min;

    // Verifica sobreposição: início de uma está dentro do período da outra
    return (minutos1Inicio < minutos2Fim && minutos1Fim > minutos2Inicio);
}

// Função para obter horários disponíveis considerando médico/paciente e sobreposição
async function getAvailableHours(dia) {
    const slotsBase = isNeuroSelecionado() ? SCHEDULE_SLOTS_NEURO : (isTerapiaConvencional() ? SCHEDULE_SLOTS_CONVENCIONAL : SCHEDULE_SLOTS_ABA);
    const medicoId = document.getElementById('medico').value;
    const pacienteId = document.getElementById('paciente').value;
    if (!dia) return slotsBase;
    if (!medicoId && !pacienteId) return slotsBase;

    const consultasDoDia = (consultas || []).filter(c => typeof c?.datahoraConsulta === 'string' && c.datahoraConsulta.startsWith(dia));
    const bloqueios = consultasDoDia.filter(c => {
        const bloqueiaMedico = medicoId ? String(c?.medico?.id) === String(medicoId) : false;
        const bloqueiaPaciente = pacienteId ? String(c?.paciente?.id) === String(pacienteId) : false;
        return bloqueiaMedico || bloqueiaPaciente;
    });

    const durMin = isNeuroSelecionado() ? 60 : (isTerapiaConvencional() ? 30 : 50);
    const slotsDisponiveis = slotsBase.filter(slot => {
        return !bloqueios.some(c => {
            const dataHora = c.datahoraConsulta.split('T')[1]?.substring(0, 5) || '00:00';
            // Parse duração da consulta existente
            let durExistMin = 0;
            const d = c?.duracaoConsulta;
            if (typeof d === 'number') durExistMin = d;
            else if (typeof d === 'string') {
                const parts = d.split(':');
                if (parts.length >= 2) durExistMin = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
                else { const n = parseInt(d, 10); durExistMin = isNaN(n) ? 0 : n; }
            }
            return verificarSobreposicao(slot, durMin, dataHora, durExistMin);
        });
    });

    return slotsDisponiveis.length ? slotsDisponiveis : ['Sem horários disponíveis'];
}

// Função para atualizar as horas disponíveis após a seleção da data e procedimento
async function updateAvailableHours() {
    const dia = document.getElementById('dia').value;
    const select = document.getElementById('hora');
    if (!select) return;
    const prevValue = select.value; // tentar preservar seleção atual

    if (dia) {
        const availableHours = await getAvailableHours(dia);
        const duracao = isNeuroSelecionado() ? 60 : (isTerapiaConvencional() ? 30 : 50); // minutos

        // Monta opções com intervalo completo (inicio - fim)
        const options = availableHours.map(start => {
            if (start === 'Sem horários disponíveis') return start;
            const [h, m] = start.split(':').map(Number);
            const endDate = new Date(0, 0, 0, h, m + duracao, 0);
            const endH = String(endDate.getHours()).padStart(2, '0');
            const endM = String(endDate.getMinutes()).padStart(2, '0');
            return { label: `${start} - ${endH}:${endM}`, value: start };
        });
        select.innerHTML = '';
        if (options.length === 0) {
            const opt = document.createElement('option');
            opt.textContent = 'Sem horários disponíveis';
            opt.value = '';
            select.appendChild(opt);
        } else {
            const placeholder = document.createElement('option');
            placeholder.textContent = 'Selecione um horário';
            placeholder.value = '';
            placeholder.disabled = true;
            // Definir seleção do placeholder depois, conforme preservação
            select.appendChild(placeholder);
            options.forEach(o => {
                const opt = document.createElement('option');
                if (typeof o === 'string') {
                    opt.textContent = o;
                    opt.value = o;
                } else {
                    opt.textContent = o.label;
                    opt.value = o.value;
                }
                select.appendChild(opt);
            });

            // Tentar preservar o horário previamente selecionado, se ainda disponível
            const aindaDisponivel = typeof prevValue === 'string' && prevValue && availableHours.includes(prevValue);
            if (aindaDisponivel) {
                select.value = prevValue;
                placeholder.selected = false;
            } else {
                placeholder.selected = true;
            }
        }
    } else {
        // Sem data: limpa select e adiciona placeholder
        select.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.textContent = 'Selecione uma data primeiro';
        placeholder.value = '';
        placeholder.disabled = true;
        placeholder.selected = true;
        select.appendChild(placeholder);
    }
}

async function updateAvailableDoctors() {
    const dia = document.getElementById('dia').value;
    const procedimentoId = document.getElementById('procedimento').value;
    try {
        const respMedicos = await fetch(`${API_BASE}/mc/medicos`);
        if (!respMedicos.ok) throw new Error(`HTTP error! Status: ${respMedicos.status}`);
        const medicos = await respMedicos.json();

        // Filtra por procedimento se houver
        let medicosFiltrados = medicos;
        if (procedimentoId) {
            medicosFiltrados = medicos.filter(m => String(m.especificacaoMedica.id) === String(procedimentoId));
        }

        // Popula sempre com base no procedimento; não filtra por ocupação neste horário
        const medicosFiltradosLabel = withLabelNomeSobrenome(medicosFiltrados);
        populateSelect('medico', [{ label: 'Selecione um Profissional', id: '' }, ...medicosFiltradosLabel], 'label', 'id');
    } catch (error) {
        console.error('Erro ao atualizar Profissionais disponíveis:', error);
    }
}
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function isNeuroSelecionado() {
    try {
        const procedimentoId = document.getElementById('procedimento')?.value;
        if (!procedimentoId) return false;
        const espec = (procedimentosList || []).find(e => String(e.id) === String(procedimentoId));
        const area = espec?.area || '';
        const n = normalizarTexto(area);
        return n.includes('neuropsico');
    } catch {
        return false;
    }
}


async function updateAvailablePatients() {
    try {
        const input = document.getElementById('responsavel');
        const filtroDigitado = input?.value?.trim();
        const resposta = await fetch(`${API_BASE}/mc/pacientes`);
        if (!resposta.ok) {
            populateSelect('paciente', [{ label: 'Nenhum paciente encontrado', id: '' }], 'label', 'id');
            return;
        }

        const pacientes = await resposta.json();

        let pacientesFiltrados = pacientes;

        if (filtroDigitado) {
            const filtro = normalizarTexto(filtroDigitado);

            pacientesFiltrados = pacientes.filter(p => {
                if (!p.responsaveis || p.responsaveis.length === 0) return false;

                return p.responsaveis.some(r => {
                    const nome = normalizarTexto(r.nome);
                    const sobrenome = normalizarTexto(r.sobrenome);
                    const nomeCompleto = normalizarTexto(`${r.nome} ${r.sobrenome}`);

                    return (
                        nome.includes(filtro) ||
                        sobrenome.includes(filtro) ||
                        nomeCompleto.includes(filtro)
                    );
                });
            });
        }

        const pacientesLabel = withLabelNomeSobrenome(pacientesFiltrados);

        populateSelect(
            'paciente',
            [{ label: 'Selecione um Paciente', id: '' }, ...pacientesLabel],
            'label',
            'id'
        );
    } catch (error) {
        console.error('Erro ao filtrar pacientes por responsável:', error);
    }
}

async function agendarConsulta() {
    const dia = document.getElementById('dia').value;
    const hora = document.getElementById('hora').value;
    const medicoId = document.getElementById('medico').value;
    const pacienteId = document.getElementById('paciente').value;
    const descricao = document.getElementById('descricao').value || "Sem descrição";
    const procedimentoId = document.getElementById('procedimento').value;
    const recorrente = document.getElementById('recorrente').checked; // Verifica se o checkbox está marcado
    const btn = document.getElementById('agendar');

    // validações rápidas
    if (!procedimentoId) {
        Swal.fire({ icon: 'warning', title: 'Selecione o Procedimento', text: 'Escolha o procedimento antes de agendar.' });
        return;
    }

    if (!dia || !hora || !medicoId || !pacienteId) {
        Swal.fire({ icon: 'warning', title: 'Campos obrigatórios', text: 'Preencha data, hora, profissional e paciente.' });
        return;
    }

    // Idempotência simples para evitar duplo clique
    const duracaoEscolhida = isNeuroSelecionado() ? SLOT_DURATION_NEURO : (isTerapiaConvencional() ? SLOT_DURATION_CONVENCIONAL : SLOT_DURATION_ABA);
    const chave = makeConsultaKey({ dia, hora, medicoId, pacienteId, procedimentoId, duracao: duracaoEscolhida });
    const pendKey = `PENDING_${chave}`;
    const now = Date.now();
    const prev = Number(sessionStorage.getItem(pendKey) || 0);
    if (prev && (now - prev) < 30000) {
        Swal.fire({ icon: 'info', title: 'Consulta já em criação', text: 'Aguarde alguns segundos para tentar novamente.' });
        return;
    }
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    sessionStorage.setItem(pendKey, String(now));

    try {
        const respostaEspec = await fetch(`${API_BASE}/mc/medicos`);
        if (!respostaEspec.ok) {
            throw new Error(`HTTP error! Status: ${respostaEspec.status}`);
        }

        const medicos = await respostaEspec.json();
        const medicoSelecionado = medicos.find(medico => medico.id == medicoId);


        if (!medicoSelecionado) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Profissional não encontrado.',
            });
            return;
        }

        if (String(medicoSelecionado.especificacaoMedica.id) !== String(procedimentoId)) {
            Swal.fire({
                icon: 'error',
                title: 'Profissional não atende este procedimento',
                text: 'O profissional selecionado não pertence à especialização escolhida. Escolha um profissional compatível.'
            });
            return;
        }

        const especificacaoMedicaId = procedimentoId;

        // Determina duração
        const duracaoConsulta = duracaoEscolhida;

        // Busca consultas existentes uma única vez para checagem de duplicidade por paciente/dia
        let consultasExistentes = [];
        try { consultasExistentes = await buscarConsultas(); } catch (e) { consultasExistentes = []; }

        // Função para criar o objeto da consulta
        const criarDadosConsulta = (dataConsulta) => ({
            datahoraConsulta: `${dataConsulta}T${hora}:00`,
            descricao: descricao,
            medico: { id: medicoId },
            especificacaoMedica: { id: especificacaoMedicaId },
            statusConsulta: { id: 1 },
            paciente: { id: pacienteId },
            duracaoConsulta: duracaoConsulta
        });
  
        // Impede duplicidade por slot/profissional/paciente
        const dup = isDuplicate(consultasExistentes, { dia, hora, medicoId, pacienteId });
        if (dup) {
            Swal.fire({ icon: 'warning', title: 'Conflito de horário', text: 'Já existe consulta ativa neste horário para este paciente ou profissional.' });
            return;
        }

        // Agendar a consulta original
        const dadosConsulta = criarDadosConsulta(dia);
        const respostaCadastro = await fetch(`${API_BASE}/mc/consultas`, {
            method: "POST",
            body: JSON.stringify(dadosConsulta),
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Accept": "application/json"
            }
        });

        if (!respostaCadastro.ok) {
            throw new Error('Ocorreu um erro ao cadastrar a consulta.');
        }

        // Se o checkbox de recorrente estiver marcado, agendar as próximas 30 semanas
        if (recorrente) {
            const dataOriginal = new Date(dia);
            for (let i = 1; i <= 30; i++) {
                const novaData = new Date(dataOriginal);
                novaData.setDate(novaData.getDate() + (i * 7));
                const novaDataISO = novaData.toISOString().split('T')[0];
                try {
                    try { consultasExistentes = await buscarConsultas(); } catch {}
                    const dupFuture = isDuplicate(consultasExistentes, { dia: novaDataISO, hora, medicoId, pacienteId });
                    if (dupFuture) continue;
                    const novaConsulta = criarDadosConsulta(novaDataISO);
                    await fetch(`${API_BASE}/mc/consultas`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify(novaConsulta)
                    });
                } catch (_) { /* ignora falhas pontuais */ }
            }
        }

        Swal.fire({
            icon: 'success',
            title: 'Consulta agendada com sucesso!',
            showConfirmButton: false,
            timer: 1500,
        }).then(() => {
            window.location.reload();
        });

    } catch (error) {
        console.error('Erro ao agendar consulta:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro ao agendar a consulta.',
        });
    } finally {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        try { sessionStorage.removeItem(pendKey); } catch {}
        try { await buscarConsultas(); } catch {}
    }
}
async function excluirConsulta(idConsulta) {
    console.log("Iniciando exclusão da consulta com ID:", idConsulta);

    try {
        // Recupera todas as consultas
        const respostaConsulta = await fetch(`${API_BASE}/mc/consultas`, {
            method: 'GET',
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Accept": "application/json"
            }
        });

        if (!respostaConsulta.ok) {
            throw new Error(`Erro HTTP! Status: ${respostaConsulta.status}`);
        }

        const todasConsultas = await respostaConsulta.json();
        console.log("Todas as consultas recebidas:", todasConsultas);

        // Filtra a consulta específica pelo ID
        const consultaExistente = todasConsultas.find(consulta => consulta.id === idConsulta);

        // Verifica se a consulta foi encontrada
        if (!consultaExistente) {
            throw new Error('Consulta inválida ou não encontrada');
        }

        // Cria o objeto de consulta com os dados atualizados
        const consultaAtualizada = {
            datahoraConsulta: consultaExistente.datahoraConsulta,
            descricao: consultaExistente.descricao,
            duracaoConsulta: consultaExistente.duracaoConsulta,
            especificacaoMedica: { id: consultaExistente.especificacaoMedica.id },
            medico: { id: consultaExistente.medico.id },
            paciente: { id: consultaExistente.paciente.id },
            statusConsulta: { id: 3 } // Atualiza o status para "Cancelada" (ID = 3)
        };

        console.log("Dados da consulta para atualizar:", consultaAtualizada);

        Swal.fire({
            title: 'Tem certeza?',
            text: "Você não poderá reverter esta ação!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, cancele!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Envia a requisição PUT para atualizar o status da consulta
                    const resposta = await fetch(`${API_BASE}/mc/consultas/${idConsulta}`, {
                        method: 'PUT',
                        body: JSON.stringify(consultaAtualizada),
                        headers: {
                            "Content-type": "application/json; charset=UTF-8",
                            "Accept": "application/json"
                        }
                    });

                    if (resposta.ok) {
                        Swal.fire(
                            'Cancelado!',
                            'O status da consulta foi atualizado para "Cancelada".',
                            'success'
                        );
                        await buscarConsultas(); // Atualiza a lista de consultas após a alteração
                    } else {
                        const erro = await resposta.text();
                        Swal.fire('Erro!', `Ocorreu um erro ao cancelar a consulta: ${erro}`, 'error');
                    }
                } catch (error) {
                    console.error('Erro ao cancelar consulta:', error);
                    Swal.fire('Erro!', 'Erro ao cancelar a consulta.', 'error');
                }
            }
        });
    } catch (error) {
        console.error('Erro ao buscar consultas:', error);
        Swal.fire('Erro!', 'Erro ao buscar as consultas.', 'error');
    }
}

async function alterarConsulta(idConsulta) {
    console.log("Iniciando alteração da consulta com ID:", idConsulta);

    try {
        // Buscar todas as consultas
        const respostaConsulta = await fetch(`${API_BASE}/mc/consultas`, {
            method: 'GET',
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Accept": "application/json"
            }
        });

        if (!respostaConsulta.ok) {
            throw new Error(`Erro HTTP! Status: ${respostaConsulta.status}`);
        }

        const consultas = await respostaConsulta.json();
        console.log("Consultas existentes recebidas:", consultas);

        // Localizar a consulta específica pelo ID
        const consultaExistente = consultas.find(consulta => consulta.id === idConsulta);
        if (!consultaExistente) {
            throw new Error('Consulta não encontrada.');
        }

        // Buscar dados para preencher selects de Profissionais, Pacientes e Especializações Médicas
        const [medicos, pacientes, especializacoes] = await Promise.all([
            fetch(`${API_BASE}/mc/medicos`).then(res => res.json()),
            fetch(`${API_BASE}/mc/pacientes`).then(res => res.json()),
            fetch(`${API_BASE}/mc/especificacoes`).then(res => res.json())
        ]);

        // Preencher selects com opções
        const medicoOptions = medicos.map(medico => `<option value="${medico.id}" ${medico.id === consultaExistente.medico.id ? 'selected' : ''}>${medico.nome} ${medico.sobrenome}</option>`).join('');
        const pacienteOptions = pacientes.map(paciente => `<option value="${paciente.id}" ${paciente.id === consultaExistente.paciente.id ? 'selected' : ''}>${paciente.nome} ${paciente.sobrenome}</option>`).join('');
        const especializacaoOptions = especializacoes.map(especializacao => `<option value="${especializacao.id}" ${especializacao.id === consultaExistente.especificacaoMedica.id ? 'selected' : ''}>${especializacao.area}</option>`).join('');

        // Exibir popup de edição com os selects preenchidos
        const { value: consultaAtualizada } = await Swal.fire({
            title: 'Alterar Consulta',
            html:
                `<label for="datahoraConsulta">Data e Hora:</label><br><input type="datetime-local" id="datahoraConsulta" value="${consultaExistente.datahoraConsulta}" class="swal2-input"><br>` +
                `<label for="descricao">Descrição:</label><br><textarea id="descricao" class="swal2-textarea">${consultaExistente.descricao}</textarea><br>` +
                `<label for="duracaoConsulta">Duração:</label><br><input type="time" id="duracaoConsulta" value="${consultaExistente.duracaoConsulta}" class="swal2-input"><br>` +
                `<label for="especificacaoMedica">Especialização Médica:</label><br><select id="especificacaoMedica" class="swal2-select">${especializacaoOptions}</select><br>` +
                `<label for="medico">Profissional:</label><br><select id="medico" class="swal2-select">${medicoOptions}</select><br>` +
                `<label for="paciente">Paciente:</label><br><select id="paciente" class="swal2-select">${pacienteOptions}</select><br>` +
                `<label for="statusConsulta">Status:</label><br><select id="statusConsulta" class="swal2-select">
                    <option value="1" ${consultaExistente.statusConsulta.id === 1 ? 'selected' : ''}>Agendada</option>
                    <option value="2" ${consultaExistente.statusConsulta.id === 2 ? 'selected' : ''}>Concluída</option>
                    <option value="3" ${consultaExistente.statusConsulta.id === 3 ? 'selected' : ''}>Cancelada</option>
                </select><br>`,
            focusConfirm: false,
            preConfirm: () => ({
                datahoraConsulta: document.getElementById('datahoraConsulta').value || consultaExistente.datahoraConsulta,
                descricao: document.getElementById('descricao').value || consultaExistente.descricao,
                duracaoConsulta: document.getElementById('duracaoConsulta').value || consultaExistente.duracaoConsulta,
                especificacaoMedica: { id: document.getElementById('especificacaoMedica').value || consultaExistente.especificacaoMedica.id },
                medico: { id: document.getElementById('medico').value || consultaExistente.medico.id },
                paciente: { id: document.getElementById('paciente').value || consultaExistente.paciente.id },
                statusConsulta: { id: parseInt(document.getElementById('statusConsulta').value) || consultaExistente.statusConsulta.id }
            })
        });

        if (consultaAtualizada) {
            console.log("Dados da consulta a serem enviados:", consultaAtualizada); // Adicionado para verificar o objeto de dados

            try {
                // Envia a requisição PUT para atualizar a consulta
                const resposta = await fetch(`${API_BASE}/mc/consultas/${idConsulta}`, {
                    method: 'PUT',
                    body: JSON.stringify(consultaAtualizada),
                    headers: {
                        "Content-type": "application/json; charset=UTF-8",
                        "Accept": "application/json"
                    }
                });

                if (resposta.ok) {
                    Swal.fire('Alterada!', 'A consulta foi atualizada com sucesso.', 'success');
                    await buscarConsultas(); // Atualiza a lista de consultas após a alteração
                } else {
                    const erro = await resposta.text();
                    Swal.fire('Erro!', `Ocorreu um erro ao alterar a consulta: ${erro}`, 'error');
                }
            } catch (error) {
                console.error('Erro ao alterar consulta:', error);
                Swal.fire('Erro!', 'Erro ao alterar a consulta.', 'error');
            }
        }
    } catch (error) {
        console.error('Erro ao buscar consultas:', error);
        Swal.fire('Erro!', 'Erro ao buscar as consultas.', 'error');
    }
}

// Inicialização da página
(async function initialize() {
    console.log("Iniciando página de agendamentos...");
    await buscarEspecificacoes();
    await buscarPacientesEMedicos();
})();

document.getElementById('procedimento').addEventListener('change', () => {
    updateAvailableDoctors(); // refiltra profissionais pelo procedimento
    updateAvailableHours(); // atualiza horários disponíveis baseado no procedimento
});
// Eventos de mudança nos selects
document.getElementById('dia').addEventListener('change', updateAvailableHours);
// Ao escolher horário, não repopular profissionais/pacientes para evitar reset de seleção
document.getElementById('medico').addEventListener('change', updateAvailablePatients);

document.getElementById('agendar').addEventListener('click', agendarConsulta);


async function BaixarExcelGeral() {
    // moved to shared downloads.js
    console.warn('BaixarExcelGeral() moved to downloads.js — include that script on the page and call BaixarExcelGeral() there.');
}



async function baixarConsultaExcel(consultaId) {
    try {

        const consultas = await buscarConsultas();
        const consulta = consultas.find(c => c.id === consultaId);

        if (!consulta) {
            throw new Error("Consulta não encontrada");
        }


        const dadosExcel = [{
            Paciente: `${consulta.paciente.nome} ${consulta.paciente.sobrenome}`,
            "Data e Hora": formatarData(consulta.datahoraConsulta),
            Profissional: `${consulta.medico.nome} ${consulta.medico.sobrenome}`,
            Especialização: consulta.especificacaoMedica.area,
            Status: consulta.statusConsulta.nomeStatus,
            Descrição: consulta.descricao
        }];


        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dadosExcel);
        XLSX.utils.book_append_sheet(wb, ws, "Consulta");


        XLSX.writeFile(wb, `consulta_${consultaId}.xlsx`);
    } catch (error) {
        console.error("Erro ao baixar consulta em Excel:", error);
    }
} function getConsultasAgendadas() {
    return consultas.filter(consulta => consulta.statusConsulta.nomeStatus === 'Agendada');
}


async function excluirUltimaConsulta() {
    const consultasAgendadas = getConsultasAgendadas();

    if (consultasAgendadas.length > 0) {
        const ultimaConsulta = consultasAgendadas[consultasAgendadas.length - 1];


        Swal.fire({
            title: 'Tem certeza?',
            text: `Deseja excluir a última consulta agendada de ${ultimaConsulta.paciente.nome}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {

                    const resposta = await fetch(`${API_BASE}/mc/consultas/${ultimaConsulta.id}`, {
                        method: 'DELETE',
                        headers: {
                            "Content-type": "application/json; charset=UTF-8",
                            "Accept": "application/json"
                        }
                    });

                    if (resposta.ok) {

                        consultas = consultas.filter(consulta => consulta.id !== ultimaConsulta.id);


                        Swal.fire({
                            icon: 'success',
                            title: 'Consulta Excluída',
                            html: `<h3>Última consulta agendada excluída com sucesso!</h3>`,
                            confirmButtonText: 'Ok'
                        });


                        atualizarListagemConsultas();
                    } else {
                        throw new Error('Erro ao excluir a consulta no backend');
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro na Exclusão',
                        text: `Erro ao excluir a última consulta agendada: ${error.message}`
                    });
                }
            }
        });
    } else {
        Swal.fire({
            icon: 'info',
            title: 'Nenhuma Consulta Agendada',
            text: 'Não há consultas agendadas para excluir.'
        });
    }
}

async function excluirPrimeiraConsulta() {
    const consultasAgendadas = getConsultasAgendadas();

    if (consultasAgendadas.length > 0) {
        const primeiraConsulta = consultasAgendadas[0];

        Swal.fire({
            title: 'Tem certeza?',
            text: `Deseja excluir a primeira consulta agendada de ${primeiraConsulta.paciente.nome}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {

                    const consultaId = Number(primeiraConsulta.id);
                    console.log(consultaId)
                    const resposta = await fetch(`${API_BASE}/mc/consultas/${consultaId}`, {
                        method: 'DELETE',
                        headers: {
                            "Content-type": "application/json; charset=UTF-8",
                            "Accept": "application/json"
                        }
                    });

                    if (resposta.ok) {

                        consultas = consultas.filter(consulta => consulta.id !== primeiraConsulta.id);


                        Swal.fire({
                            icon: 'success',
                            title: 'Consulta Excluída',
                            html: `<h3>Primeira consulta agendada excluída com sucesso!</h3>`,
                            confirmButtonText: 'Ok'
                        });


                        atualizarListagemConsultas();
                    } else {
                        throw new Error('Erro ao excluir a consulta no backend');
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro na Exclusão',
                        text: `Erro ao excluir a primeira consulta agendada: ${error.message}`
                    });
                }
            }
        });
    } else {
        Swal.fire({
            icon: 'info',
            title: 'Nenhuma Consulta Agendada',
            text: 'Não há consultas agendadas para excluir.'
        });
    }
}

function atualizarListagemConsultas() {
    buscarConsultas(); // Atualiza a lista de consultas na tela
}


function AnaliseConsultasx(consultaId) {
    window.location.href = `FeedbackConsulta.html?consultaId=${consultaId}`;
}
