// Variáveis globais para os gráficos
let graficos = {};

// Função genérica para criar gráficos
function criarGrafico(ctxId, tipo, dados, opcoes = {}) {
    if (graficos[ctxId]) graficos[ctxId].destroy(); // Destroi o gráfico existente, se houver
    const ctx = document.getElementById(ctxId).getContext('2d');
    graficos[ctxId] = new Chart(ctx, { type: tipo, data: dados, options: opcoes });
}

// Função para buscar dados genéricos
async function fetchDados(url, filtros = {}) {
    const queryParams = new URLSearchParams(filtros).toString();
    const fullUrl = queryParams ? `${url}?${queryParams}` : url;

    try {
        const resposta = await fetch(fullUrl);
        if (!resposta.ok) throw new Error(`Erro ao buscar dados: ${resposta.status}`);
        return await resposta.json();
    } catch (error) {
        console.error(`Erro ao buscar dados de ${url}:`, error);
        return null;
    }
}
async function atualizarGraficoRosca(filtros = {}) {
    const url = 'http://localhost:8080/consultas/percentagem-concluidos';
    try {
        // Busca os dados do endpoint com os filtros aplicados
        const dados = await fetchDados(url, filtros);

        console.log('Dados recebidos:', dados);
        console.log('Filtros aplicados:', filtros);

        if (dados && Array.isArray(dados.details)) {
            // Aplicar os filtros diretamente nos detalhes
            const detalhesFiltrados = dados.details.filter(detail => {
                const pacienteMatch = !filtros.pacienteId || detail.pacienteID?.toString() === filtros.pacienteId;
                const medicoMatch = !filtros.medicoId || detail.medicoID?.toString() === filtros.medicoId;
                const especMedicaMatch = !filtros.areaConsultaId || detail.especMedicaID?.toString() === filtros.areaConsultaId;
                const generoMatch = !filtros.generoPaciente || detail.genero?.toLowerCase() === filtros.generoPaciente.toLowerCase();
                const statusConsultaMatch = !filtros.statusId || detail.statusConsultaID?.toString() === filtros.statusId;

                const dataInicioMatch =
                    !filtros.dataInicio || new Date(detail.dataConsulta) >= new Date(filtros.dataInicio);
                const dataFimMatch =
                    !filtros.dataFim || new Date(detail.dataConsulta) <= new Date(filtros.dataFim);

                return pacienteMatch &&
                       medicoMatch &&
                       especMedicaMatch &&
                       generoMatch &&
                       statusConsultaMatch &&
                       dataInicioMatch &&
                       dataFimMatch;
            });

            console.log('Detalhes filtrados:', detalhesFiltrados);

            // Recalcular os valores de realizadas e pendentes com base nos detalhes filtrados
            const realizadas = detalhesFiltrados.filter(detail => detail.statusConsultaID === '2').length; // Concluídas
            const pendentes = detalhesFiltrados.filter(detail => detail.statusConsultaID === '1').length; // Agendadas
            console.log(pendentes)
            const pendentes2 = dados.total
           // const canceladas = detalhesFiltrados.filter(detail => detail.statusConsultaID === "3").length; // canceladas
            console.log(`Concluídas: ${realizadas}, Agendadas: ${pendentes}`);

            // Atualizar o gráfico com os novos valores
            criarGrafico('GraficoRosca', 'doughnut', {
                labels: ['Agendadas','Concluídas'],
                datasets: [{
                    data: [ pendentes2,realizadas],
                    backgroundColor: ['#36A2EB', '#00FF00'],
                }],
            });

            console.log('Gráfico atualizado com sucesso.');
        } else {
            console.log('Nenhum detalhe encontrado nos dados ou o campo "details" não é uma lista.');
        }
    } catch (error) {
        console.error('Erro ao atualizar o gráfico de rosca:', error);
    }
}













async function atualizarGraficoBarraHorizontal(filtros = {}) {
    const url = 'http://localhost:8080/consultas/altas-ultimos-seis-meses'; // URL do endpoint

    try {
        // Busca os dados do back-end com os filtros
        const dados = await fetchDados(url, filtros);

        if (dados) {
            console.log('Dados recebidos:', dados);
            console.log('Filtros aplicados:', filtros);

            // Filtra os dados com base nos filtros aplicados
            const dadosFiltrados = dados.filter(item => {
                return item.details.some(detail => {
                    const pacienteMatch = !filtros.pacienteId || detail.pacienteId?.toString() === filtros.pacienteId;
                    const medicoMatch = !filtros.medicoId || detail.medicoId?.toString() === filtros.medicoId;
                    const especMedicaMatch = !filtros.areaConsultaId || detail.especMedicaId?.toString() === filtros.areaConsultaId;
                    const generoMatch = !filtros.generoPaciente || detail.genero?.toLowerCase() === filtros.generoPaciente.toLowerCase();
                    const statusConsultaMatch = !filtros.statusId || detail.statusConsultaId?.toString() === filtros.statusId;
                    const dataInicioMatch =
                        !filtros.dataInicio || new Date(detail.dataConsulta) >= new Date(filtros.dataInicio);
                    const dataFimMatch =
                        !filtros.dataFim || new Date(detail.dataConsulta) <= new Date(filtros.dataFim);

                    return pacienteMatch &&
                           medicoMatch &&
                           especMedicaMatch &&
                           generoMatch &&
                           statusConsultaMatch &&
                           dataInicioMatch &&
                           dataFimMatch;
                });
            });

            console.log('Dados filtrados:', dadosFiltrados);

            // Mapeia os rótulos e os valores para o gráfico com os dados filtrados
            const labels = dadosFiltrados.map(item => `Mês ${item.mes}`);
            const dataValues = dadosFiltrados.map(item => item.total);

            // Exibe os details no console
            dadosFiltrados.forEach(item => {
                console.log(`Details para Mês ${item.mes}:`, item.details);
            });

            // Cria o gráfico usando a função genérica
            criarGrafico('GraficoBarraHorizontal', 'bar', {
                labels: labels,
                datasets: [{
                    label: 'Consultas por Mês',
                    data: dataValues,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(255, 159, 64, 0.2)',
                        'rgba(255, 205, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(153, 102, 255, 0.2)',
                        'rgba(201, 203, 207, 0.2)'
                    ],
                    borderColor: [
                        'rgb(255, 99, 132)',
                        'rgb(255, 159, 64)',
                        'rgb(255, 205, 86)',
                        'rgb(75, 192, 192)',
                        'rgb(54, 162, 235)',
                        'rgb(153, 102, 255)',
                        'rgb(201, 203, 207)'
                    ],
                    borderWidth: 1
                }]
            }, {
                indexAxis: 'y' // Configura para barras horizontais
            });

            console.log('Gráfico atualizado com sucesso.');
        } else {
            console.warn('Nenhum dado foi retornado para criar o gráfico.');
        }
    } catch (error) {
        console.error('Erro ao atualizar o gráfico de barra horizontal:', error);
    }
}




async function atualizarGraficoBarraDePe(filtros = {}) {
    console.log("Iniciando atualização do gráfico de barras de pé");

    const url = 'http://localhost:8080/consultas/horarios-ultimos-seis-meses';
    try {
        const dados = await fetchDados(url, filtros);

        if (dados) {
            console.log("Dados recebidos:", dados);
            console.log("Filtros aplicados:", filtros);

            // Filtragem dos dados com base nos filtros
            const dadosFiltrados = dados.filter(item => {
                return item.details.some(detail => {
                    const pacienteMatch = !filtros.pacienteId || detail.pacienteId?.toString() === filtros.pacienteId;
                    const medicoMatch = !filtros.medicoId || detail.medicoId?.toString() === filtros.medicoId;
                    const especMedicaMatch = !filtros.areaConsultaId || detail.especMedicaId?.toString() === filtros.areaConsultaId;
                    const generoMatch = !filtros.generoPaciente || detail.genero?.toLowerCase() === filtros.generoPaciente.toLowerCase();
                    const statusConsultaMatch = !filtros.statusId || detail.statusConsultaId?.toString() === filtros.statusId;
                    const dataInicioMatch =
                        !filtros.dataInicio || new Date(detail.dataConsulta) >= new Date(filtros.dataInicio);
                    const dataFimMatch =
                        !filtros.dataFim || new Date(detail.dataConsulta) <= new Date(filtros.dataFim);

                    return pacienteMatch &&
                           medicoMatch &&
                           especMedicaMatch &&
                           generoMatch &&
                           statusConsultaMatch &&
                           dataInicioMatch &&
                           dataFimMatch;
                });
            });

            console.log("Dados filtrados:", dadosFiltrados);

            // Preparação dos dados para o gráfico
            const labels = dadosFiltrados.map(item => `Mês ${item.mes} de ${item.ano}`);
            const agendados = dadosFiltrados.map(item => item.agendados);
            const disponiveis = agendados.map(valor => 300- valor );

            const data = {
                labels: labels,
                datasets: [
                    {
                        label: 'Agendados',
                        data: agendados,
                        backgroundColor: 'rgba(76, 175, 80, 0.6)',
                        borderColor: 'rgba(76, 175, 80, 1)',
                        borderWidth: 1,
                    },
                    {
                        label: 'Disponíveis',
                        data: disponiveis,
                        backgroundColor: 'rgba(255, 193, 7, 0.6)',
                        borderColor: 'rgba(255, 193, 7, 1)',
                        borderWidth: 1,
                    },
                ],
            };

            const opcoes = {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                    },
                },
            };

            // Atualização do gráfico
            criarGrafico('GraficoBarraDePe', 'bar', data, opcoes);
            console.log("Gráfico atualizado com sucesso");
        } else {
            console.error("Falha ao receber os dados para o gráfico");
        }
    } catch (error) {
        console.error("Erro ao atualizar o gráfico de barra de pé:", error);
    }
}



// Função para atualizar gráfico de Linhas
async function atualizarGraficoLinhaFidelizacao(filtros = {}) {
    const url = 'http://localhost:8080/pacientes/conversoes-ultimos-seis-meses';
    try {
        const dados = await fetchDados(url, filtros);

        if (dados) {
            console.log("Dados recebidos:", dados);
            console.log("Filtros aplicados:", filtros);

            // Filtragem dos dados com base nos detalhes
            const dadosFiltrados = dados.map(item => {
                const detalhesFiltrados = item.details.filter(detail => {
                    const pacienteMatch = !filtros.pacienteId || detail.pacienteId?.toString() === filtros.pacienteId;
                    const medicoMatch = !filtros.medicoId || detail.medicoId?.toString() === filtros.medicoId;
                    const especMedicaMatch = !filtros.areaConsultaId || detail.especMedicaId?.toString() === filtros.areaConsultaId;
                    const generoMatch = !filtros.generoPaciente || detail.genero?.toLowerCase() === filtros.generoPaciente.toLowerCase();
                    const statusConsultaMatch = !filtros.statusId || detail.statusConsultaId?.toString() === filtros.statusId;
                    const dataInicioMatch =
                        !filtros.dataInicio || new Date(detail.dataConsulta) >= new Date(filtros.dataInicio);
                    const dataFimMatch =
                        !filtros.dataFim || new Date(detail.dataConsulta) <= new Date(filtros.dataFim);

                    return pacienteMatch &&
                           medicoMatch &&
                           especMedicaMatch &&
                           generoMatch &&
                           statusConsultaMatch &&
                           dataInicioMatch &&
                           dataFimMatch;
                });

                // Recalcula totalConvertidos com base nos detalhes filtrados
                const totalConvertidos = detalhesFiltrados.length;

                return {
                    dataConversao: item.dataConversao,
                    totalConvertidos: totalConvertidos
                };
            }).filter(item => item.totalConvertidos > 0); // Filtra apenas as datas com conversões

            console.log("Dados filtrados:", dadosFiltrados);

            // Preparando os dados para o gráfico
            const labels = dadosFiltrados.map(item => item.dataConversao);
            const valores = dadosFiltrados.map(item => item.totalConvertidos);

            // Criando o gráfico
            criarGrafico('GraficoLinhaFidelizacao', 'line', {
                labels: labels,
                datasets: [{
                    label: 'Conversões',
                    data: valores,
                    borderColor: '#FF5722',
                    fill: false,
                }],
            });

            console.log("Gráfico atualizado com sucesso");
        } else {
            console.error("Falha ao receber os dados para o gráfico");
        }
    } catch (error) {
        console.error("Erro ao atualizar o gráfico de linha de fidelização:", error);
    }
}




async function buscarTabela(filtros = {}) {
    console.log("Iniciando busca de agendamentos...");

    try {
        // Faz a requisição para o endpoint
        const resposta = await fetch("http://localhost:8080/consultas/agendamentosProximos");
        if (!resposta.ok) {
            throw new Error(`Erro HTTP! Status: ${resposta.status}`);
        }

        // Converte a resposta para JSON
        const respostaDados = await resposta.json();
        console.log("Dados recebidos:", respostaDados);

        // Filtragem dos dados com base nos filtros aplicados
        const dadosFiltrados = respostaDados.filter(item => {
            const detalhes = item.details || {};

            const pacienteMatch = !filtros.pacienteId || detalhes.pacienteId?.toString() === filtros.pacienteId;
            const medicoMatch = !filtros.medicoId || detalhes.medicoId?.toString() === filtros.medicoId;
            const especMedicaMatch = !filtros.areaConsultaId || detalhes.especMedicaId?.toString() === filtros.areaConsultaId;
            const generoMatch = !filtros.generoPaciente || detalhes.genero?.toLowerCase() === filtros.generoPaciente.toLowerCase();
            const statusConsultaMatch = !filtros.statusId || detalhes.statusConsultaId?.toString() === filtros.statusId;

            return pacienteMatch && medicoMatch && especMedicaMatch && generoMatch && statusConsultaMatch;
        });

        console.log("Dados filtrados:", dadosFiltrados);

        // Seleciona a tabela e limpa todas as linhas, incluindo cabeçalho
        const tabela = document.getElementById("tableUpcomingAppointments");
        tabela.innerHTML = '';

        // Adiciona o cabeçalho novamente
        const cabecalho = `
            <tr>
                <th>Paciente</th>
                <th>Vencimento</th>
                <th>Especialidade</th>
            </tr>
        `;
        tabela.innerHTML = cabecalho;

        // Adiciona os dados filtrados na tabela
        if (dadosFiltrados.length === 0) {
            tabela.innerHTML += `
                <tr>
                    <td colspan="3" style="text-align: center;">Nenhum agendamento encontrado.</td>
                </tr>
            `;
        } else {
            dadosFiltrados.forEach(item => {
                // Formata a data de vencimento
                const dataObj = new Date(item.dataConsulta);
                const dataFormatada = dataObj.toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                });
                const horarioFormatado = dataObj.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit"
                });

                // Cria uma nova linha para a tabela
                const novaLinha = `
                    <tr>
                        <td>${item.nomePaciente}</td>
                        <td>${dataFormatada} ${horarioFormatado}</td>
                        <td>${item.especialidadeMedico}</td>
                    </tr>
                `;

                tabela.innerHTML += novaLinha;
            });
        }

        console.log("Tabela atualizada com sucesso.");
    } catch (error) {
        console.error("Erro ao buscar agendamentos:", error);
    }
}




// Executa a função ao carregar
console.log("Antes de buscar");
buscarTabela();
console.log("Depois de buscar");
















// Função para inicializar gráficos
async function inicializarGraficos() {
    // Inicializa os gráficos sem filtros
    await atualizarGraficoRosca();
    await atualizarGraficoBarraHorizontal();
    await atualizarGraficoBarraDePe();
    await atualizarGraficoLinhaFidelizacao();
    await buscarTabela()
}

async function aplicarFiltros() {
    const filtros = {
        medicoId: document.getElementById('filtroMedicoS').value,
        pacienteId: document.getElementById('filtroPaciente').value,
        statusId: document.getElementById('filtroStatus').value,
        areaConsultaId: document.getElementById('filtroAreaConsulta').value,
        idadePaciente: document.getElementById('filtroIdade').value,
        generoPaciente: document.getElementById('filtroGenero').value,
        dataInicio: document.getElementById('filtroDataInicio').value,
        dataFim: document.getElementById('filtroDataFim').value,
    };

    // Atualizar todos os gráficos com os filtros aplicados
    await atualizarGraficoRosca(filtros);
    await atualizarGraficoBarraHorizontal(filtros);
    await atualizarGraficoBarraDePe(filtros);
    await atualizarGraficoLinhaFidelizacao(filtros);
    await buscarTabela(filtros)
    fecharModalFiltro();
}

function limparFiltros() {
    document.querySelectorAll('#modalFiltro select, #modalFiltro input').forEach(input => input.value = '');
    inicializarGraficos(); // Exibe gráficos com todos os dados novamente
}

async function preencherCamposDeFiltro() {
    const medicos = await fetchDados('http://localhost:8080/medicos');
    const pacientes = await fetchDados('http://localhost:8080/pacientes');
    const status = await fetchDados('http://localhost:8080/statusConsultas');
    const areas = await fetchDados('http://localhost:8080/especificacoes');

    preencherSelect('filtroMedicoS', medicos, 'id', 'nome');
    preencherSelect('filtroPaciente', pacientes, 'id', 'nome');
    preencherSelect('filtroStatus', status, 'id', 'nomeStatus');
    preencherSelect('filtroAreaConsulta', areas, 'id', 'area');
}


// Função para preencher select com dados
function preencherSelect(elementId, dados, valorKey, textoKey) {
    const select = document.getElementById(elementId);
    select.innerHTML = '<option value="">Todos</option>';
    if (dados && Array.isArray(dados)) {
        dados.forEach(item => {
            select.innerHTML += `<option value="${item[valorKey]}">${item[textoKey]}</option>`;
        });
    }
}

// Função para abrir e fechar modal
function abrirModalFiltro() {
    document.getElementById('modalFiltro').style.display = 'flex';
}

function fecharModalFiltro() {
    document.getElementById('modalFiltro').style.display = 'none';
}

// Inicializar página
(async function inicializarPagina() {
    await preencherCamposDeFiltro(); // Preenche os campos de filtro
    await inicializarGraficos(); // Inicializa gráficos com todos os dados
})();
