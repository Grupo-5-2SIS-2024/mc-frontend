// Base da API: usa localhost em dev, vazio em produção
const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : '';

// Função para formatar CPF
function formatarCPF(cpf) {
    return cpf ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '';
}

// Função para formatar telefone
function formatarTelefone(telefone) {
    return telefone ? telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : '';
}

// Função auxiliar para calcular a idade
function calcularIdade(dataNascimento) {
    if (!dataNascimento) return 'Não informada';
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return `${idade} anos`;
}


// Funções para abrir e fechar o modal de filtros
function abrirModalFiltro() {
    document.getElementById("modalFiltro").style.display = "block";
}
function fecharModalFiltro() {
    document.getElementById("modalFiltro").style.display = "none";
}

// Funções para limpar e aplicar filtros
function limparFiltros() {
    document.getElementById('filtroNome').value = '';
    document.getElementById('filtroEmail').value = '';
    document.getElementById('filtroCPF').value = '';
    document.getElementById('filtroTelefone').value = '';
    document.getElementById('filtroDataNascimento').value = '';
    document.getElementById('listaFiltrosAtivos').innerHTML = ''; // Limpa a lista de filtros ativos
    buscarPacientes(); // Busca os pacientes sem filtros
}

function aplicarFiltros() {
    const nome = document.getElementById('filtroNome').value.toLowerCase();
    const email = document.getElementById('filtroEmail').value.toLowerCase();
    const cpf = document.getElementById('filtroCPF').value;
    const telefone = document.getElementById('filtroTelefone').value;
    const dataNascimento = document.getElementById('filtroDataNascimento').value;

    const filtrosAtivos = {
        nome: nome,
        email: email,
        cpf: cpf,
        telefone: telefone,
        dataNascimento: dataNascimento
    };

    const listaFiltrosAtivos = document.getElementById('listaFiltrosAtivos');
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
    buscarPacientes(nome, email, cpf, telefone, dataNascimento);
}

function removerFiltroEspecifico(filtro) {
    document.getElementById(`filtro${filtro.charAt(0).toUpperCase() + filtro.slice(1)}`).value = '';
    aplicarFiltros();
}

// Função para buscar pacientes com filtros específicos
async function buscarPacientes(nomeFiltro = '', emailFiltro = '', cpfFiltro = '', telefoneFiltro = '', dataNascimentoFiltro = '') {
    const permissionamentoMedico = sessionStorage.getItem("PERMISSIONAMENTO_MEDICO");
    const especificacaoMedicaArea = sessionStorage.getItem("ESPECIFICACAO_MEDICA");

    try {
        let listaPacientes = [];

        if (permissionamentoMedico === "Admin") {
            const resposta = await fetch(`${API_BASE}/mc/pacientes`);
            listaPacientes = await resposta.json();
        } else if (permissionamentoMedico === "Supervisor" && especificacaoMedicaArea) {
            const respostaPacientes = await fetch(`${API_BASE}/mc/pacientes`);
            const todosPacientes = await respostaPacientes.json();

            const respostaConsultas = await fetch(`${API_BASE}/mc/consultas`);
            const todasConsultas = await respostaConsultas.json();

            listaPacientes = todosPacientes.filter(paciente =>
                todasConsultas.some(consulta =>
                    consulta.paciente.id === paciente.id &&
                    consulta.especificacaoMedica.area === especificacaoMedicaArea
                )
            );
        } else {
            console.warn("Permissão ou especificação médica não definida.");
            return;
        }

        const pacientesFiltrados = listaPacientes.filter(paciente => {
            const nomeCompleto = `${paciente.nome} ${paciente.sobrenome}`.toLowerCase();
            const dataNascimento = new Date(paciente.dataNascimento).toISOString().split('T')[0];
            return (
                (nomeCompleto.includes(nomeFiltro) || nomeFiltro === '') &&
                (paciente.email.toLowerCase().includes(emailFiltro) || emailFiltro === '') &&
                (paciente.cpf.includes(cpfFiltro) || cpfFiltro === '') &&
                (paciente.telefone.includes(telefoneFiltro) || telefoneFiltro === '') &&
                (dataNascimento === dataNascimentoFiltro || dataNascimentoFiltro === '')
            );
        });

        atualizarListagemPacientes(pacientesFiltrados);
    } catch (e) {
        console.log(e);
    }
}

function atualizarListagemPacientes(listaPacientes) {
    const cardsPacientes = document.getElementById("listagem");
    const permissionamentoMedico = sessionStorage.getItem("PERMISSIONAMENTO_MEDICO");
    cardsPacientes.innerHTML = listaPacientes.map((paciente) => {
        const responsavel = paciente.responsavel ? `${paciente.responsavel.nome} ${paciente.responsavel.sobrenome}` : 'Não informado';
        const dataNascimentoFormatada = new Date(paciente.dataNascimento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const foto = paciente.foto || "../Assets/perfil.jpeg";

        const acoes = permissionamentoMedico === "Supervisor" ? '' : `
            <div class="actions">
                <button class="view" onclick="abrirModalPaciente(${paciente.id})"><i class="fas fa-eye"></i></button>
                <button class="update"><i class="fas fa-pencil-alt"></i></button>
                <button class="delete"><i class="fas fa-trash-alt"></i></button>
            </div>`;

        return `
            <div class="cardPaciente" data-paciente-id="${paciente.id}">
                <img onclick="abrirModalPaciente(${paciente.id})" src="${foto}" alt="Foto do Paciente">
                <div class="info">
                    <div class="field">
                        <label for="nome">Nome</label>
                        <p id="nome">${paciente.nome} ${paciente.sobrenome}</p>
                    </div>
                    <div class="field">
                        <label for="contato">Contato</label>
                        <p id="contato">${formatarTelefone(paciente.telefone)}</p>
                    </div>
                    <div class="field">
                        <label for="responsavel">Responsável</label>
                        <p id="responsavel">${responsavel}</p>
                    </div>
                    <div class="field">
                        <label for="dataNascimento">Data de Nascimento</label>
                        <p id="dataNascimento">${dataNascimentoFormatada}</p>
                    </div>
                    <div class="field">
                        <label for="cpf">CPF</label>
                        <p id="cpf">${formatarCPF(paciente.cpf)}</p>
                    </div>
                </div>
                ${acoes}
            </div>
        `;
    }).join('');

    cardsPacientes.querySelectorAll('.delete').forEach((botao) => {
        botao.addEventListener('click', function () {
            const id = this.closest('.cardPaciente').dataset.pacienteId;
            if (id) {
                Swal.fire({
                    title: 'Inativar paciente?',
                    text: 'Isso irá inativar o paciente e ocultar suas consultas.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sim, inativar',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) inativarPaciente(Number(id));
                });
            }
        });
    });

    cardsPacientes.querySelectorAll('.update').forEach((botao) => {
        botao.addEventListener('click', function () {
            const id = this.closest('.cardPaciente').dataset.pacienteId;
            if (id) window.location.href = `atualizarPaciente.html?id=${id}`;
        });
    });
}


async function deletarPaciente(id) {
    // Substituído por inativação
    return inativarPaciente(id);
}

// Inativa o paciente em vez de deletar
async function inativarPaciente(id) {
    try {
        const pacienteId = Number(id);
        const resp = await fetch(`${API_BASE}/mc/pacientes/${pacienteId}/inativar`, { method: 'PATCH' });
        if (!resp.ok) throw new Error(`Falha ao inativar: ${resp.status}`);

        const [respConsultas, respAcomps, respNotas] = await Promise.all([
            fetch(`${API_BASE}/mc/consultas`).catch(() => null),
            fetch(`${API_BASE}/mc/acompanhamentos`).catch(() => null),
            fetch(`${API_BASE}/mc/notas`).catch(() => null)
        ]);

        const consultasAll = respConsultas && respConsultas.ok ? await respConsultas.json().catch(() => []) : [];
        const acompAll = respAcomps && respAcomps.ok ? await respAcomps.json().catch(() => []) : [];
        const notasAll = respNotas && respNotas.ok ? await respNotas.json().catch(() => []) : [];

        const getStatusNome = (c) => c?.statusConsulta?.nomeStatus ?? 'Agendada';
        const agora = new Date();
        const consultasDoPaciente = (consultasAll || []).filter(c => {
            if (!c?.paciente?.id || c.paciente.id !== pacienteId) return false;
            const status = getStatusNome(c);
            const dataConsulta = c?.datahoraConsulta ? new Date(c.datahoraConsulta) : null;
            const isFutura = dataConsulta ? dataConsulta >= agora : true;
            const isPendente = status === 'Agendada' || status === 'Confirmada';
            return isPendente && isFutura;
        });
        const consultaIds = new Set(consultasDoPaciente.map(c => c.id));

        await Promise.all((acompAll || [])
            .filter(a => a?.consulta?.id && consultaIds.has(a.consulta.id))
            .map(a => fetch(`${API_BASE}/mc/acompanhamentos/${a.id}`, { method: 'DELETE' }).catch(() => null))
        );

        await Promise.all((notasAll || [])
            .filter(n => (n?.consulta?.id && consultaIds.has(n.consulta.id)))
            .map(n => fetch(`${API_BASE}/mc/notas/${n.id}`, { method: 'DELETE' }).catch(() => null))
        );

        const delResults = await Promise.all(consultasDoPaciente.map(c =>
            fetch(`${API_BASE}/mc/consultas/${c.id}`, { method: 'DELETE' }).catch(() => null)
        ));
        const deletedCount = delResults.filter(r => r && r.ok).length;

        Swal.fire({
            icon: 'success',
            title: 'Paciente inativado!',
            text: `Consultas pendentes removidas: ${deletedCount}.`,
            showConfirmButton: false,
            timer: 1800
        });
        buscarPacientes();
    } catch (erro) {
        console.error('Erro ao inativar paciente:', erro);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao inativar',
            text: 'Não foi possível inativar o paciente.',
        });
    }
}

async function buscarKPIsPaciente() {
    try {
        const [porcentagemABA, pacientesAtivos, pacientesUltimoTrimestre, agendamentosVencidos] = await Promise.all([
            fetch(`${API_BASE}/mc/pacientes/porcentagem-aba`).then(r => r.json()),
            fetch(`${API_BASE}/mc/pacientes`).then(r => r.json()),
            fetch(`${API_BASE}/mc/pacientes/ultimo-trimestre`).then(r => r.json()),
            fetch(`${API_BASE}/mc/pacientes/agendamentos-vencidos`).then(r => r.json())
        ]);

        // Normaliza retornos para números evitando render de [object Object]
        const pctAba = typeof porcentagemABA === 'number'
            ? porcentagemABA
            : Number((porcentagemABA && typeof porcentagemABA === 'object'
                ? (porcentagemABA.percentual ?? porcentagemABA.valor ?? porcentagemABA.porcentagem)
                : porcentagemABA) || 0);

        const ativosCount = Array.isArray(pacientesAtivos)
            ? pacientesAtivos.length
            : Number(pacientesAtivos ?? 0);

        const ultTrimestreCount = Array.isArray(pacientesUltimoTrimestre)
            ? pacientesUltimoTrimestre.length
            : Number(pacientesUltimoTrimestre ?? 0);

        const vencidosCount = Array.isArray(agendamentosVencidos)
            ? agendamentosVencidos.length
            : Number(agendamentosVencidos ?? 0);

        const format2 = (n) => String(Number.isFinite(n) ? n : 0).padStart(2, '0');

        document.querySelector(".cardKpi:nth-child(1) .kpiNumber").textContent = `${Number.isFinite(pctAba) ? pctAba.toFixed(1) : '0.0'}%`;
        document.querySelector(".cardKpi:nth-child(2) .kpiNumber").textContent = format2(ativosCount);
        document.querySelector(".cardKpi:nth-child(3) .kpiNumber").textContent = format2(ultTrimestreCount);
        document.querySelector(".cardKpi:nth-child(4) .kpiNumber").textContent = format2(vencidosCount);
    } catch (error) {
        console.error('Erro ao buscar KPIs:', error);
    }
}

buscarPacientes();
buscarKPIsPaciente();

// Função para abrir o modal com os dados do paciente
function abrirModalPaciente(idPaciente) {
    document.getElementById('modalBackdrop').style.display = 'flex';

    // Chamada ao endpoint para buscar as informações detalhadas do paciente
    fetch(`${API_BASE}/mc/pacientes/${idPaciente}`)
        .then(response => response.json())
        .then(data => {
            // Exibe o nome e a foto do paciente no modal
            document.getElementById('pacienteNome').textContent = `${data.nome} ${data.sobrenome}`;
            document.getElementById('pacienteFoto').src = data.fotoUrl || '../Assets/perfil.jpeg';

            // Preenche as abas com as informações do paciente
            preencherDetalhes(data);
            preencherCalendario(data.id);
            preencherEvolucoes(data.id);

            // Define a aba "Detalhes" como a aba ativa
            openTab(null, 'detalhes');

            // Atualiza o cabeçalho/semana para garantir domingo–sábado
            atualizarDisplayData(dataInicioAtual);
        })
        .catch(error => {
            console.error("Erro ao buscar dados do paciente:", error);
            alert("Não foi possível carregar as informações do paciente.");
        });
}

// Função para abrir a aba selecionada
function openTab(event, tabId) {
    const tabs = document.querySelectorAll('.content');
    tabs.forEach(tab => tab.classList.remove('show'));

    document.getElementById(tabId).classList.add('show');

    document.querySelectorAll('.tab-btn').forEach(tabBtn => tabBtn.classList.remove('active'));
    if (event) event.currentTarget.classList.add('active');

    // Se a aba Calendário foi ativada, renderiza a semana e tarefas
    if (tabId === 'calendario') {
        atualizarDisplayData(dataInicioAtual);
    }
}

// Função para preencher os detalhes do paciente
function preencherDetalhes(paciente) {
    // Seção Esquerda
    document.getElementById('pacienteFoto').src = paciente.foto || '../Assets/perfil.jpeg';
    document.getElementById('pacienteNome').textContent = paciente.nome ? `${paciente.nome} ${paciente.sobrenome || ''}` : 'Nome não informado';
    document.getElementById('pacienteIdade').textContent = paciente.dataNascimento ? calcularIdade(paciente.dataNascimento) : 'Idade não informada';
    document.getElementById('pacienteCPF').textContent = paciente.cpf ? formatarCPF(paciente.cpf) : 'CPF não informado';

    // Bloco Superior
    document.getElementById('pacienteTelefone').textContent = paciente.telefone ? formatarTelefone(paciente.telefone) : 'Telefone não informado';
    document.getElementById('pacienteCNS').textContent = paciente.cns || 'CNS não informado';
    document.getElementById('pacienteDataNascimento').textContent = new Date(paciente.dataNascimento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) || 'Data de nascimento não informada';

    // Endereço
    if (paciente.endereco) {
        document.getElementById('enderecoCEP').textContent = paciente.endereco.cep || 'CEP não informado';
        document.getElementById('enderecoLogradouro').textContent = paciente.endereco.logradouro || 'Logradouro não informado';
        document.getElementById('enderecoNumero').textContent = paciente.endereco.numero || 'Número não informado';
        document.getElementById('enderecoComplemento').textContent = paciente.endereco.complemento || 'Complemento não informado';
        document.getElementById('enderecoBairro').textContent = paciente.endereco.bairro || 'Bairro não informado';
    } else {
        document.getElementById('enderecoCEP').textContent = 'CEP não informado';
        document.getElementById('enderecoLogradouro').textContent = 'Logradouro não informado';
        document.getElementById('enderecoNumero').textContent = 'Número não informado';
        document.getElementById('enderecoComplemento').textContent = 'Complemento não informado';
        document.getElementById('enderecoBairro').textContent = 'Bairro não informado';
    }

    // Responsável
    if (paciente.responsavel) {
        document.getElementById('responsavelNome').textContent = paciente.responsavel.nome || 'Nome não informado';
        document.getElementById('responsavelSobrenome').textContent = paciente.responsavel.sobrenome || 'Sobrenome não informado';
        document.getElementById('responsavelTelefone').textContent = paciente.responsavel.telefone ? formatarTelefone(paciente.responsavel.telefone) : 'Telefone não informado';
        document.getElementById('responsavelCPF').textContent = paciente.responsavel.cpf ? formatarCPF(paciente.responsavel.cpf) : 'CPF não informado';
    } else {
        document.getElementById('responsavelNome').textContent = 'Nome não informado';
        document.getElementById('responsavelSobrenome').textContent = 'Sobrenome não informado';
        document.getElementById('responsavelTelefone').textContent = 'Telefone não informado';
        document.getElementById('responsavelCPF').textContent = 'CPF não informado';
    }
}

// Função auxiliar para calcular a idade
function calcularIdade(dataNascimento) {
    if (!dataNascimento) return 'Não informada';
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return `${idade} anos`;
}

// Função para preencher o calendário do paciente
function preencherCalendario(pacienteId) {
    currentPacienteId = pacienteId;
    buscarConsultasCliente(pacienteId);
}

// Função para preencher o calendário do paciente
async function preencherEvolucoes(pacienteId) {
    try {
        // Faz a requisição para buscar todas as consultas
        const resposta = await fetch(`${API_BASE}/mc/consultas`);
        if (!resposta.ok) {
            throw new Error(`Erro ao buscar consultas. Status: ${resposta.status}`);
        }

        console.log(pacienteId);
        // Obtém a lista de consultas
        const consultas = await resposta.json();
        console.log("Consultas recebidas:", consultas);

        // Filtra as consultas pelo ID do paciente
        const consultasFiltradas = consultas.filter(consulta => consulta.paciente.id === pacienteId);
        console.log("Consultas filtradas para o paciente:", consultasFiltradas);

        // Verifica o permissionamento do usuário
        const permissaoUsuario = sessionStorage.getItem("PERMISSIONAMENTO_MEDICO");
        if (permissaoUsuario === "supervisor") {
            // Exibe somente consultas visíveis pelo supervisor
            const consultasPermitidas = consultasFiltradas.filter(consulta => {
                // Ajuste aqui a lógica de filtragem por área ou restrição do supervisor
                return consulta.area === sessionStorage.getItem("ESPECIFICACAO_MEDICA");
            });
            console.log("Consultas permitidas para o supervisor:", consultasPermitidas);

            // Chama a função para listar as consultas realizadas
            listarConsultasRealizadas(consultasPermitidas, pacienteId);
        } else if (permissaoUsuario === "Admin") {
            // Se o usuário for 'adm', lista todas as consultas do paciente
            listarConsultasRealizadas(consultasFiltradas, pacienteId);
        } else {
            console.warn("Permissão desconhecida. Nenhuma consulta será exibida.");
        }
    } catch (error) {
        console.error("Erro ao preencher evoluções:", error);
    }
}


// Parte do calendario do paciente

let dataInicioAtual = obterInicioDaSemana(new Date());
let consultasOriginais = [];
let bancoDeDadosFiltrado = [];
let currentPacienteId = null;

// Ao carregar a página, inicialize o calendário
document.addEventListener('DOMContentLoaded', () => {
    atualizarDisplayData(dataInicioAtual);
});


function obterInicioDaSemana(date) {
    // Semana inicia no domingo (0)
    const day = date.getDay();
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - day);
    startDate.setHours(0, 0, 0, 0);
    return startDate;
}

async function buscarConsultasCliente(pacienteId) {
    try {
        const resposta = await fetch(`${API_BASE}/mc/consultas`);
        if (!resposta.ok) throw new Error(`HTTP error! Status: ${resposta.status}`);
        const todasConsultas = await resposta.json();
        // Exclui consultas quando paciente ou médico está inativo
        consultasOriginais = todasConsultas.filter(consulta => {
            const isThisPaciente = consulta?.paciente?.id === pacienteId;
            const pacienteAtivo = consulta?.paciente?.ativo !== false;
            const medicoAtivo = consulta?.medico?.ativo !== false;
            return isThisPaciente && pacienteAtivo && medicoAtivo;
        });
        bancoDeDadosFiltrado = filtrarConsultasPorPermissao();
        atualizarDisplayCalendario(bancoDeDadosFiltrado);
    } catch (error) {
        console.error('Erro ao buscar consultas do paciente:', error);
    }
}

function filtrarConsultasPorPermissao() {
    const permissao = sessionStorage.getItem('PERMISSIONAMENTO_MEDICO');
    const idMedico = parseInt(sessionStorage.getItem('ID_MEDICO'));
    const especificacaoMedica = sessionStorage.getItem('ESPECIFICACAO_MEDICA');

    if (permissao === 'Profissional' && idMedico) {
        return consultasOriginais.filter(consulta => consulta.medico.id === idMedico);
    } else if (permissao === 'Supervisor') {
        return consultasOriginais.filter(consulta => consulta.especificacaoMedica.area === especificacaoMedica);
    } else if (permissao === 'Admin') {
        return consultasOriginais;
    }
    return [];
}

// Função para atualizar o display de dados no calendário do paciente
function atualizarDisplayCalendario(consultasCliente) {
    const colunasTarefasElement = document.getElementById('colunasTarefas');
    colunasTarefasElement.innerHTML = ''; // Limpa o conteúdo existente

    for (let i = 0; i < 7; i++) {
        const diaAtual = new Date(dataInicioAtual);
        diaAtual.setDate(dataInicioAtual.getDate() + i);

        const consultasDoDia = consultasCliente.filter(consulta =>
            consulta.datahoraConsulta.startsWith(formatarData(diaAtual))
        );

        const colunaElement = document.createElement('div');
        colunaElement.className = 'column';

        if (consultasDoDia.length === 0) {
            const noTaskElement = document.createElement('div');
            noTaskElement.className = 'task inactive';
            noTaskElement.innerText = 'Sem tarefas';
            colunaElement.appendChild(noTaskElement);
        } else {
            consultasDoDia.forEach(consulta => {
                const taskElement = document.createElement('div');
                taskElement.className = 'task';
                taskElement.innerText = consulta.descricao;

                taskElement.onclick = () => abrirDetalhesTarefa(consulta);

                colunaElement.appendChild(taskElement);
            });
        }

        colunasTarefasElement.appendChild(colunaElement);
    }

    // Insere botões de exportação para a semana do paciente (CSV / PDF) alinhados na mesma linha do título
    try {
        const diasEl = document.getElementById('dias');
        if (diasEl) {
            // procura a barra que contém o título/contagem de dias
            const headerBar = diasEl.closest('.count-dias') || diasEl.parentNode;
            if (headerBar && !document.getElementById('patient-export-container')) {
                headerBar.classList.add('patient-count-dias');

                const container = document.createElement('div');
                container.id = 'patient-export-container';
                container.className = 'patient-export-container';

                const btnCsv = document.createElement('button');
                btnCsv.id = 'btn-export-week-csv-paciente';
                btnCsv.className = 'patient-export-btn';
                btnCsv.title = 'Baixar Semana (CSV)';
                btnCsv.innerHTML = '<i class="fas fa-file-csv"></i>';
                btnCsv.onclick = () => exportarSemanaPacienteCSV(currentPacienteId);

                const btnPdf = document.createElement('button');
                btnPdf.id = 'btn-export-week-pdf-paciente';
                btnPdf.className = 'patient-export-btn';
                btnPdf.title = 'Salvar PDF';
                btnPdf.innerHTML = '<i class="fas fa-file-pdf"></i>';
                btnPdf.onclick = () => exportarSemanaPacientePDF(currentPacienteId);

                container.appendChild(btnCsv);
                container.appendChild(btnPdf);

                // adiciona container no final da barra, alinhado à direita
                headerBar.appendChild(container);
            }
        }
    } catch (err) {
        console.warn('Não foi possível injetar botões de exportação do paciente:', err);
    }
}

// Exporta a semana atualmente exibida para CSV filtrada pelo paciente atual
function exportarSemanaPacienteCSV(pacienteId) {
    if (!pacienteId) return alert('Paciente não definido para exportação.');
    try {
        const start = new Date(dataInicioAtual);
        const rows = [];
        rows.push(['Data', 'Hora', 'Paciente', 'CPF', 'Profissional', 'Área', 'Status', 'Descrição', 'Duração']);

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const tarefas = bancoDeDadosFiltrado.filter(t => t.datahoraConsulta.startsWith(formatarData(d)));
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
                const rawDur = t.duracaoConsulta ?? t.duracao ?? null;
                let duracao = '';
                if (rawDur) duracao = typeof rawDur === 'number' ? `${rawDur} min` : String(rawDur);
                rows.push([dataStr, horaStr, paciente, cpf, medico, area, status, descricao, duracao]);
            });
        }

        const csvContent = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const stamp = formatarData(new Date(dataInicioAtual)).replace(/-/g, '');
        a.download = `agenda_paciente_${pacienteId}_semana_${stamp}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Erro ao exportar semana CSV do paciente:', err);
    }
}

// Exporta a semana do paciente em uma janela para impressão (PDF via print)
function exportarSemanaPacientePDF(pacienteId) {
    if (!pacienteId) return alert('Paciente não definido para exportação.');
    try {
        const start = new Date(dataInicioAtual);
        let html = `<html><head><title>Agenda Semanal do Paciente</title><style>body{font-family:Arial,Helvetica,sans-serif}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;text-align:left}th{background:#f4f4f4}</style></head><body>`;
        html += `<h2>Agenda Semanal: ${document.getElementById('dias')?.innerText || ''}</h2>`;
        html += `<table><thead><tr><th>Data</th><th>Hora</th><th>Paciente</th><th>Profissional</th><th>Área</th><th>Status</th><th>Descrição</th><th>Duração</th></tr></thead><tbody>`;

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const tarefas = bancoDeDadosFiltrado.filter(t => t.datahoraConsulta.startsWith(formatarData(d)));
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
        if (!w) { alert('Permita popups para gerar o PDF.'); return; }
        w.document.write(html);
        w.document.close();
        setTimeout(() => { w.print(); }, 500);
    } catch (err) {
        console.error('Erro ao gerar PDF da semana do paciente:', err);
    }
}

function abrirDetalhesTarefa(consulta) {
    const dataHora = new Date(consulta.datahoraConsulta);
    const dataFormatada = dataHora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const horaFormatada = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const detalhesDiv = document.getElementById('detalhesTarefa');
    // Render defensivamente — alguns campos podem ser nulos
    const pacienteNome = consulta?.paciente ? `${consulta.paciente.nome || ''} ${consulta.paciente.sobrenome || ''}`.trim() : 'Desconhecido';
    const medicoNome = consulta?.medico ? `${consulta.medico.nome || ''} ${consulta.medico.sobrenome || ''}`.trim() : 'Desconhecido';
    const medicoArea = consulta?.medico?.especificacaoMedica?.area || consulta?.especificacaoMedica?.area || 'Desconhecida';
    const statusNome = consulta?.statusConsulta?.nomeStatus || 'Desconhecido';
    const duracao = consulta?.duracaoConsulta ?? consulta?.duracao ?? '—';

    detalhesDiv.innerHTML = `
        <p><strong>Descrição:</strong> ${consulta.descricao || 'Sem descrição'}</p>
        <p><strong>Data e Hora:</strong> ${dataFormatada} às ${horaFormatada}</p>
        <p><strong>Paciente:</strong> ${pacienteNome}</p>
        <p><strong>Profissional:</strong> ${medicoNome} - ${medicoArea}</p>
        <p><strong>Status:</strong> ${statusNome}</p>
        <p><strong>Duração:</strong> ${duracao}</p>
    `;
    document.getElementById('modalDetalhesTarefa').style.display = 'flex';
}

function fecharModalDetalhes() {
    document.getElementById('modalDetalhesTarefa').style.display = 'none';
}

function atualizarDisplayData(startDate) {
    dataInicioAtual = obterInicioDaSemana(startDate);
    const endDate = new Date(dataInicioAtual);
    endDate.setDate(dataInicioAtual.getDate() + 6);

    const options = { day: '2-digit', month: 'long' };
    const startStr = `${dataInicioAtual.toLocaleDateString('pt-BR', options)} ${dataInicioAtual.getFullYear()}`;
    const endStr = `${endDate.toLocaleDateString('pt-BR', options)} ${endDate.getFullYear()}`;

    document.getElementById('dias').innerText = `${startStr} - ${endStr}`;
    atualizarDiasDaSemana(dataInicioAtual);
}

function atualizarDiasDaSemana(startDate) {
    const diasSemanaElement = document.getElementById('diasSemana');
    diasSemanaElement.innerHTML = '';

    for (let i = 0; i < 7; i++) {
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
    colunasTarefasElement.innerHTML = ''; // Limpa o conteúdo existente

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);

        // Filtra as consultas para o dia atual
        const tasks = bancoDeDadosFiltrado.filter(entry =>
            entry.datahoraConsulta.startsWith(formatarData(currentDate))
        );

        const columnElement = document.createElement('div');
        columnElement.className = 'column';

        // Adiciona as tarefas à coluna
        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task';
            taskElement.innerText = task.descricao;

            // Adiciona o evento de clique para abrir os detalhes
            taskElement.onclick = () => abrirDetalhesTarefa(task);

            columnElement.appendChild(taskElement);
        });

        if (tasks.length === 0) {
            const noTaskElement = document.createElement('div');
            noTaskElement.className = 'task inactive';
            noTaskElement.innerText = 'Sem tarefas';
            columnElement.appendChild(noTaskElement);
        }

        colunasTarefasElement.appendChild(columnElement);
    }
}

function formatarData(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function semanaPassada() {
    dataInicioAtual.setDate(dataInicioAtual.getDate() - 7);
    atualizarDisplayData(dataInicioAtual);
}

function proximaSemana() {
    dataInicioAtual.setDate(dataInicioAtual.getDate() + 7);
    atualizarDisplayData(dataInicioAtual);
}


// Função para inicializar a página e buscar as consultas do paciente específico
async function inicializarPagina(idPaciente) {
    await buscarConsultasCliente(idPaciente);
    atualizarDisplayData(dataInicioAtual);
}

// Parte da evolucao

// Função para listar as consultas realizadas na aba de relatórios
async function listarConsultasRealizadas(consultasCliente, pacienteId) {
    const evolucoesList = document.getElementById('listaEvolucoes');
    evolucoesList.innerHTML = ''; // Limpa a lista antes de preencher

    if (!Array.isArray(consultasCliente)) {
        console.error('Dados de consultas inválidos. Não é um array:', consultasCliente);
        evolucoesList.innerHTML = `<li class="evolucao-item">Nenhuma consulta encontrada.</li>`;
        return;
    }

    if (consultasCliente.length === 0) {
        evolucoesList.innerHTML = `<li class="evolucao-item">Nenhuma consulta realizada.</li>`;
        return;
    }

    try {
        const resposta = await fetch(`${API_BASE}/mc/acompanhamentos`);
        if (!resposta.ok) {
            throw new Error(`Erro ao buscar dados dos acompanhamentos. Status: ${resposta.status}`);
        }
        const acompanhamentos = await resposta.json();

        consultasCliente.forEach((consulta, index) => {
            if (!consulta || !consulta.datahoraConsulta || !consulta.id) {
                console.warn('Consulta inválida no índice', index, consulta);
                return;
            }

            const dataConsulta = new Date(consulta.datahoraConsulta);
            const dataFormatada = dataConsulta.toLocaleDateString('pt-BR');

            const acompanhamento = acompanhamentos.find(a => a.consulta.id === consulta.id);

            const listItem = document.createElement('li');
            listItem.classList.add('evolucao-item');

            let botaoCriar = '';
            let botaoVisualizar = '';
            let botaoAtualizar = '';

            if (acompanhamento) {
                botaoVisualizar = `<button class="botao-visualizar" onclick="abrirModalEvolucao(${consulta.id}, 'visualizar')"><i class="fa fa-eye"></i></button>`;
                botaoAtualizar = `<button class="botao-atualizar" onclick="abrirModalEvolucao(${consulta.id}, 'atualizar', ${pacienteId})"><i class="fas fa-pen"></i></button>`;
            } else {
                botaoCriar = `<button class="btn-detalhes" onclick="abrirModalEvolucao(${consulta.id}, 'criar', ${pacienteId})"><i class="fas fa-notes-medical"></i></button>`;
            }

            listItem.innerHTML = `
                <span>Consulta ${index + 1}: ${dataFormatada}</span>
                <div class="botao-container">
                ${botaoVisualizar}
                ${botaoAtualizar}
                ${botaoCriar}
                </div>
            `;

            evolucoesList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Erro ao carregar os dados dos acompanhamentos:', error);
        evolucoesList.innerHTML = `<li class="evolucao-item">Erro ao carregar consultas.</li>`;
    }
}

// Função para abrir o modal de evolução com diferentes modos
async function abrirModalEvolucao(consultaId, modo, pacienteId) {
    try {
        const resposta = await fetch(`${API_BASE}/mc/acompanhamentos`);
        if (!resposta.ok) {
            throw new Error(`Erro ao buscar dados dos acompanhamentos. Status: ${resposta.status}`);
        }
        console.log("Paciente ID ao abrir modal:", pacienteId);

        const acompanhamentos = await resposta.json();
        const acompanhamentoAtual = acompanhamentos.find(a => a.consulta.id === consultaId);

        const resumoInput = document.getElementById("resumo");
        const relatorioInput = document.getElementById("relatorio");
        const medicoInput = document.getElementById("medico");
        const especificacaoInput = document.getElementById("especificacaoMedica");
        const pacienteInput = document.getElementById("paciente");
        const botaoSalvar = document.querySelector(".buttonEvolucao");
        const botaoFechar = document.getElementById("botao");

        if (modo === "visualizar" && acompanhamentoAtual) {
            resumoInput.value = acompanhamentoAtual.resumo || "";
            relatorioInput.value = acompanhamentoAtual.relatorio || "";
            medicoInput.value = acompanhamentoAtual.consulta.medico.nome || "Não informado";
            especificacaoInput.value = acompanhamentoAtual.consulta.especificacaoMedica.area || "Não informada";
            pacienteInput.value = acompanhamentoAtual.consulta.paciente.nome || "Não informado";

            resumoInput.disabled = true;
            relatorioInput.disabled = true;
            botaoFechar.innerHTML = "Fechar";
            botaoSalvar.setAttribute("onclick", `fecharModalEvolucao()`);
        } else {
            resumoInput.value = acompanhamentoAtual?.resumo || "";
            relatorioInput.value = acompanhamentoAtual?.relatorio || "";
            medicoInput.value = acompanhamentoAtual?.consulta?.medico.nome || "Não informado";
            especificacaoInput.value = acompanhamentoAtual?.consulta?.especificacaoMedica.area || "Não informada";
            pacienteInput.value = acompanhamentoAtual?.consulta?.paciente.nome || "Não informado";

            resumoInput.disabled = false;
            relatorioInput.disabled = false;
            botaoSalvar.style.display = "block";

            // Corrigindo a chamada do método
            botaoSalvar.setAttribute(
                "onclick",
                `adicionarAcompanhamento(${consultaId}, '${modo}', ${acompanhamentoAtual?.id || null}, ${pacienteId})`
            );

            botaoFechar.innerHTML = "Salvar Evolução";
        }

        const modal = document.getElementById("modalEvolucao");
        modal.style.visibility = "visible";
    } catch (error) {
        console.error('Erro ao carregar os dados do acompanhamento:', error);
    }
}

async function adicionarAcompanhamento(idConsulta, modo, idAcompanhamento, pacienteId) {
    const resumo = document.getElementById("resumo").value;
    const relatorio = document.getElementById("relatorio").value;

    const dadosFeedback = {
        resumo: resumo,
        relatorio: relatorio,
        consulta: { id: idConsulta },
        status_consulta: 2
    };

    const url = modo === "criar"
        ? `${API_BASE}/mc/acompanhamentos`
        : `${API_BASE}/mc/acompanhamentos/${idAcompanhamento}`;

    try {
        const resposta = await fetch(url, {
            method: modo === "criar" ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dadosFeedback),
        });

        if (!resposta.ok) {
            const erroTexto = await resposta.text();
            throw new Error(`Erro ao salvar feedback. Status: ${resposta.status}. Detalhes: ${erroTexto}`);
        }

        console.log("Paciente ID ao salvar:", pacienteId);
        fecharModalEvolucao();
        preencherEvolucoes(pacienteId);
    } catch (error) {
        console.error('Erro ao salvar o feedback:', error);
        alert("Erro ao salvar o feedback. Tente novamente.");
    }
}


// Função para fechar o modal
function fecharModalEvolucao() {
    const modal = document.getElementById("modalEvolucao");
    modal.style.visibility = "hidden";
}

// Função para criar um novo relatório
function criarRelatorio(consultaId) {
    abrirModalEvolucao(consultaId, "criar");
}

// Função para visualizar o relatório existente
function visualizarRelatorio(consultaId) {
    abrirModalEvolucao(consultaId, "visualizar");
}

function atualizarRelatorio(consultaId) {
    abrirModalEvolucao(consultaId, "atualizar", acompanhamentoId);
}

// Seleciona elementos
const modalBackdrop = document.getElementById('modalBackdrop');
const closeModalBtn = document.getElementById('closeModal');

// Função para fechar o modal
function fecharModal() {
    modalBackdrop.style.display = 'none';
}

// Eventos para fechar o modal
closeModalBtn.addEventListener('click', fecharModal); // Fechar ao clicar no botão
modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
        fecharModal(); // Fechar ao clicar fora do conteúdo
    }
});



