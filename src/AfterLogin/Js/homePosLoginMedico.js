document.addEventListener('DOMContentLoaded', async () => {
    // Função para buscar todas as consultas e filtrar pelo ID do médico
    async function buscarConsultas(idMedico) {
        try {
            const response = await fetch(`http://localhost:8080/consultas`); // Busca todas as consultas
            if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);
            const data = await response.json();

            // Filtra apenas as consultas que pertencem ao médico com o ID especificado
            const consultasMedico = data.filter(consulta => consulta.medico.id === parseInt(idMedico, 10));
            return consultasMedico; // Retorna apenas as consultas do médico
        } catch (error) {
            console.error('Erro ao buscar consultas:', error);
            return [];
        }
    }

    // Função para buscar a foto do médico
    async function buscarFotoMedico(idMedico) {
        try {
            const response = await fetch(`http://localhost:8080/medicos/${idMedico}/foto`);
            if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);
            const fotoData = await response.json();
            return fotoData.url; // Supondo que o URL da foto esteja no campo 'url'
        } catch (error) {
            console.error('Erro ao buscar foto do médico:', error);
            return null;
        }
    }



  // Função para buscar e exibir o nome do médico do sessionStorage
function atualizarNomeEFotoMedico() {
    const nomeMedico = sessionStorage.getItem('NOME_MEDICO'); // Pega o nome do médico
    const sobrenomeMedico = sessionStorage.getItem('SOBRENOME_MEDICO'); // Pega o sobrenome do médico
    const fotoMedico = sessionStorage.getItem('FOTO');
    const nivelPermissao = sessionStorage.getItem('PERMISSIONAMENTO_MEDICO');
    const especificacao = sessionStorage.getItem('ESPECIFICACAO_MEDICA');
    var userAvatar = document.getElementById("userAvatar");

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

// Atualizar KPIs
async function atualizarKPIs(consultas) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const diaDaSemana = hoje.getDay();
    const diasParaDomingo = 7 - diaDaSemana; // Calcula quantos dias faltam para o fim da semana

    const fimDaSemana = new Date(hoje);
    fimDaSemana.setDate(hoje.getDate() + diasParaDomingo);

    // Filtra consultas para hoje
    const consultasHoje = consultas.filter(c => {
        const dataConsulta = new Date(c.datahoraConsulta);
        dataConsulta.setHours(0, 0, 0, 0);
        return dataConsulta.getTime() === hoje.getTime();
    }).length;

    // Filtra consultas restantes na semana
    const consultasSemana = consultas.filter(c => {
        const dataConsulta = new Date(c.datahoraConsulta);
        return dataConsulta >= hoje && dataConsulta <= fimDaSemana;
    }).length;

    const consultasMarcadas = consultas.filter(c => c.statusConsulta.nomeStatus === 'Agendada').length;
    const consultasConcluidas = consultas.filter(c => c.statusConsulta.nomeStatus === 'Realizada').length;
    const consultasCanceladas = consultas.filter(c => c.statusConsulta.nomeStatus === 'Cancelada').length;

    document.getElementById('consultasHoje').textContent = consultasHoje;
    document.getElementById('consultasMarcadas').textContent = consultasMarcadas;
    document.getElementById('consultasConcluidas').textContent = consultasConcluidas;
    document.getElementById('consultasCanceladas').textContent = consultasCanceladas;

    // Atualiza o número de consultas restantes na semana
    document.getElementById('consultasRestantesSemana').textContent = consultasSemana;
}



    // Atualizar tabela de agenda
    async function atualizarAgenda(consultas) {
        const agendaBody = document.getElementById('agenda-body');
        agendaBody.innerHTML = ''; // Limpa a tabela

        consultas.filter(c => c.statusConsulta.nomeStatus === 'Agendada').forEach(consulta => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(consulta.datahoraConsulta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>${consulta.paciente.nome} ${consulta.paciente.sobrenome}</td>
                <td>${consulta.statusConsulta.nomeStatus}</td>
            `;
            agendaBody.appendChild(row);
        });
    }

    // Atualizar anotações de consultas concluídas
    async function atualizarAnotacoes(consultas) {
        const concluidasList = document.getElementById('concluidas-list');
        concluidasList.innerHTML = ''; // Limpa a lista

        consultas.filter(c => c.statusConsulta.nomeStatus === 'Realizada').forEach(consulta => {
            const li = document.createElement('li');
            li.innerHTML = `<h3>${consulta.paciente.nome} - ${new Date(consulta.datahoraConsulta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h3>`;
            li.addEventListener('click', () => showModal(consulta.paciente.nome, consulta.descricao || 'Sem anotações.'));
            concluidasList.appendChild(li);
        });
    }

    // Função para exibir modal de anotações
    function showModal(paciente, anotacao) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');

        modalTitle.textContent = `Anotação para ${paciente}`;
        modalMessage.textContent = anotacao;

        modal.style.display = 'block';
    }

    // Fechar o modal
    const closeBtn = document.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
        document.getElementById('modal').style.display = 'none';
    });

    window.onclick = function (event) {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };

    // Atualizar gráfico de desempenho
    async function atualizarGrafico(consultas) {
        const consultasMarcadas = consultas.filter(c => c.statusConsulta.nomeStatus === 'Agendada').length;
        const consultasConcluidas = consultas.filter(c => c.statusConsulta.nomeStatus === 'Realizada').length;
        const consultasCanceladas = consultas.filter(c => c.statusConsulta.nomeStatus === 'Cancelada').length;

        const ctx = document.getElementById('consultasChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Agendadas', 'Realizadas', 'Canceladas'],
                datasets: [{
                    label: 'Consultas',
                    data: [consultasMarcadas, consultasConcluidas, consultasCanceladas],
                    backgroundColor: ['#388E3C', '#4CAF50', '#D32F2F']
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Inicialização
    const idMedico = sessionStorage.getItem('ID_MEDICO'); // Pega o ID do médico armazenado no sessionStorage
    console.log(idMedico);
    if (idMedico) {
        const consultas = await buscarConsultas(idMedico); // Busca os dados das consultas do backend para o médico específico
        atualizarKPIs(consultas); // Atualiza os KPIs
        atualizarAgenda(consultas); // Preenche a tabela de agenda
        atualizarAnotacoes(consultas); // Preenche a lista de anotações
        atualizarGrafico(consultas); // Atualiza o gráfico de desempenho
        atualizarNomeEFotoMedico(); // Atualiza o nome do médico do sessionStorage
    } else {
        console.error('ID do médico não encontrado no sessionStorage.');
    }
});