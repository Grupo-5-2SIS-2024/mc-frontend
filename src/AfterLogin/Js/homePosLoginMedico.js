document.addEventListener('DOMContentLoaded', async () => {
    // Dia selecionado para o Painel do Dia (default: hoje)
    let painelDiaSelecionado = new Date();
    painelDiaSelecionado.setHours(0, 0, 0, 0);
    // Filtro de visualização de terapia (ABA | Convencional). Default alinhado ao calendário
    let filtroTerapia = 'ABA';
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



    // Atualizar tabela de agenda (agendamentos do dia selecionado, agrupados por horário)
    async function atualizarAgenda(consultas, diaPainel = painelDiaSelecionado) {
        const agendaBody = document.getElementById('agenda-body');
        if (!agendaBody) return;
        agendaBody.innerHTML = '';

        // Normaliza datas para comparar apenas o dia
        const dia = new Date(diaPainel);
        dia.setHours(0, 0, 0, 0);

        const isDiaSelecionado = (d) => {
            const dt = new Date(d);
            dt.setHours(0, 0, 0, 0);
            return dt.getTime() === dia.getTime();
        };

        // Classificação da terapia pelo tempo de duração: ABA = 50min, Convencional = 30min
        const duracaoEmMinutos = (c) => {
            const d = c?.duracaoConsulta;
            if (typeof d === 'number') return d;
            if (typeof d === 'string') {
                // Espera formato HH:MM:SS
                const partes = d.split(':');
                if (partes.length >= 2) {
                    const horas = parseInt(partes[0], 10) || 0;
                    const minutos = parseInt(partes[1], 10) || 0;
                    return horas * 60 + minutos;
                }
                // Se vier como "50" ou "30" direto
                const m = parseInt(d, 10);
                return isNaN(m) ? 0 : m;
            }
            return 0;
        };

        const tipoTerapia = (c) => {
            const mins = duracaoEmMinutos(c);
                if (mins === 50 || mins === 60) return 'ABA';
            if (mins === 30) return 'Convencional';
            return 'Outros';
        };

        const consultasHoje = consultas
            .filter(c => c && c.datahoraConsulta && isDiaSelecionado(c.datahoraConsulta))
            // mantém todas as consultas do dia, independentemente do status
            .filter(c => tipoTerapia(c) === filtroTerapia)
            .sort((a, b) => new Date(a.datahoraConsulta) - new Date(b.datahoraConsulta));

        if (consultasHoje.length === 0) {
            const vazio = document.createElement('tr');
            vazio.innerHTML = `<td colspan="4">Sem agendamentos para o dia selecionado.</td>`;
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

    // Configura o mini calendário estilo mês para alterar o dia do Painel do Dia
    function configurarMiniCalendario(consultasBase) {
        const btnPrev = document.getElementById('miniCalPrev');
        const btnNext = document.getElementById('miniCalNext');
        const dow = document.getElementById('miniCalDow');
        const grid = document.getElementById('miniCalGrid');
        const label = document.getElementById('miniCalMonthLabel');

        if (!grid || !label || !dow) return;

        let viewYear = painelDiaSelecionado.getFullYear();
        let viewMonth = painelDiaSelecionado.getMonth(); // 0-11

        const formatMonthLabel = (y, m) => new Date(y, m, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const updateDowHighlight = (date) => {
            const idx = date.getDay(); // 0=Sun
            Array.from(dow.children).forEach((el, i) => {
                if (i === idx) el.classList.add('selected-dow'); else el.classList.remove('selected-dow');
            });
        };

        const render = () => {
            label.textContent = formatMonthLabel(viewYear, viewMonth);
            grid.innerHTML = '';

            const firstDow = new Date(viewYear, viewMonth, 1).getDay();
            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

            // empty cells before the 1st
            for (let i = 0; i < firstDow; i++) {
                const empty = document.createElement('div');
                empty.className = 'mini-cal-empty';
                grid.appendChild(empty);
            }

            const today = new Date(); today.setHours(0,0,0,0);
            const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

            for (let d = 1; d <= daysInMonth; d++) {
                const cellDate = new Date(viewYear, viewMonth, d);
                cellDate.setHours(0,0,0,0);
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'mini-cal-day';
                if (isSameDay(cellDate, painelDiaSelecionado)) btn.classList.add('selected');
                if (isSameDay(cellDate, today)) btn.classList.add('today');
                btn.textContent = String(d);
                btn.setAttribute('aria-label', cellDate.toLocaleDateString('pt-BR'));
                btn.addEventListener('click', () => {
                    painelDiaSelecionado = new Date(cellDate);
                    atualizarAgenda(consultasBase, painelDiaSelecionado);
                    updateDowHighlight(painelDiaSelecionado);
                    // Re-render to move selection highlight
                    render();
                });
                grid.appendChild(btn);
            }
        };

        if (btnPrev) btnPrev.addEventListener('click', () => { viewMonth -= 1; if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; } render(); });
        if (btnNext) btnNext.addEventListener('click', () => { viewMonth += 1; if (viewMonth > 11) { viewMonth = 0; viewYear += 1; } render(); });

        updateDowHighlight(painelDiaSelecionado);
        render();
    }

    // Configura filtro de visualização (ABA/Convencional) estilo calendário e botão Expandir
    function configurarAcoesPainel(consultasBase) {
        const btnAba = document.getElementById('btnModoABA');
        const btnConv = document.getElementById('btnModoConvencional');
        const labelModo = document.getElementById('modoAtualLabel');
        const btnExpandir = document.getElementById('btnExpandirAgenda');

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

        if (btnAba) btnAba.addEventListener('click', () => { filtroTerapia = 'ABA'; atualizarUI(); atualizarAgenda(consultasBase, painelDiaSelecionado); });
        if (btnConv) btnConv.addEventListener('click', () => { filtroTerapia = 'Convencional'; atualizarUI(); atualizarAgenda(consultasBase, painelDiaSelecionado); });

        atualizarUI();

        if (btnExpandir) btnExpandir.addEventListener('click', () => {
            window.location.href = 'agendaDiaria.html';
        });
    }

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

    // Função para verificar pacientes cuja última consulta agendada está na próxima semana (apenas para admin)
    async function verificarAgendamentosVencendo(consultas) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        // Data daqui a 7 dias (janela de alerta)
        const umaSemana = new Date(hoje);
        umaSemana.setDate(hoje.getDate() + 7);
        umaSemana.setHours(23, 59, 59, 999);
        
        // Filtrar apenas consultas futuras com status "Agendada"
        const consultasFuturas = consultas.filter(c => {
            const dataConsulta = new Date(c.datahoraConsulta);
            const status = c?.statusConsulta?.nomeStatus ?? 'Agendada';
            return status === 'Agendada' && dataConsulta >= hoje;
        });
        
        // Agrupar consultas por PACIENTE + ESPECIALIDADE
        const consultasPorPacienteEspecialidade = {};
        consultasFuturas.forEach(c => {
            const pacienteId = c.paciente?.id;
            const especialidadeId = c.especificacaoMedica?.id || c.medico?.especificacaoMedica?.id;
            const especialidadeNome = c.especificacaoMedica?.area || c.medico?.especificacaoMedica?.area || 'Não especificada';
            
            if (!pacienteId || !especialidadeId) return;
            
            // Criar chave única: pacienteId + especialidadeId
            const chave = `${pacienteId}_${especialidadeId}`;
            
            if (!consultasPorPacienteEspecialidade[chave]) {
                consultasPorPacienteEspecialidade[chave] = {
                    pacienteNome: `${c.paciente?.nome || ''} ${c.paciente?.sobrenome || ''}`.trim(),
                    especialidadeNome: especialidadeNome,
                    consultas: []
                };
            }
            consultasPorPacienteEspecialidade[chave].consultas.push(c);
        });
        
        // Para cada combinação paciente+especialidade, pegar a ÚLTIMA consulta agendada
        const pacientesComUltimaConsultaProxima = [];
        
        Object.values(consultasPorPacienteEspecialidade).forEach(grupo => {
            // Ordenar consultas por data (mais antiga primeiro)
            grupo.consultas.sort((a, b) => 
                new Date(a.datahoraConsulta) - new Date(b.datahoraConsulta)
            );
            
            // Pegar a ÚLTIMA consulta (mais distante no futuro)
            const ultimaConsulta = grupo.consultas[grupo.consultas.length - 1];
            const dataUltimaConsulta = new Date(ultimaConsulta.datahoraConsulta);
            
            // Verificar se a última consulta está dentro da próxima semana
            if (dataUltimaConsulta >= hoje && dataUltimaConsulta <= umaSemana) {
                pacientesComUltimaConsultaProxima.push({
                    pacienteNome: grupo.pacienteNome,
                    especialidadeNome: grupo.especialidadeNome,
                    ultimaConsulta: ultimaConsulta,
                    dataUltima: dataUltimaConsulta,
                    totalConsultas: grupo.consultas.length
                });
            }
        });
        
        // Se houver pacientes com última consulta na próxima semana, mostrar alerta
        if (pacientesComUltimaConsultaProxima.length > 0) {
            // Ordenar por data (mais próximas primeiro)
            pacientesComUltimaConsultaProxima.sort((a, b) => a.dataUltima - b.dataUltima);
            
            // Criar HTML para o popup
            let htmlConsultas = '<div style="text-align: left; max-height: 400px; overflow-y: auto;">';
            htmlConsultas += '<table style="width: 100%; border-collapse: collapse;">';
            htmlConsultas += '<thead><tr style="background-color: #f0f0f0;">';
            htmlConsultas += '<th style="padding: 10px; border: 1px solid #ddd;">Paciente</th>';
            htmlConsultas += '<th style="padding: 10px; border: 1px solid #ddd;">Especialidade</th>';
            htmlConsultas += '<th style="padding: 10px; border: 1px solid #ddd;">Última Consulta</th>';
            htmlConsultas += '<th style="padding: 10px; border: 1px solid #ddd;">Sessões Restantes</th>';
            htmlConsultas += '</tr></thead><tbody>';
            
            pacientesComUltimaConsultaProxima.forEach(item => {
                const dataFormatada = item.dataUltima.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                const horaFormatada = item.dataUltima.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                htmlConsultas += '<tr>';
                htmlConsultas += `<td style="padding: 8px; border: 1px solid #ddd;"><strong>${item.pacienteNome}</strong></td>`;
                htmlConsultas += `<td style="padding: 8px; border: 1px solid #ddd;">${item.especialidadeNome}</td>`;
                htmlConsultas += `<td style="padding: 8px; border: 1px solid #ddd;">${dataFormatada} às ${horaFormatada}</td>`;
                htmlConsultas += `<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.totalConsultas}</td>`;
                htmlConsultas += '</tr>';
            });
            
            htmlConsultas += '</tbody></table></div>';
            
            // Exibir pop-up usando SweetAlert2
            if (window.Swal) {
                Swal.fire({
                    title: '<strong>⚠️ Pacientes Precisam Reagendar!</strong>',
                    html: `
                        <p style="margin-bottom: 15px;">
                            <strong>Silvia</strong>, os seguintes pacientes têm sua <strong>última consulta agendada</strong> 
                            (por especialidade) na próxima semana. É necessário <strong>reagendar mais sessões</strong>:
                        </p>
                        ${htmlConsultas}
                        <p style="margin-top: 15px; font-size: 14px; color: #666;">
                            <em>💡 Cada linha representa a última sessão de uma especialidade para aquele paciente.</em>
                        </p>
                    `,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: '<i class="fas fa-calendar-plus"></i> Ir para Agendamento',
                    cancelButtonText: '<i class="fas fa-check"></i> Entendi',
                    confirmButtonColor: '#1976D2',
                    cancelButtonColor: '#388E3C',
                    width: '900px',
                    customClass: {
                        popup: 'agendamentos-vencendo-popup',
                        confirmButton: 'btn-ir-agendamento',
                        cancelButton: 'btn-entendi'
                    },
                    reverseButtons: true
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Redireciona para a página de calendário/agendamento
                        window.location.href = 'calendario.html';
                    }
                    // Se clicar em "Entendi" (cancel), apenas fecha o modal
                });
            } else {
                // Fallback para alert simples se SweetAlert2 não estiver disponível
                let mensagem = 'AVISO: Pacientes precisam reagendar!\n\n';
                pacientesComUltimaConsultaProxima.forEach(item => {
                    const dataFormatada = item.dataUltima.toLocaleDateString('pt-BR');
                    const horaFormatada = item.dataUltima.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    mensagem += `\nPaciente: ${item.pacienteNome}\n`;
                    mensagem += `  Especialidade: ${item.especialidadeNome}\n`;
                    mensagem += `  Última consulta: ${dataFormatada} às ${horaFormatada}\n`;
                    mensagem += `  Sessões restantes: ${item.totalConsultas}\n`;
                });
                if (confirm(mensagem + '\n\nDeseja ir para a tela de agendamento?')) {
                    window.location.href = 'calendario.html';
                }
            }
        }
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
                // Atualiza painel do dia (consultas do dia selecionado) e gráfico geral
                atualizarAgenda(todas, painelDiaSelecionado);
                configurarMiniCalendario(todas);
                configurarAcoesPainel(todas);
                atualizarGrafico(todas);
                // Verificar agendamentos que vencem em 1 semana
                verificarAgendamentosVencendo(todas);
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
                atualizarAgenda(apenasFono, painelDiaSelecionado);
                configurarMiniCalendario(apenasFono);
                configurarAcoesPainel(apenasFono);
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
            atualizarAgenda(consultas, painelDiaSelecionado); // Preenche a tabela de agenda conforme dia selecionado
            configurarMiniCalendario(consultas); // Habilita controle do dia via mini calendário
            configurarAcoesPainel(consultas);
            atualizarGrafico(consultas); // Atualiza o gráfico de desempenho
        } else {
            console.error('ID do médico não encontrado no sessionStorage.');
        }
    }
});
