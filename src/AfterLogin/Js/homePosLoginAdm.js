const idMedico = sessionStorage.getItem('ID_MEDICO');
const nivelPermissao = sessionStorage.getItem('PERMISSIONAMENTO_MEDICO');
const especificacao = sessionStorage.getItem('ESPECIFICACAO_MEDICA');

const ctx = document.getElementById('graficoGeral').getContext('2d');

// Configuração inicial do gráfico
const graficoGeral = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [
            {
                label: 'Pacientes',
                data: [],
                backgroundColor: '#ffcc00'
            },
            {
                label: 'Médicos',
                data: [],
                backgroundColor: '#006400'
            },
            {
                label: 'Agendamento',
                data: [],
                backgroundColor: '#00cc66'
            }
        ]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
        },
        scales: {
            y: { beginAtZero: true }
        }
    }
});

// Função para buscar dados do gráfico
function fetchGraficoGeralData() {
    fetch('http://localhost:8080/medicos/graficoGeral')
        .then(response => response.json())
        .then(data => {
            // Se o usuário for supervisor, filtra os dados pela especificação
            if (nivelPermissao === 'Supervisor') {
                data = data.filter(item => item.especializacao === especificacao);
            }

            const especializacoes = data.map(item => item.especializacao);
            const pacientes = data.map(item => item.pacientes);
            const medicos = data.map(item => item.medicos);
            const agendamentos = data.map(item => item.consultas);

            graficoGeral.data.labels = especializacoes;
            graficoGeral.data.datasets[0].data = pacientes;
            graficoGeral.data.datasets[1].data = medicos;
            graficoGeral.data.datasets[2].data = agendamentos;

            graficoGeral.update();
        })
        .catch(error => console.error('Erro ao buscar dados do gráfico:', error));
}

// Manipulação do calendário
const calendarDays = document.getElementById('calendarDays');
const monthYear = document.getElementById('monthYear');
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');

let date = new Date();

const calendarioTitulo = document.getElementById('calendarioTitulo'); // Altere 'calendarioTitulo' para o ID correto

function renderCalendar() {
    calendarDays.innerHTML = '';
    monthYear.innerText = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

     // Altera o título baseado no nível de permissão
     if (nivelPermissao === 'Supervisor') {
        calendarioTitulo.innerHTML = 'Selecione o dia que você quer ver na sua <span>agenda</span>:'; // Define o novo título com span
    } else {
        calendarioTitulo.innerHTML = 'Selecione uma data para agendar uma <span>consulta</span>:'; // Título padrão para outros níveis
    }

    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const lastDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        calendarDays.innerHTML += '<div></div>';
    }

    for (let i = 1; i <= lastDate; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.innerText = i;
        dayDiv.addEventListener('click', () => selectDay(dayDiv));
        calendarDays.appendChild(dayDiv);
    }
}

function selectDay(element) {
    const selected = document.querySelector('.calendar-days .selected');
    if (selected) {
        selected.classList.remove('selected');
    }
    element.classList.add('selected');

    const diaSelecionado = element.innerText.padStart(2, '0');
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dataCompleta = `${ano}-${mes}-${diaSelecionado}`;
    sessionStorage.setItem('DIA_CONSULTA', dataCompleta);

    if (nivelPermissao === 'Admin') {
        window.location.href = 'addAgendamento.html';
    } else if (nivelPermissao === 'Supervisor') {
        window.location.href = 'calendario.html';  // Link para visualização de consultas
    }
}

prevMonth.addEventListener('click', () => {
    date.setMonth(date.getMonth() - 1);
    renderCalendar();
});

nextMonth.addEventListener('click', () => {
    date.setMonth(date.getMonth() + 1);
    renderCalendar();
});

renderCalendar();

async function buscarKPIsMedico() {
    try {
        // Buscar o número total de médicos
        const respostaTotalMedicos = await fetch('http://localhost:8080/medicos');
        const listaMedicos = await respostaTotalMedicos.json();
        const totalMedicos = listaMedicos.length;

        // Buscar o número de médicos ativos
        const medicosAtivos = listaMedicos.filter(medico => medico.ativo).length;

        const respostaPacientesAtivos = await fetch("http://localhost:8080/pacientes/ativos");
        const pacientesAtivos = await respostaPacientesAtivos.json();

        // Buscar o número total de pacientes ativos
        const respostaPacientes = await fetch("http://localhost:8080/pacientes");
        const pacientes = await respostaPacientes.json();
        const totalpacientes = pacientes.length;

        // Função para adicionar zero à esquerda se necessário
        const formatarNumero = (numero) => numero.toString().padStart(2, '0');

        // Atualizar os valores nos elementos HTML, com zero à esquerda
        document.querySelector('.cardKpi:nth-child(1) .kpiNumber').textContent = formatarNumero(totalMedicos);
        document.querySelector('.cardKpi:nth-child(2) .kpiNumber').textContent = formatarNumero(medicosAtivos);
        document.querySelector('.cardKpi:nth-child(3) .kpiNumber').textContent = formatarNumero(totalpacientes);
        document.querySelector('.cardKpi:nth-child(4) .kpiNumber').textContent = formatarNumero(pacientesAtivos);

    } catch (erro) {
        console.error('Erro ao buscar os dados dos KPIs:', erro);
    }
}


function atualizarNomeEFotoMedico() {
    const nomeMedico = sessionStorage.getItem('NOME_MEDICO'); // Pega o nome do médico
    const sobrenomeMedico = sessionStorage.getItem('SOBRENOME_MEDICO'); // Pega o sobrenome do médico
    const fotoMedico = sessionStorage.getItem('FOTO');
    var userAvatar = document.getElementById("avatar");

    console.log(fotoMedico)

    if (nomeMedico) {
        document.querySelector('.nome-medico').textContent = `${nomeMedico} ${sobrenomeMedico}`;
    }

    if (fotoMedico != 'null') {
        userAvatar.src = fotoMedico;
    }

    if (nivelPermissao && especificacao) {
        document.querySelector('.especialidade').textContent = `${nivelPermissao} | ${especificacao}`;
    }
}

function gerenciarBotaoEditar() {
    const editProfileButton = document.getElementById("editProfile");

    if (nivelPermissao === 'Admin') {
        editProfileButton.style.display = 'block'; 
        editProfileButton.addEventListener('click', function() {
            window.location.href = 'atualizarColaborador.html?id=' + idMedico; // Redireciona para a página de atualização
        });
    } else {
        editProfileButton.style.display = 'none'; // Esconde o botão se não for Admin
    }
}

// Funções auxiliares para carregar dados
if (idMedico) {
    fetchGraficoGeralData();
    atualizarNomeEFotoMedico();
    buscarKPIsMedico();
    gerenciarBotaoEditar()
} else {
    console.error('ID do médico não encontrado no sessionStorage.');
}
