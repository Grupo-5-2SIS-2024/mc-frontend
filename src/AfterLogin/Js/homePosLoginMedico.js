document.addEventListener('DOMContentLoaded', async () => {
    // Dia selecionado para o Painel do Dia (default: hoje)
    let painelDiaSelecionado = new Date();
    painelDiaSelecionado.setHours(0, 0, 0, 0);
    // Filtro de visualização de terapia (ABA | Convencional). Default alinhado ao calendário
    let filtroTerapia = 'ABA';
    const nivelPermissaoGlobal = sessionStorage.getItem('PERMISSIONAMENTO_MEDICO');
    let selectedMedicoNome = '';
    let consultasPainelRenderizadas = [];
    let medicosCache = [];
    let cacheIdsDiaIso = '';
    let cacheIdsPorChave = new Map();
    // Define bases candidatas da API. Em localhost tenta 8080 e mesma origem (ex.: 3000 + proxy)
    const API_BASES = window.location.origin.includes('localhost')
        ? ['http://localhost:8080', window.location.origin, '']
        : [''];

    async function apiFetch(path, options = {}) {
        let ultimoErro = null;

        for (const base of API_BASES) {
            const url = `${base}${path}`;
            try {
                const resp = await fetch(url, options);
                // Se conectou ao servidor e não é 404, já devolve a resposta.
                if (resp.status !== 404) return resp;
            } catch (erro) {
                ultimoErro = erro;
            }
        }

        if (ultimoErro) throw ultimoErro;
        throw new Error('Nao foi possivel conectar em nenhuma base da API.');
    }

    function formatarDataIsoLocal(data) {
        const d = new Date(data);
        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    }

    function normalizarTexto(valor) {
        return String(valor || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function primeiroNomeNormalizado(valor) {
        return normalizarTexto(valor).split(/\s+/).filter(Boolean)[0] || '';
    }

    function obterNomeFiltroApiMedico(nomeCompleto) {
        const nome = String(nomeCompleto || '').trim();
        if (!nome) return '';
        return nome.split(/\s+/)[0] || '';
    }

    function extrairHoraMinuto(valor) {
        if (!valor) return '';
        if (typeof valor === 'string') {
            const match = valor.match(/(\d{2}):(\d{2})/);
            if (match) return `${match[1]}:${match[2]}`;
            return '';
        }
        const d = new Date(valor);
        if (isNaN(d.getTime())) return '';
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    function construirChavePainel(hhmm, nomePaciente, nomeProfissional) {
        return `${hhmm}|${primeiroNomeNormalizado(nomePaciente)}|${primeiroNomeNormalizado(nomeProfissional)}`;
    }

    async function buscarConsultasDetalhadasDia(dataRef) {
        const dataIso = formatarDataIsoLocal(dataRef);
        const query = new URLSearchParams();
        query.set('data', dataIso);

        const caminhos = [
            `/mc/consultas?${query.toString()}`,
            `/consultas?${query.toString()}`,
            '/mc/consultas',
            '/consultas'
        ];

        for (const path of caminhos) {
            try {
                const resp = await apiFetch(path);
                if (!resp.ok) continue;
                const data = await resp.json();
                if (!Array.isArray(data)) continue;
                return data;
            } catch (erro) {
                console.warn('[PainelDia] falha ao buscar consultas detalhadas:', path, erro);
            }
        }

        return [];
    }

    async function garantirCacheIdsDoDia(dataRef) {
        const dataIso = formatarDataIsoLocal(dataRef);
        if (cacheIdsDiaIso === dataIso && cacheIdsPorChave.size > 0) return;

        const lista = await buscarConsultasDetalhadasDia(dataRef);
        const mapa = new Map();

        for (const c of lista) {
            const id = c?.id ?? c?.consultaId ?? c?.consulta?.id ?? null;
            if (!id) continue;

            const hhmm = extrairHoraMinuto(c?.datahoraConsulta || c?.horario);
            const paciente = `${c?.paciente?.nome || ''} ${c?.paciente?.sobrenome || ''}`.trim() || c?.pacienteNome || c?.paciente || '';
            const profissional = `${c?.medico?.nome || ''} ${c?.medico?.sobrenome || ''}`.trim() || c?.profissionalNome || c?.medico || c?.profissional || '';
            if (!hhmm || !paciente || !profissional) continue;

            const chave = construirChavePainel(hhmm, paciente, profissional);
            if (!mapa.has(chave)) mapa.set(chave, id);
        }

        cacheIdsDiaIso = dataIso;
        cacheIdsPorChave = mapa;
    }

    async function resolverIdConsulta(consulta, dataRef) {
        if (consulta?.id) return consulta.id;
        await garantirCacheIdsDoDia(dataRef);

        const hhmm = extrairHoraMinuto(consulta?.datahoraConsulta || consulta?.horarioHHMM || consulta?.horario);
        const paciente = nomePacienteLinha(consulta);
        const profissional = nomeProfissionalLinha(consulta);
        const chave = construirChavePainel(hhmm, paciente, profissional);
        const idResolvido = cacheIdsPorChave.get(chave) ?? null;

        if (idResolvido) consulta.id = idResolvido;
        return idResolvido;
    }

    function duracaoEmMinutos(c) {
        const d = c?.duracaoConsulta;
        if (typeof d === 'number') return d;
        if (typeof d === 'string') {
            // Tenta parsear formato "HH:MM" (ex: "01:00")
            if (d.includes(':')) {
                const partes = d.split(':');
                if (partes.length >= 2) {
                    const horas = parseInt(partes[0], 10) || 0;
                    const minutos = parseInt(partes[1], 10) || 0;
                    return horas * 60 + minutos;
                }
            }

            // Tenta parsear formato legível como "1h 0m", "1h0m", "1 h 0 m", etc
            const regexHorasMinutos = /(\d+)\s*h(?:ora)?s?\s+(\d+)\s*m(?:in)?s?/i;
            const matchHM = d.match(regexHorasMinutos);
            if (matchHM) {
                const horas = parseInt(matchHM[1], 10) || 0;
                const minutos = parseInt(matchHM[2], 10) || 0;
                return horas * 60 + minutos;
            }

            // Tenta parsear apenas horas "1h", "1 hora", "1 horas"
            const regexHoras = /(\d+)\s*h(?:ora)?s?/i;
            const matchH = d.match(regexHoras);
            if (matchH) {
                const horas = parseInt(matchH[1], 10) || 0;
                return horas * 60;
            }

            // Tenta parsear apenas minutos "60 min", "60m", "60 minutos"
            const regexMinutos = /(\d+)\s*m(?:in)?(?:uto)?s?/i;
            const matchM = d.match(regexMinutos);
            if (matchM) {
                return parseInt(matchM[1], 10) || 0;
            }

            // Fallback: tenta converter direto para número
            const m = parseInt(d, 10);
            return isNaN(m) ? 0 : m;
        }
        return 0;
    }

    function tipoTerapia(c) {
        const tipoApi = normalizarTexto(c?.tipoTerapia || c?.painelTipoTerapia || '');
        if (tipoApi === 'aba') return 'ABA';
        if (tipoApi.includes('convenc')) return 'Convencional';

        const mins = duracaoEmMinutos(c);
        if (mins === 50 || mins === 60) return 'ABA';
        if (mins === 30) return 'Convencional';
        // Se a API nao enviou duracao/tipo, nao forca exclusao pelo filtro de visualizacao.
        return null;
    }

    function duracaoPorFiltro(modo) {
        return modo === 'Convencional' ? 30 : 50;
    }

    function nomePacienteLinha(consulta) {
        if (consulta?.pacienteNome) return consulta.pacienteNome;
        if (consulta?.paciente && consulta?.pacienteSobrenome) {
            return `${consulta.paciente} ${consulta.pacienteSobrenome}`.trim();
        }
        const nome = consulta?.paciente?.nome || '';
        const sobrenome = consulta?.paciente?.sobrenome || '';
        return `${nome} ${sobrenome}`.trim();
    }

    function nomeSalaLinha(consulta) {
        return String(
            consulta?.painelSala ||
            consulta?.sala?.nome ||
            consulta?.sala ||
            ''
        ).trim() || 'Sem sala';
    }

    function nomeProfissionalLinha(consulta) {
        if (consulta?.profissionalNome) return consulta.profissionalNome;
        if (consulta?.medico && consulta?.medicoSobrenome) {
            return `${consulta.medico} ${consulta.medicoSobrenome}`.trim();
        }
        const nome = consulta?.medico?.nome || '';
        const sobrenome = consulta?.medico?.sobrenome || '';
        return `${nome} ${sobrenome}`.trim();
    }

    function nomeEspecialidadeLinha(consulta) {
        return String(
            consulta?.especialidadeNome ||
            consulta?.medico?.especificacaoMedica?.area ||
            consulta?.especificacaoMedica?.area ||
            ''
        ).trim();
    }

    function statusNomePorId(statusId) {
        const mapa = {
            1: 'Agendada',
            2: 'Confirmada',
            3: 'Atendida',
            4: 'Cancelada',
            5: 'Faltou'
        };
        return mapa[Number(statusId)] || '';
    }

    async function buscarPainelDoDia(dataRef, medico = null, duracao = null) {
        const query = new URLSearchParams();
        query.set('data', formatarDataIsoLocal(dataRef));
        const medicoFiltroApi = obterNomeFiltroApiMedico(medico);
        if (medicoFiltroApi) query.set('medico', medicoFiltroApi);
        if (typeof duracao === 'number' && !Number.isNaN(duracao)) query.set('duracao', String(duracao));

        const caminhos = [
            `/mc/consultas/painel-dia?${query.toString()}`,
            `/consultas/painel-dia?${query.toString()}`,
            `/mc/painel-dia?${query.toString()}`,
            `/painel-dia?${query.toString()}`
        ];

        for (const path of caminhos) {
            console.info('[PainelDia] GET', path, 'bases:', API_BASES);
            try {
                const resp = await apiFetch(path);
                if (!resp.ok) {
                    console.warn('[PainelDia] tentativa falhou:', path, 'status:', resp.status);
                    continue;
                }
                const data = await resp.json();
                const lista = Array.isArray(data) ? data : [];
                console.info('[PainelDia] sucesso:', path, 'itens:', lista.length);
                return lista;
            } catch (erro) {
                console.warn('[PainelDia] erro na tentativa:', path, erro);
            }
        }

        console.error('[PainelDia] nenhuma rota respondeu com sucesso.');
        return [];
    }

    function normalizarLinhaPainelDoDia(linha, dataRef) {
        const dataIso = formatarDataIsoLocal(dataRef);
        const dataHoraOriginal = linha?.datahoraConsulta ? new Date(linha.datahoraConsulta) : null;
        const hhmm = extrairHoraMinuto(linha?.datahoraConsulta || linha?.horario);
        const datahora = dataHoraOriginal && !isNaN(dataHoraOriginal.getTime())
            ? linha.datahoraConsulta
            : (hhmm ? `${dataIso}T${hhmm}:00` : `${dataIso}T00:00:00`);
        const statusId = linha?.statusId ?? linha?.statusConsulta?.idStatus ?? linha?.statusConsulta?.id ?? linha?.status?.id ?? null;
        const status = String(
            (linha?.statusConsulta?.nomeStatus ?? (typeof linha?.status === 'string' ? linha.status : '')) ||
            statusNomePorId(statusId) ||
            'Agendada'
        ).trim();

        const pacienteNome = String(
            linha?.pacienteNome ||
            `${linha?.paciente || ''} ${linha?.pacienteSobrenome || ''}`.trim() ||
            `${linha?.paciente?.nome || ''} ${linha?.paciente?.sobrenome || ''}`.trim() ||
            linha?.paciente ||
            ''
        ).trim();
        const profissionalNome = String(
            linha?.profissionalNome ||
            `${linha?.medico || ''} ${linha?.medicoSobrenome || ''}`.trim() ||
            `${linha?.medico?.nome || ''} ${linha?.medico?.sobrenome || ''}`.trim() ||
            linha?.medico ||
            linha?.profissional ||
            ''
        ).trim();

        return {
            id: linha?.consultaId ?? linha?.id ?? linha?.consulta?.id ?? null,
            horarioHHMM: hhmm,
            datahoraConsulta: datahora,
            pacienteNome: pacienteNome,
            profissionalNome: profissionalNome,
            especialidadeNome: String(
                linha?.especialidadeNome ??
                linha?.especialidade ??
                linha?.medico?.especificacaoMedica?.area ??
                linha?.especificacaoMedica?.area ??
                ''
            ).trim(),
            painelIdade: linha?.painelIdade ?? linha?.idade ?? null,
            painelConvenio: linha?.painelConvenio ?? linha?.convenio?.nome ?? linha?.convenio ?? null,
            painelStatus: status,
            painelTipoTerapia: linha?.painelTipoTerapia ?? linha?.tipoTerapia ?? null,
            painelSala: String(
                linha?.sala ??
                linha?.salaNome ??
                linha?.consulta?.sala?.nome ??
                linha?.sala?.nome ??
                ''
            ).trim(),
            statusConsulta: linha?.statusConsulta || { idStatus: statusId, nomeStatus: status },
            paciente: linha?.paciente || { nome: pacienteNome, sobrenome: '' },
            medico: linha?.medico || { id: linha?.medicoId ?? null, nome: profissionalNome, sobrenome: '' },
            duracaoConsulta: linha?.duracaoConsulta ?? linha?.duracao ?? null
        };
    }

    function atualizarOpcoesProfissional(consultasDoPainel = []) {
        const selMed = document.getElementById('filtroMedicoSelect');
        if (!selMed) return;

        if (Array.isArray(medicosCache) && medicosCache.length > 0) {
            const opcoes = medicosCache
                .map((m) => {
                    const nome = `${m?.nome || ''} ${m?.sobrenome || ''}`.trim();
                    const especialidade = String(m?.especificacaoMedica?.area || '').trim();
                    if (!nome) return null;
                    return {
                        value: nome,
                        label: especialidade ? `${nome} - ${especialidade}` : nome
                    };
                })
                .filter(Boolean)
                .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

            const unicas = [];
            const vistos = new Set();
            for (const op of opcoes) {
                const chave = `${normalizarTexto(op.value)}|${normalizarTexto(op.label)}`;
                if (vistos.has(chave)) continue;
                vistos.add(chave);
                unicas.push(op);
            }

            selMed.innerHTML = '<option value="">Todos</option>' + unicas.map(op => `<option value="${op.value}">${op.label}</option>`).join('');
            if (selectedMedicoNome) selMed.value = selectedMedicoNome;
            return;
        }

        const opcoes = (consultasDoPainel || [])
            .map((c) => {
                const nome = nomeProfissionalLinha(c);
                const especialidade = nomeEspecialidadeLinha(c);
                if (!nome) return null;
                return {
                    value: nome,
                    label: especialidade ? `${nome} - ${especialidade}` : nome
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

        const unicas = [];
        const vistos = new Set();
        for (const op of opcoes) {
            const chave = `${normalizarTexto(op.value)}|${normalizarTexto(op.label)}`;
            if (vistos.has(chave)) continue;
            vistos.add(chave);
            unicas.push(op);
        }

        selMed.innerHTML = '<option value="">Todos</option>' + unicas.map(op => `<option value="${op.value}">${op.label}</option>`).join('');
        if (selectedMedicoNome) selMed.value = selectedMedicoNome;
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
        const extrairContagem = (payload) => {
            if (Array.isArray(payload)) return payload.length;
            if (typeof payload === 'number' && !isNaN(payload)) return payload;
            if (!payload || typeof payload !== 'object') return 0;
            if (Array.isArray(payload.content)) return payload.content.length;
            if (typeof payload.totalElements === 'number') return payload.totalElements;
            if (typeof payload.total === 'number') return payload.total;
            if (typeof payload.count === 'number') return payload.count;
            return 0;
        };

        const obterContagem = async (caminhos) => {
            for (const path of caminhos) {
                try {
                    const resposta = await apiFetch(path);
                    if (!resposta.ok) continue;
                    const data = await resposta.json();
                    return extrairContagem(data);
                } catch (erro) {
                    console.warn('Falha ao obter contagem em', path, erro);
                }
            }
            return 0;
        };

        try {
            // Totais com fallback e suporte a payload paginado
            const totalMedicos = await obterContagem(['/mc/medicos/todos', '/mc/medicos']);
            const medicosAtivos = await obterContagem(['/mc/medicos']);
            const pacientesAtivos = await obterContagem(['/mc/pacientes']);
            const totalPacientes = await obterContagem(['/mc/pacientes/todos', '/mc/pacientes']);

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

    async function carregarMedicosFiltro() {
        try {
            const resposta = await apiFetch('/mc/medicos');
            if (!resposta.ok) {
                medicosCache = [];
                return;
            }
            const lista = await resposta.json();
            medicosCache = Array.isArray(lista) ? lista : [];
        } catch (erro) {
            medicosCache = [];
            console.warn('Falha ao carregar medicos para filtro:', erro);
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

        // Atualiza o número de consultas restantes na semana (se o elemento existir)
        const elRestantes = document.getElementById('consultasRestantesSemana');
        if (elRestantes) elRestantes.textContent = consultasSemana;
    }
    // Utilitário: recupera a área do usuário (Supervisor/Médico) a partir da sessão
    function getAreaUsuario() {
        const areaSessao = sessionStorage.getItem('ESPECIFICACAO_MEDICA');
        if (areaSessao && areaSessao !== 'null') return String(areaSessao).toLowerCase();
        return '';
    }

    // Atualizar tabela de agenda (agendamentos do dia selecionado, agrupados por horário)
    async function atualizarAgenda(_consultas, diaPainel = painelDiaSelecionado) {
        // Normaliza datas para comparar apenas o dia
        const dia = new Date(diaPainel);
        dia.setHours(0, 0, 0, 0);

        cacheIdsDiaIso = '';
        cacheIdsPorChave = new Map();

        const duracaoFiltro = duracaoPorFiltro(filtroTerapia);
        const linhasPainelDoDia = await buscarPainelDoDia(dia, selectedMedicoNome || null, duracaoFiltro);

        const agendaBody = document.getElementById('agenda-body');
        if (!agendaBody) return;
        agendaBody.innerHTML = '';

        const consultasDoPainel = (linhasPainelDoDia || []).map((linha) => normalizarLinhaPainelDoDia(linha, dia));
        atualizarOpcoesProfissional(consultasDoPainel);

        const consultasHoje = consultasDoPainel
            .filter(c => !selectedMedicoNome || normalizarTexto(nomeProfissionalLinha(c)) === normalizarTexto(selectedMedicoNome))
            // mantém todas as consultas do dia, independentemente do status
            .filter(c => {
                const tipo = tipoTerapia(c);
                if (!tipo) return filtroTerapia === 'ABA';
                return tipo === filtroTerapia;
            })
            .sort((a, b) => new Date(a.datahoraConsulta) - new Date(b.datahoraConsulta));

        consultasPainelRenderizadas = [...consultasHoje];

        if (consultasHoje.length === 0) {
            const vazio = document.createElement('tr');
            vazio.innerHTML = `<td colspan="5">Sem agendamentos para o dia selecionado.</td>`;
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
            sep.innerHTML = `<td colspan="5"><strong>${hora}</strong></td>`;
            agendaBody.appendChild(sep);

            // Linhas das consultas do horário
            for (const consulta of grupos.get(hora)) {
                const row = document.createElement('tr');
                const horaExata = new Date(consulta.datahoraConsulta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                // Build cells: horario, paciente, status, acoes
                const tdHora = document.createElement('td'); tdHora.textContent = horaExata;
                const tdPaciente = document.createElement('td'); tdPaciente.textContent = nomePacienteLinha(consulta);
                const tdMedico = document.createElement('td');
                tdMedico.textContent = nomeProfissionalLinha(consulta);
                const tdStatus = document.createElement('td');
                const tdSala = document.createElement('td');
                tdSala.textContent = nomeSalaLinha(consulta);
                // create a dedicated element for the status text and a separate container for action buttons
                const spanStatusText = document.createElement('span');
                spanStatusText.className = 'status-text';
                // Show 'Agendada' when status is null so items remain visible
                const statusAtualNome = consulta.statusConsulta?.nomeStatus || statusNomePorId(consulta?.statusConsulta?.idStatus) || 'Agendada';
                spanStatusText.textContent = statusAtualNome;
                const divStatusActions = document.createElement('div');
                divStatusActions.className = 'status-actions';
                tdStatus.appendChild(spanStatusText);
                tdStatus.appendChild(divStatusActions);

                // Only show action buttons for 'Agendada' appointments (treat null status as 'Agendada')
                const statusNorm = normalizarTexto(statusAtualNome);
                if (statusNorm === 'agendada') {
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
                        const idConsulta = await resolverIdConsulta(consulta, dia);
                        if (!idConsulta) {
                            if (window.Swal) {
                                Swal.fire({ icon: 'warning', title: 'Sem identificador', text: 'Esta consulta não possui ID para atualização de status.' });
                            } else {
                                alert('Esta consulta não possui ID para atualização de status.');
                            }
                            return;
                        }
                        await atualizarStatusConsulta(idConsulta, 3, tdStatus); // 3 = Atendida
                    });

                    btnDesmarcado.addEventListener('click', async () => {
                        const idConsulta = await resolverIdConsulta(consulta, dia);
                        if (!idConsulta) {
                            if (window.Swal) {
                                Swal.fire({ icon: 'warning', title: 'Sem identificador', text: 'Esta consulta não possui ID para atualização de status.' });
                            } else {
                                alert('Esta consulta não possui ID para atualização de status.');
                            }
                            return;
                        }
                        await atualizarStatusConsulta(idConsulta, 4, tdStatus); // 4 = Cancelada
                    });

                    btnFalta.addEventListener('click', async () => {
                        const idConsulta = await resolverIdConsulta(consulta, dia);
                        if (!idConsulta) {
                            if (window.Swal) {
                                Swal.fire({ icon: 'warning', title: 'Sem identificador', text: 'Esta consulta não possui ID para atualização de status.' });
                            } else {
                                alert('Esta consulta não possui ID para atualização de status.');
                            }
                            return;
                        }
                        await atualizarStatusConsulta(idConsulta, 5, tdStatus); // 5 = Faltou
                    });
                }

                row.appendChild(tdHora);
                row.appendChild(tdPaciente);
                row.appendChild(tdMedico);
                row.appendChild(tdStatus);
                row.appendChild(tdSala);
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
            const resp = await apiFetch(`/mc/consultas/${consultaId}/status?statusId=${statusId}&status=${statusId}`, {
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
                : statusNomePorId(updated?.statusId ?? updated?.statusConsulta?.idStatus ?? statusId) || 'Agendada';
            // update the status text span and remove the actions container
            const span = tdStatusElement.querySelector('.status-text');
            const actions = tdStatusElement.querySelector('.status-actions');
            if (span) span.textContent = novoStatus;
            if (actions) actions.remove();

            const item = consultasPainelRenderizadas.find(c => String(c?.id) === String(consultaId));
            if (item) {
                item.statusConsulta = item.statusConsulta || {};
                item.statusConsulta.idStatus = updated?.statusId ?? updated?.statusConsulta?.idStatus ?? statusId;
                item.statusConsulta.nomeStatus = novoStatus;
            }

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

            const today = new Date(); today.setHours(0, 0, 0, 0);
            const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

            for (let d = 1; d <= daysInMonth; d++) {
                const cellDate = new Date(viewYear, viewMonth, d);
                cellDate.setHours(0, 0, 0, 0);
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
        const selMed = document.getElementById('filtroMedicoSelect');
        const btnPrint = document.getElementById('btnImprimirPainel');

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

        if (selMed) {
            selectedMedicoNome = selMed.value || '';
            selMed.addEventListener('change', () => {
                selectedMedicoNome = selMed.value || '';
                atualizarAgenda(consultasBase, painelDiaSelecionado);
            });
            // Mostrar seletor apenas para Admin; ocultar para Supervisor/Médico
            const filtroContainer = selMed.closest('.medico-filter');
            if (filtroContainer) {
                if (nivelPermissaoGlobal !== 'Admin') {
                    filtroContainer.style.display = 'none';
                } else {
                    filtroContainer.style.display = '';
                }
            }
        }

        if (btnPrint) {
            btnPrint.addEventListener('click', () => imprimirPainelDoDia(consultasBase));
        }

        atualizarUI();

        if (btnExpandir) btnExpandir.addEventListener('click', () => {
            window.location.href = 'agendaDiaria.html';
        });
    }

    function formatarDataCabecalho(date) {
        return new Date(date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }

    function imprimirPainelDoDia(consultasBase = []) {
        const modo = document.getElementById('modoAtualLabel')?.textContent || '';
        const sel = document.getElementById('filtroMedicoSelect');
        const medicoTexto = sel && sel.value ? sel.options[sel.selectedIndex].text : 'Todos';
        const cabec = `${formatarDataCabecalho(painelDiaSelecionado)} • ${modo} • ${medicoTexto}`;

        const dia = new Date(painelDiaSelecionado);
        dia.setHours(0, 0, 0, 0);
        const isDiaSelecionado = (d) => {
            const dt = new Date(d);
            dt.setHours(0, 0, 0, 0);
            return dt.getTime() === dia.getTime();
        };

        const duracaoEmMinutos = (c) => {
            const d = c?.duracaoConsulta;
            if (typeof d === 'number') return d;
            if (typeof d === 'string') {
                const partes = d.split(':');
                if (partes.length >= 2) {
                    const horas = parseInt(partes[0], 10) || 0;
                    const minutos = parseInt(partes[1], 10) || 0;
                    return horas * 60 + minutos;
                }
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

        const calcularIdade = (dataNasc) => {
            if (!dataNasc) return '—';
            const hoje = new Date();
            const nasc = new Date(dataNasc);
            if (isNaN(nasc.getTime())) return '—';
            let idade = hoje.getFullYear() - nasc.getFullYear();
            const mes = hoje.getMonth() - nasc.getMonth();
            if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade--;
            return `${idade} anos`;
        };

        const obterConvenio = (paciente) => {
            if (!paciente) return '—';
            return (
                paciente?.convenio?.nome ||
                paciente?.convenioNome ||
                paciente?.nomeConvenio ||
                (typeof paciente?.convenio === 'string' ? paciente.convenio : '') ||
                '—'
            );
        };

        const consultasHoje = (consultasPainelRenderizadas && consultasPainelRenderizadas.length)
            ? [...consultasPainelRenderizadas]
            : (consultasBase || [])
                .filter(c => c && c.datahoraConsulta && isDiaSelecionado(c.datahoraConsulta))
                .filter(c => !selectedMedicoNome || normalizarTexto(nomeProfissionalLinha(c)) === normalizarTexto(selectedMedicoNome))
                .filter(c => {
                    const tipo = tipoTerapia(c);
                    return !tipo || tipo === filtroTerapia;
                })
                .sort((a, b) => new Date(a.datahoraConsulta) - new Date(b.datahoraConsulta));

        const linhasTabela = consultasHoje.map((consulta) => {
            const hora = new Date(consulta.datahoraConsulta).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const pacienteNome = nomePacienteLinha(consulta) || '—';
            const idade = (consulta?.painelIdade ?? null) !== null ? `${consulta.painelIdade} anos` : calcularIdade(consulta?.paciente?.dataNascimento || consulta?.paciente?.dtNasc);
            const convenio = consulta?.painelConvenio || obterConvenio(consulta?.paciente);
            const profissional = nomeProfissionalLinha(consulta) || '—';
            const status = consulta?.statusConsulta?.nomeStatus ?? 'Agendada';
            const sala = nomeSalaLinha(consulta);

            return `<tr>
    <td>${hora}</td>
    <td>${pacienteNome}</td>
    <td>${idade}</td>
    <td>${convenio}</td>
    <td>${profissional}</td>
    <td>${status}</td>
    <td>${sala}</td>
</tr>`;
        }).join('');

        const tabelaHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Horário</th>
                        <th>Paciente</th>
                        <th>Idade</th>
                        <th>Convênio</th>
                        <th>Profissional</th>
                        <th>Status</th>
                        <th>Sala</th>
                    </tr>
                </thead>
                <tbody>
                   ${linhasTabela || '<tr><td colspan="7">Sem agendamentos para o dia selecionado.</td></tr>'}
                </tbody>
            </table>
        `;

        const css = `
            body { font-family: Arial, sans-serif; padding: 16px; }
            h1 { font-size: 18px; margin: 0 0 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
            thead { background: #1976D2; color: #fff; }
        `;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<html><head><title>Painel do Dia</title><style>${css}</style></head><body>`);
        w.document.write(`<h1>${cabec}</h1>`);
        w.document.write(tabelaHtml);
        w.document.write('</body></html>');
        w.document.close();
        w.focus();
        w.print();
        w.close();
    }

    // Relatório de Faltas: botão baixa CSV com Paciente, Horário, Profissional e Status
    function configurarRelatorioFaltas() {
        const inputInicio = document.getElementById('faltaDataInicio');
        const inputFim = document.getElementById('faltaDataFim');
        const btn = document.getElementById('btnBaixarRelatorioFaltas');

        const hojeISO = new Date().toISOString().slice(0, 10);
        if (inputInicio && !inputInicio.value) inputInicio.value = hojeISO;
        if (inputFim && !inputFim.value) inputFim.value = hojeISO;

        async function getConsultasParaRelatorio() {
            const nivel = sessionStorage.getItem('PERMISSIONAMENTO_MEDICO') || '';
            const nomeMedico = `${sessionStorage.getItem('NOME_MEDICO') || ''} ${sessionStorage.getItem('SOBRENOME_MEDICO') || ''}`.trim();
            const dataInicio = inputInicio?.value;
            const dataFim = inputFim?.value;
            try {
                if (!dataInicio || !dataFim) return [];
                const inicio = new Date(`${dataInicio}T00:00:00`);
                const fim = new Date(`${dataFim}T00:00:00`);
                if (isNaN(inicio.getTime()) || isNaN(fim.getTime()) || inicio > fim) return [];

                const medicoFiltro = nivel.toLowerCase().includes('med') ? nomeMedico : '';
                const linhas = [];
                for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
                    const linhasDia = await buscarPainelDoDia(new Date(d), medicoFiltro || null, null);
                    (linhasDia || []).forEach((linha) => {
                        const consulta = normalizarLinhaPainelDoDia(linha, d);
                        linhas.push(consulta);
                    });
                }
                return linhas;
            } catch (e) {
                console.error(e);
                return [];
            }
        }

        function dentroDoIntervalo(dt, ini, fim) {
            const d = new Date(dt); d.setHours(0, 0, 0, 0);
            const a = new Date(ini); a.setHours(0, 0, 0, 0);
            const b = new Date(fim); b.setHours(0, 0, 0, 0);
            return d >= a && d <= b;
        }

        function toCSV(rows, sep = ';') {
            const esc = (v) => {
                const s = (v ?? '').toString().replace(/"/g, '""');
                return `"${s}"`;
            };
            const header = ['Data', 'Hora', 'Paciente', 'Profissional', 'Status'].map(esc).join(sep);
            const lines = rows.map(r => [r.data, r.hora, r.paciente, r.profissional, r.status].map(esc).join(sep));
            return [header, ...lines].join('\r\n');
        }

        if (btn) {
            btn.addEventListener('click', async () => {
                if (!inputInicio || !inputFim || !inputInicio.value || !inputFim.value) {
                    if (window.Swal) { Swal.fire({ icon: 'warning', title: 'Informe o período', text: 'Selecione data inicial e final.' }); }
                    return;
                }
                const inicio = inputInicio.value;
                const fim = inputFim.value;
                if (inicio > fim) {
                    if (window.Swal) { Swal.fire({ icon: 'warning', title: 'Período inválido', text: 'Data inicial não pode ser maior que a final.' }); }
                    return;
                }

                if (window.Swal && Swal.showLoading) Swal.showLoading();

                const consultas = await getConsultasParaRelatorio();
                const faltas = consultas.filter(c => {
                    const status = c?.statusConsulta?.nomeStatus ?? c?.painelStatus ?? '';
                    return status === 'Faltou' && c?.datahoraConsulta && dentroDoIntervalo(c.datahoraConsulta, inicio, fim);
                });

                const rows = faltas.map(c => {
                    const dt = new Date(c.datahoraConsulta);
                    const data = dt.toLocaleDateString('pt-BR');
                    const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const paciente = nomePacienteLinha(c);
                    const profissional = nomeProfissionalLinha(c);
                    const status = c?.statusConsulta?.nomeStatus ?? c?.painelStatus ?? '';
                    return { data, hora, paciente, profissional, status };
                });

                const csv = toCSV(rows);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio_faltas_${inicio}_a_${fim}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);

                if (window.Swal && Swal.close) Swal.close();
            });
        }
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
        await carregarMedicosFiltro();
        selectedMedicoNome = '';
        await atualizarAgenda([], painelDiaSelecionado);
        configurarMiniCalendario([]);
        configurarAcoesPainel([]);
    } else if (nivelPermissaoGlobal && nivelPermissaoGlobal.toLowerCase().includes('supervi')) {
        atualizarKPIs([]);
        await atualizarAgenda([], painelDiaSelecionado);
        configurarMiniCalendario([]);
        configurarAcoesPainel([]);
    } else {
        atualizarKPIs([]);
        await atualizarAgenda([], painelDiaSelecionado);
        configurarMiniCalendario([]);
        configurarAcoesPainel([]);
    }
    // Inicializa o relatório de faltas (usa permissões no momento do download)
    configurarRelatorioFaltas();
});
