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
        rows.push(['Data','Hora','Paciente','CPF','Profissional','Área','Status','Descrição','Duração']);

        for (let i=0;i<7;i++){
            const d = new Date(start);
            d.setDate(start.getDate()+i);
            const tarefas = obterTarefasParaData(d);
            tarefas.forEach(t => {
                const dataHora = new Date(t.datahoraConsulta);
                const dataStr = dataHora.toLocaleDateString('pt-BR');
                const horaStr = dataHora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
                const paciente = t.paciente ? `${t.paciente.nome || ''} ${t.paciente.sobrenome || ''}`.trim() : '';
                const cpf = t.paciente ? (t.paciente.cpf || '') : '';
                const medico = t.medico ? `${t.medico.nome || ''} ${t.medico.sobrenome || ''}`.trim() : '';
                const area = t.medico?.especificacaoMedica?.area || t.especificacaoMedica?.area || '';
                const status = t.statusConsulta?.nomeStatus || '';
                const descricao = t.descricao ? String(t.descricao).replace(/\r?\n/g,' ') : '';
                let duracao = '';
                const rawDur = t.duracaoConsulta ?? t.duracao ?? null;
                if (rawDur) {
                    if (typeof rawDur === 'number') duracao = `${rawDur} min`;
                    else duracao = String(rawDur);
                }
                rows.push([dataStr,horaStr,paciente,cpf,medico,area,status,descricao,duracao]);
            });
        }

        const csvContent = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g,'""') + '"').join(',')).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const stamp = formatarData(new Date(dataInicioAtual)).replace(/-/g,'');
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

        for (let i=0;i<7;i++){
            const d = new Date(start);
            d.setDate(start.getDate()+i);
            const tarefas = obterTarefasParaData(d);
            if (tarefas.length === 0) {
                html += `<tr><td>${d.toLocaleDateString('pt-BR')}</td><td colspan="7">Sem tarefas</td></tr>`;
            } else {
                tarefas.forEach(t => {
                    const dataHora = new Date(t.datahoraConsulta);
                    const dataStr = dataHora.toLocaleDateString('pt-BR');
                    const horaStr = dataHora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
                    const paciente = t.paciente ? `${t.paciente.nome || ''} ${t.paciente.sobrenome || ''}`.trim() : '';
                    const medico = t.medico ? `${t.medico.nome || ''} ${t.medico.sobrenome || ''}`.trim() : '';
                    const area = t.medico?.especificacaoMedica?.area || t.especificacaoMedica?.area || '';
                    const status = t.statusConsulta?.nomeStatus || '';
                    const descricao = t.descricao ? String(t.descricao).replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
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

        async function buscarConsultas() {
            try {
                const resposta = await fetch(`${API_BASE_LOCAL}/mc/consultas`);
                if (!resposta.ok) {
                    throw new Error(`HTTP error! Status: ${resposta.status}`);
                }
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

                atualizarDisplayData(dataInicioAtual);
            } catch (error) {
                console.error('Erro ao buscar consultas:', error);
            }
        }

        function obterInicioDaSemana(date) {
            // Ajuste para que a semana comece no domingo (domingo = 0)
            const day = date.getDay();
            const diff = -day; // deslocamento para domingo
            const startDate = new Date(date);
            startDate.setDate(date.getDate() + diff);
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

        function obterTarefasParaData(date) {
            const formattedDate = formatarData(date);
            // Filtra todas as consultas para a data específica
            const entries = bancoDeDadosFiltrado.filter(entry => entry.datahoraConsulta.startsWith(formattedDate));
            return entries; // Retorna todas as consultas como objetos completos
        }

        function atualizarDisplayData(startDate) {
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);

            const options = { day: '2-digit', month: 'long' };
            const startStr = `${startDate.toLocaleDateString('pt-BR', options).replace(/^\d{2}/, match => match.padStart(2, '0'))} ${startDate.getFullYear()}`;
            const endStr = `${endDate.toLocaleDateString('pt-BR', options).replace(/^\d{2}/, match => match.padStart(2, '0'))} ${endDate.getFullYear()}`;

            document.getElementById('dias').innerText = `${startStr} - ${endStr}`;
            atualizarDiasDaSemana(startDate);
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
            colunasTarefasElement.innerHTML = '';

            for (let i = 0; i < 7; i++) {
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
                    taskElement.innerText = task.descricao; // Exibe a descrição da consulta
                    taskElement.onclick = () => abrirDetalhesTarefa(task); // Passa o objeto completo da consulta
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

        function semanaPassada() {
            dataInicioAtual.setDate(dataInicioAtual.getDate() - 7);
            dataInicioAtual = obterInicioDaSemana(dataInicioAtual);
            atualizarDisplayData(dataInicioAtual);
        }

        function proximaSemana() {
            dataInicioAtual.setDate(dataInicioAtual.getDate() + 7);
            dataInicioAtual = obterInicioDaSemana(dataInicioAtual);
            atualizarDisplayData(dataInicioAtual);
        }

        // Inicialização
        async function inicializarPagina() {
            await buscarMedicos();
            await buscarPacientes();
            await buscarEspecificacoesMedicas();
            await buscarStatusConsulta();
            await buscarConsultas();
            
            dataInicioAtual = obterInicioDaSemana(new Date());
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

            const medicoId = medicoRaw ? Number(medicoRaw) : null;
            const pacienteId = pacienteRaw ? Number(pacienteRaw) : null;
            const statusId = statusRaw ? Number(statusRaw) : null;
            const areaConsultaId = areaRaw ? Number(areaRaw) : null;
            const idadePaciente = idadeRaw ? Number(idadeRaw) : null;

            bancoDeDadosFiltrado = consultasOriginais.filter(consulta => {
                const filtroMedico = medicoId == null || (consulta.medico && Number(consulta.medico.id) === medicoId);
                const filtroPaciente = pacienteId == null || (consulta.paciente && Number(consulta.paciente.id) === pacienteId);
                const filtroStatus = statusId == null || (consulta.statusConsulta && Number(consulta.statusConsulta.id) === statusId);
                const filtroAreaConsulta = areaConsultaId == null || (consulta.especificacaoMedica && Number(consulta.especificacaoMedica.id) === areaConsultaId);
                const filtroIdade = idadePaciente == null || (consulta.paciente && calcularIdade(consulta.paciente.dtNasc) === idadePaciente);
                const filtroGenero = !generoPaciente || (consulta.paciente && (consulta.paciente.genero || '') === generoPaciente);

                // Filtra por data de início e data de fim
                const dataConsulta = new Date(consulta.datahoraConsulta);
                const filtroDataInicio = !dataInicio || new Date(dataInicio) <= dataConsulta;
                const filtroDataFim = !dataFim || new Date(dataFim) >= dataConsulta;

                return filtroMedico && filtroPaciente && filtroStatus && filtroAreaConsulta && filtroIdade && filtroGenero && filtroDataInicio && filtroDataFim;
            });

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

            // Restaurar o banco de dados filtrado ao estado original
            bancoDeDadosFiltrado = consultasOriginais;
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
                <p><strong>Descrição:</strong> ${descricao}</p>
                <p><strong>Data e Hora:</strong> ${dataFormatada} às ${horaFormatada}</p>
                <p><strong>Paciente:</strong> ${pacienteNome}</p>
                <p><strong>Profissional:</strong> ${medicoNome} - ${medicoArea}</p>
                <p><strong>Status:</strong> ${statusNome}</p>
                <p><strong>Duração:</strong> ${duracao}</p>
            `;
            const btnEditar = document.getElementById('btnEditarConsulta');
            if (btnEditar) {
                btnEditar.onclick = () => { window.location.href = `editarConsulta.html?id=${consulta.id}`; };
            }
            const modal = document.getElementById('modalDetalhes');
            if (modal) modal.style.display = 'flex';
        }

        function fecharModalDetalhes() {
            document.getElementById('modalDetalhes').style.display = 'none';
        }