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

            // Filtra apenas as consultas que pertencem ao Profissional com o ID especificado
            const consultasMedico = data.filter(consulta => consulta.medico.id === parseInt(idMedico, 10));
            return consultasMedico; // Retorna apenas as consultas do Profissional
        } catch (error) {
            console.error('Erro ao buscar consultas:', error);
            return [];
        }
    }

    // Função para buscar a foto do Profissional
    async function buscarFotoMedico(idMedico) {
        try {
            const response = await fetch(`${API_BASE}/mc/medicos/${idMedico}/foto`);
            if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);
            const fotoData = await response.json();
            return fotoData.url; // Supondo que o URL da foto esteja no campo 'url'
        } catch (error) {
            console.error('Erro ao buscar foto do Profissional:', error);
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

        // Normalize and assign fotoMedico to avoid incorrect relative resolution (e.g., AfterLogin/AfterLogin/...)
        function normalizeFotoPath(foto) {
            if (!foto || foto === 'null') return `${window.location.origin}/AfterLogin/Assets/perfil.jpeg`;
            if (/^https?:\/\//i.test(foto)) return foto;
            if (foto.startsWith('/')) return window.location.origin + foto;
            if (foto.startsWith('.')) {
                const a = document.createElement('a');
                a.href = foto;
                return a.href;
            }
            return `${window.location.origin}/${foto.replace(/^\/+/, '')}`;
        }

        if (userAvatar || userAvatarAdmin) {
            const src = normalizeFotoPath(fotoMedico);
            if (userAvatar) {
                userAvatar.src = src;
                userAvatar.onerror = () => { userAvatar.onerror = null; userAvatar.src = `${window.location.origin}/AfterLogin/Assets/perfil.jpeg`; };
            }
            if (userAvatarAdmin) {
                userAvatarAdmin.src = src;
                userAvatarAdmin.onerror = () => { userAvatarAdmin.onerror = null; userAvatarAdmin.src = `${window.location.origin}/AfterLogin/Assets/perfil.jpeg`; };
            }
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
            // Buscar o número total de médicos
            const respostaTotalMedicos = await fetch(`${API_BASE}/mc/medicos/todos`);
            const listaMedicos = await respostaTotalMedicos.json();
            const totalMedicos = listaMedicos.length;

            // Buscar o número de médicos ativos
            const respostaMedicosAtivos = await fetch(`${API_BASE}/mc/medicos`);
            const listaMedicosAtivos = await respostaMedicosAtivos.json();
            const medicosAtivos = listaMedicosAtivos.length;

            const respostaPacientesAtivos = await fetch(`${API_BASE}/mc/pacientes`);
            const listaPacientesAtivos = await respostaPacientesAtivos.json()
            const pacientesAtivos = listaPacientesAtivos.length

            const respostaPacientes = await fetch(`${API_BASE}/mc/pacientes/todos`);
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
        // Datas de referência
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const agora = new Date(); // Para calcular "restantes" a partir deste momento

        const diaDaSemana = hoje.getDay();
        const diasParaDomingo = 7 - diaDaSemana; // Calcula quantos dias faltam para o fim da semana

        const fimDaSemana = new Date(hoje);
        fimDaSemana.setDate(hoje.getDate() + diasParaDomingo);

        // Helper para status com fallback quando statusConsulta for null
        const getStatusNome = (c) => c?.statusConsulta?.nomeStatus ?? 'Agendada';

        // Filtra consultas para hoje (qualquer status)
        const consultasHoje = consultas.filter(c => {
            const dataConsulta = new Date(c.datahoraConsulta);
            dataConsulta.setHours(0, 0, 0, 0);
            return dataConsulta.getTime() === hoje.getTime();
        }).length;

        // Consultas RESTANTES na semana: apenas status Agendada e a partir de agora até o fim da semana
        const consultasSemana = consultas.filter(c => {
            const dataConsulta = new Date(c.datahoraConsulta);
            const status = getStatusNome(c);
            return status === 'Agendada' && dataConsulta >= agora && dataConsulta <= fimDaSemana;
        }).length;

        const consultasMarcadas = consultas.filter(c => getStatusNome(c) === 'Agendada').length;
        const consultasConcluidas = consultas.filter(c => getStatusNome(c) === 'Atendida').length;
        const consultasCanceladas = consultas.filter(c => getStatusNome(c) === 'Cancelada').length;

        document.getElementById('consultasHoje').textContent = consultasHoje;
        document.getElementById('consultasMarcadas').textContent = consultasMarcadas;
        document.getElementById('consultasConcluidas').textContent = consultasConcluidas;
        document.getElementById('consultasCanceladas').textContent = consultasCanceladas;

        // Atualiza o número de consultas restantes na semana
        document.getElementById('consultasRestantesSemana').textContent = consultasSemana;
    }
    // Utilitário: filtra consultas por área de fono (case-insensitive)
    function filtrarAreaFono(consultas) {
        return consultas.filter(c => {
            const area = c.medico?.especificacaoMedica?.area || c.especificacaoMedica?.area || '';
            return typeof area === 'string' && area.toLowerCase().includes('fono');
        });
    }



    // Atualizar tabela de agenda (somente agendamentos de hoje, agrupados por horário)
    async function atualizarAgenda(consultas) {
        const agendaBody = document.getElementById('agenda-body');
        if (!agendaBody) return;
        agendaBody.innerHTML = '';

        // Normaliza datas para comparar apenas o dia
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const isHoje = (d) => {
            const dt = new Date(d);
            dt.setHours(0, 0, 0, 0);
            return dt.getTime() === hoje.getTime();
        };

        // Filtra apenas consultas do dia de hoje com status Agendada (trata status null como 'Agendada')
        const consultasHoje = consultas
            .filter(c => c && c.datahoraConsulta && isHoje(c.datahoraConsulta))
            .filter(c => (c?.statusConsulta?.nomeStatus ?? 'Agendada') === 'Agendada')
            .sort((a, b) => new Date(a.datahoraConsulta) - new Date(b.datahoraConsulta));

        if (consultasHoje.length === 0) {
            const vazio = document.createElement('tr');
            vazio.innerHTML = `<td colspan="4">Sem agendamentos para hoje.</td>`;
            agendaBody.appendChild(vazio);
            return;
        }

        // Agrupa por hora cheia (HH:00)
        const grupos = new Map();
        for (const c of consultasHoje) {
            const dt = new Date(c.datahoraConsulta);
            const horaCabecalho = String(dt.getHours()).padStart(2, '0') + ':00';
            if (!grupos.has(horaCabecalho)) grupos.set(horaCabecalho, []);
            grupos.get(horaCabecalho).push(c);
        }

        // Renderiza em ordem crescente de horário
        const horasOrdenadas = Array.from(grupos.keys()).sort((a, b) => a.localeCompare(b));
        for (const hora of horasOrdenadas) {
            // Linha separadora do horário
            const sep = document.createElement('tr');
            sep.className = 'time-separator';
            sep.innerHTML = `<td colspan="4"><strong>${hora}</strong></td>`;
            agendaBody.appendChild(sep);

            // Linhas das consultas do horário
            for (const consulta of grupos.get(hora)) {
                const row = document.createElement('tr');
                const horaExata = new Date(consulta.datahoraConsulta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                // Build cells: horario, paciente, status, acoes
                const tdHora = document.createElement('td'); tdHora.textContent = horaExata;
                const tdPaciente = document.createElement('td'); tdPaciente.textContent = `${consulta.paciente?.nome || ''} ${consulta.paciente?.sobrenome || ''}`;
                const tdMedico = document.createElement('td');
                tdMedico.textContent = `${consulta.medico?.nome || ''} ${consulta.medico?.sobrenome || ''}`.trim();
                const tdStatus = document.createElement('td');
                // create a dedicated element for the status text and a separate container for action buttons
                const spanStatusText = document.createElement('span');
                spanStatusText.className = 'status-text';
                // Show 'Agendada' when status is null so items remain visible
                spanStatusText.textContent = consulta.statusConsulta?.nomeStatus ?? 'Agendada';
                const divStatusActions = document.createElement('div');
                divStatusActions.className = 'status-actions';
                tdStatus.appendChild(spanStatusText);
                tdStatus.appendChild(divStatusActions);

                // Only show action buttons for 'Agendada' appointments (treat null status as 'Agendada')
                if ((consulta?.statusConsulta?.nomeStatus ?? 'Agendada') === 'Agendada') {
                    const btnAtendido = document.createElement('button');
                    btnAtendido.className = 'btn-status atendido';
                    btnAtendido.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
                    btnAtendido.title = 'Atendida';
                    btnAtendido.setAttribute('aria-label', 'Atendida');

                    const btnDesmarcado = document.createElement('button');
                    btnDesmarcado.className = 'btn-status desmarcado';
                    btnDesmarcado.innerHTML = '<i class="fa-solid fa-ban" aria-hidden="true"></i>';
                    btnDesmarcado.title = 'Cancelada';
                    btnDesmarcado.setAttribute('aria-label', 'Cancelada');

                    const btnFalta = document.createElement('button');
                    btnFalta.className = 'btn-status falta';
                    btnFalta.innerHTML = '<i class="fa-solid fa-user-clock" aria-hidden="true"></i>';
                    btnFalta.title = 'Faltou';
                    btnFalta.setAttribute('aria-label', 'Faltou');

                    // append buttons into the dedicated actions container so status text stays separate
                    divStatusActions.appendChild(btnAtendido);
                    divStatusActions.appendChild(btnDesmarcado);
                    divStatusActions.appendChild(btnFalta);

                    // Attach listeners (map to backend table: 3=Atendida, 4=Cancelada, 5=Faltou)
                    btnAtendido.addEventListener('click', async () => {
                        await atualizarStatusConsulta(consulta.id, 3, tdStatus); // 3 = Atendida
                    });

                    btnDesmarcado.addEventListener('click', async () => {
                        await atualizarStatusConsulta(consulta.id, 4, tdStatus); // 4 = Cancelada
                    });

                    btnFalta.addEventListener('click', async () => {
                        await atualizarStatusConsulta(consulta.id, 5, tdStatus); // 5 = Faltou
                    });
                }

                row.appendChild(tdHora);
                row.appendChild(tdPaciente);
                row.appendChild(tdMedico);
                row.appendChild(tdStatus);
                agendaBody.appendChild(row);
            }
        }
    }

    // Update status of a consulta via PATCH and update UI
    async function atualizarStatusConsulta(consultaId, statusId, tdStatusElement) {
        // disable buttons while working (they are inside the status cell)
        const buttons = tdStatusElement.querySelectorAll('button');
        buttons.forEach(b => b.disabled = true);

        try {
            // Many backends expect the parameter named 'status' (not 'statusId').
            // Send as query param `status` and handle empty/no-body responses defensively.
            // Send both query params to be tolerant to backend variations (some expect 'status',
            // others expect 'statusId'). If backend requires JSON body instead, adjust accordingly.
            const resp = await fetch(`${API_BASE}/mc/consultas/${consultaId}/status?statusId=${statusId}&status=${statusId}`, {
                method: 'PATCH'
            });

            if (!resp.ok) {
                const txt = await resp.text().catch(() => '');
                throw new Error(`Status update failed: ${resp.status} ${txt}`);
            }

            // Read response text and parse only if non-empty to avoid JSON parse errors
            const respText = await resp.text().catch(() => '');
            let updated = null;
            if (respText && respText.trim().length > 0) {
                try { updated = JSON.parse(respText); } catch (e) { updated = null; }
            }

            // Update status cell text (use returned object if available)
            const novoStatus = updated && updated.statusConsulta && updated.statusConsulta.nomeStatus
                ? updated.statusConsulta.nomeStatus
                : (statusId === 3 ? 'Atendida' : statusId === 4 ? 'Cancelada' : statusId === 5 ? 'Faltou' : (statusId === 2 ? 'Confirmada' : 'Agendada'));
            // update the status text span and remove the actions container
            const span = tdStatusElement.querySelector('.status-text');
            const actions = tdStatusElement.querySelector('.status-actions');
            if (span) span.textContent = novoStatus;
            if (actions) actions.remove();

            // Show success alert
            if (window.Swal) {
                Swal.fire({ icon: 'success', title: 'Atualizado', text: 'Status da consulta atualizado.' });
            } else {
                alert('Status da consulta atualizado.');
            }
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            buttons.forEach(b => b.disabled = false);
            if (window.Swal) {
                Swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível atualizar o status.' });
            } else {
                alert('Não foi possível atualizar o status.');
            }
        }
    }

    // Atualizar anotações de consultas concluídas
    async function atualizarAnotacoes(consultas) {
        const concluidasList = document.getElementById('concluidas-list');
        if (!concluidasList) return;
        concluidasList.innerHTML = ''; // Limpa a lista

        consultas
            .filter(c => c?.statusConsulta?.nomeStatus === 'Atendida')
            .forEach(consulta => {
                const pacienteNome = consulta?.paciente ? `${consulta.paciente.nome || ''} ${consulta.paciente.sobrenome || ''}`.trim() : 'Desconhecido';
                const hora = consulta?.datahoraConsulta ? new Date(consulta.datahoraConsulta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                const li = document.createElement('li');
                li.innerHTML = `<h3>${pacienteNome} - ${hora}</h3>`;
                li.addEventListener('click', () => showModal(pacienteNome, consulta?.descricao || 'Sem anotações.'));
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
        const consultasMarcadas = consultas.filter(c => c?.statusConsulta?.nomeStatus === 'Agendada').length;
        const consultasConcluidas = consultas.filter(c => c?.statusConsulta?.nomeStatus === 'Atendida').length;
        const consultasCanceladas = consultas.filter(c => c?.statusConsulta?.nomeStatus === 'Cancelada').length;

        const canvas = document.getElementById('consultasChart');
        if (!canvas) {
            console.warn('Canvas de gráfico não encontrado.');
            return;
        }
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Agendadas', 'Atendidas', 'Canceladas'],
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
    const idMedico = sessionStorage.getItem('ID_MEDICO'); // Pega o ID do Profissional armazenado no sessionStorage
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
                // Atualiza painel do dia (todas as consultas de hoje) e gráfico geral
                atualizarAgenda(todas);
                atualizarGrafico(todas);
            } else {
                console.error('Falha ao buscar consultas para gráfico admin. Status:', resp.status);
            }
        } catch (e) { console.warn('Falha ao carregar gráfico geral admin', e); }
    } else if (nivelPermissaoGlobal && nivelPermissaoGlobal.toLowerCase().includes('supervi')) {
        // Supervisor: mostrar no Painel do Dia apenas consultas da área de Fono para hoje
        try {
            const resp = await fetch(`${API_BASE}/mc/consultas`);
            if (resp.ok) {
                const todas = await resp.json();
                const apenasFono = filtrarAreaFono(todas);
                atualizarAgenda(apenasFono);
                // Opcional: refletir também no gráfico (caso deseje, ative a linha abaixo)
                // atualizarGrafico(apenasFono);
            } else {
                console.error('Falha ao buscar consultas para supervisor. Status:', resp.status);
            }
        } catch (e) { console.warn('Falha ao carregar consultas para supervisor', e); }
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
