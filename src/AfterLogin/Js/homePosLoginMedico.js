document.addEventListener('DOMContentLoaded', async () => {
    const nivelPermissaoGlobal = sessionStorage.getItem('PERMISSIONAMENTO_MEDICO');
    // Define base da API (ajusta para localhost em dev)
    const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : '';

    // Função para buscar todas as consultas e filtrar pelo ID do médico
    async function buscarConsultas(idMedico) {
        try {
            const response = await fetch(`${API_BASE}/mc/consultas`); // Busca todas as consultas
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
            const response = await fetch(`/mc/medicos/${idMedico}/foto`);
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
    const nomeMedico = sessionStorage.getItem('NOME_MEDICO');
    const sobrenomeMedico = sessionStorage.getItem('SOBRENOME_MEDICO');
    const fotoMedico = sessionStorage.getItem('FOTO');
    const nivelPermissao = sessionStorage.getItem('PERMISSIONAMENTO_MEDICO');
    const especificacao = sessionStorage.getItem('ESPECIFICACAO_MEDICA');
    const userAvatar = document.getElementById('userAvatar');
    const userAvatarAdmin = document.getElementById('userAvatarAdmin');

    if (nomeMedico) {
        document.querySelectorAll('.nome-medico').forEach(el => {
            el.textContent = `${nomeMedico} ${sobrenomeMedico || ''}`.trim();
        });
    }

    if (fotoMedico && fotoMedico !== 'null') {
        if (userAvatar) userAvatar.src = fotoMedico;
        if (userAvatarAdmin) userAvatarAdmin.src = fotoMedico;
    }

    if (nivelPermissao) {
        const espec = especificacao && especificacao !== 'null' ? especificacao : 'Desconhecido';
        document.querySelectorAll('.especialidade').forEach(el => {
            el.textContent = `${nivelPermissao} | ${espec}`;
        });
    }
}

// KPIs ADMIN (substitui KPIs do médico quando permissão for Admin)
async function buscarKPIsAdmin() {
    try {
    const respostaTotalMedicos = await fetch(`${API_BASE}/mc/medicos`);
        const listaMedicos = await respostaTotalMedicos.json();
        const totalMedicos = listaMedicos.length;

        const medicosAtivos = listaMedicos.filter(medico => medico.ativo).length;

    const respostaPacientesAtivos = await fetch(`${API_BASE}/mc/pacientes/ativos`);
        const pacientesAtivos = await respostaPacientesAtivos.json();

    const respostaPacientes = await fetch(`${API_BASE}/mc/pacientes`);
        const pacientes = await respostaPacientes.json();
        const totalPacientes = pacientes.length;

        const formatarNumero = (numero) => numero.toString().padStart(2, '0');

        const elTotalMedicos = document.getElementById('kpiTotalMedicos');
        const elMedicosAtivos = document.getElementById('kpiMedicosAtivos');
        const elTotalPacientes = document.getElementById('kpiTotalPacientes');
        const elPacientesAtivos = document.getElementById('kpiPacientesAtivos');

        if (elTotalMedicos) elTotalMedicos.textContent = formatarNumero(totalMedicos);
        if (elMedicosAtivos) elMedicosAtivos.textContent = formatarNumero(medicosAtivos);
        if (elTotalPacientes) elTotalPacientes.textContent = formatarNumero(totalPacientes);
        if (elPacientesAtivos) elPacientesAtivos.textContent = formatarNumero(pacientesAtivos);
    } catch (erro) {
        console.error('Erro ao buscar os dados dos KPIs admin:', erro);
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

        const canvas = document.getElementById('consultasChart');
        if(!canvas){
            console.warn('Canvas de gráfico não encontrado.');
            return;
        }
        const ctx = canvas.getContext('2d');
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
    atualizarNomeEFotoMedico();

    // Verifica se é Admin para alternar KPIs
    if (nivelPermissaoGlobal === 'Admin') {
        // Mostrar container admin e esconder do médico
        const medicoKpis = document.getElementById('medicoKpis');
        const adminKpis = document.getElementById('adminKpis');
        if (medicoKpis) medicoKpis.style.display = 'none';
        if (adminKpis) adminKpis.style.display = 'flex';
        buscarKPIsAdmin();
        // Carregar gráfico geral para admin usando todas as consultas
        try {
            const resp = await fetch(`${API_BASE}/mc/consultas`);
            if (resp.ok) {
                const todas = await resp.json();
                console.log('Consultas (admin) carregadas:', todas.length);
                atualizarGrafico(todas);
            } else {
                console.error('Falha ao buscar consultas para gráfico admin. Status:', resp.status);
            }
        } catch(e) { console.warn('Falha ao carregar gráfico geral admin', e); }
    } else {
        if (idMedico) {
            const consultas = await buscarConsultas(idMedico); // Busca os dados das consultas do backend para o médico específico
            atualizarKPIs(consultas); // Atualiza os KPIs
            atualizarAgenda(consultas); // Preenche a tabela de agenda
            atualizarAnotacoes(consultas); // Preenche a lista de anotações
            atualizarGrafico(consultas); // Atualiza o gráfico de desempenho
        } else {
            console.error('ID do médico não encontrado no sessionStorage.');
        }
    }
});