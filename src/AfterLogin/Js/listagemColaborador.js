// Base da API: usa localhost em dev, vazio em produção
const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : '';

function abrirModalFiltro() {
    document.getElementById("modalFiltro").style.display = "block";
}

function fecharModalFiltro() {
    document.getElementById("modalFiltro").style.display = "none";
}

function limparFiltros() {
    document.getElementById('filtroNome').value = '';
    document.getElementById('filtroEmail').value = '';
    document.getElementById('filtroEspecialidade').value = '';
    document.getElementById('listaFiltrosAtivos').innerHTML = '';
    buscarMedicos()
}

function aplicarFiltros() {
    const nome = document.getElementById('filtroNome').value.toLowerCase().trim();
    const email = document.getElementById('filtroEmail').value.toLowerCase().trim();
    const especialidade = document.getElementById('filtroEspecialidade').value.toLowerCase().trim();

    const filtrosAtivos = [];

    if (nome) filtrosAtivos.push(`Nome: ${nome}`);
    if (email) filtrosAtivos.push(`Email: ${email}`);
    if (especialidade) filtrosAtivos.push(`Especialidade: ${especialidade}`);

    // Atualiza a lista de filtros ativos
    const listaFiltrosAtivos = document.getElementById('listaFiltrosAtivos');
    listaFiltrosAtivos.innerHTML = '';
    filtrosAtivos.forEach(filtro => {
        const li = document.createElement('li');
        li.textContent = filtro;
        listaFiltrosAtivos.appendChild(li);
    });

    // Chama buscarMedicos com os valores dos filtros
    // Nota: status não estava definido aqui; passando vazio para evitar erro de referência
    buscarMedicos(nome, email, especialidade, '');
}

// Estado: alterna entre ativos e inativos
let mostrarInativosColab = false;

async function buscarMedicos(nomeFiltro = '', emailFiltro = '', especialidadeFiltro = '', statusFiltro = '') {
    try {
        const nivelPermissao = sessionStorage.getItem("PERMISSIONAMENTO_MEDICO");
        const areaEspecializacaoSupervisor = sessionStorage.getItem("ESPECIFICACAO_MEDICA");
        const idMedicoLogado = Number(sessionStorage.getItem("ID_MEDICO"));

        const endpoint = mostrarInativosColab ? `${API_BASE}/mc/medicos/todos` : `${API_BASE}/mc/medicos`;
        const resposta = await fetch(endpoint);
        const listaMedicosAll = await resposta.json();

        // Filtra por status conforme toggle quando usando /todos
        const isAtivo = (v) => v === true || v === 1 || String(v).toLowerCase() === 'true';
        const listaMedicos = endpoint.endsWith('/todos')
            ? (listaMedicosAll || []).filter(m => mostrarInativosColab ? !isAtivo(m.ativo) : isAtivo(m.ativo))
            : (listaMedicosAll || []);

        let medicosFiltrados = listaMedicos.filter(medico => medico.id !== idMedicoLogado);

        if (nivelPermissao === "Supervisor") {
            medicosFiltrados = medicosFiltrados.filter(medico => {
                const especializacaoMedico = medico.especificacaoMedica?.area.trim().toLowerCase() || '';
                const isAdmin = medico.permissao.nome === "Admin";
                return especializacaoMedico === areaEspecializacaoSupervisor.toLowerCase() && !isAdmin;
            });
        }

        const medicosFiltradosFinal = medicosFiltrados.filter(medico => {
            const nomeCompleto = `${medico.nome} ${medico.sobrenome}`.toLowerCase();
            const isAtivo = medico.ativo ? 'Ativo' : 'Inativo';

            return (
                (nomeCompleto.includes(nomeFiltro) || nomeFiltro === '') &&
                (medico.email.toLowerCase().includes(emailFiltro) || emailFiltro === '') &&
                (medico.especificacaoMedica?.area.toLowerCase().includes(especialidadeFiltro) || especialidadeFiltro === '') &&
                (isAtivo === statusFiltro || statusFiltro === '')
            );
        });

        const cardsMedicos = document.getElementById("listagem");
        cardsMedicos.innerHTML = medicosFiltradosFinal.map((medico) => {
            const status = medico.ativo ? 'Ativo' : 'Inativo';
            const foto = medico.foto || "../Assets/perfil.jpeg";
            const statusAtivo = (medico.ativo === true || medico.ativo === 1 || String(medico.ativo).toLowerCase() === 'true');

            // Verifica se é Admin logado
            const isAdmin = nivelPermissao && nivelPermissao.toLowerCase().includes('admin');

            // Botão de permissões (apenas Admin pode ver)
            const botaoPermissoes = isAdmin ? `
                <button class="permissions" title="Gerenciar Permissões">
                    <i class="fas fa-key"></i>
                </button>` : '';

            let acoes = '';
            if (nivelPermissao !== "Supervisor") {
                if (mostrarInativosColab) {
                    acoes = `
                    <div class="actions">
                        <button class="view" onclick="abrirModalColaborador(${medico.id})" title="Ver">
                          <i class="fas fa-eye"></i>
                        </button>
                        <button class="activate" title="Ativar"><i class="fas fa-check" style="color:#2e7d32"></i></button>
                        ${botaoPermissoes}
                    </div>`;
                } else {
                    acoes = `
                    <div class="actions">
                        <button class="view" onclick="abrirModalColaborador(${medico.id})" title="Ver"><i class="fas fa-eye"></i></button>
                        <button class="delete" title="Inativar"><i class="fas fa-trash-alt" style="color:#e53935"></i></button>
                        ${botaoPermissoes}
                    </div>`;
                }
            }

            return `
                <div class="cardColaborador" data-medico-id="${medico.id}">
                    <span class="status-pill ${statusAtivo ? 'ativo' : 'inativo'}">${statusAtivo ? 'Ativo' : 'Inativo'}</span>
                    <img src="${foto}" alt="Foto do Colaborador">
                    <div class="info">
                        <div class="field"><label>Nome</label><p>${medico.nome} ${medico.sobrenome}</p></div>
                        <div class="field"><label>Email</label><p>${medico.email}</p></div>
                        <div class="field"><label>Especificação</label><p>${medico.especificacaoMedica.area}</p></div>
                        <div class="field"><label>Status</label><p>${status}</p></div>
                        <div class="field"><label>Permissão</label><p>${medico.permissao.nome}</p></div>
                    </div>
                    ${acoes}
                </div>`;
        }).join('');

        if (nivelPermissao !== "Supervisor") {
            cardsMedicos.querySelectorAll('.delete').forEach((botao) => {
                botao.addEventListener('click', function () {
                    const id = this.closest('.cardColaborador').dataset.medicoId;
                    if (id) {
                        Swal.fire({
                            title: 'Inativar colaborador?',
                            text: "Isso irá inativar o colaborador e ocultar suas consultas.",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Sim, inativar',
                            cancelButtonText: 'Cancelar'
                        }).then((result) => {
                            if (result.isConfirmed) inativarMedico(id);
                        });
                    }
                });
            });

            cardsMedicos.querySelectorAll('.update').forEach((botao) => {
                botao.addEventListener('click', function () {
                    const id = this.closest('.cardColaborador').dataset.medicoId;
                    if (id) window.location.href = `atualizarColaborador.html?id=${id}`;
                });
            });

            cardsMedicos.querySelectorAll('.activate').forEach((botao) => {
                botao.addEventListener('click', function () {
                    const id = this.closest('.cardColaborador').dataset.medicoId;
                    if (id) {
                        Swal.fire({
                            title: 'Ativar colaborador?',
                            text: 'O colaborador voltará à listagem ativa.',
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Sim, ativar',
                            cancelButtonText: 'Cancelar'
                        }).then((result) => {
                            if (result.isConfirmed) ativarMedico(id);
                        });
                    }
                });
            });

            // Adicionar evento aos botões de permissões
            cardsMedicos.querySelectorAll('.permissions').forEach((botao) => {
                botao.addEventListener('click', function () {
                    const id = this.closest('.cardColaborador').dataset.medicoId;
                    const nomeCompleto = this.closest('.cardColaborador').querySelector('.field:first-child p').textContent;
                    if (id) abrirModalPermissoes(id, nomeCompleto);
                });
            });
        }
    } catch (e) {
        console.error('Erro ao buscar Profissionais:', e);
    }
}

buscarMedicos();

// Inativa o colaborador (Médico) em vez de deletar
async function inativarMedico(id) {
    try {
        const colaboradorId = Number(id);
        const resp = await fetch(`${API_BASE}/mc/medicos/${colaboradorId}/inativar`, { method: 'PATCH' });
        if (!resp.ok) throw new Error(`Falha ao inativar: ${resp.status}`);

        const [respConsultas, respAcomps, respNotas] = await Promise.all([
            fetch(`${API_BASE}/mc/consultas`).catch(() => null),
            fetch(`${API_BASE}/mc/acompanhamentos`).catch(() => null),
            fetch(`${API_BASE}/mc/notas`).catch(() => null)
        ]);

        const consultasAll = respConsultas && respConsultas.ok ? await respConsultas.json().catch(() => []) : [];
        const acompAll = respAcomps && respAcomps.ok ? await respAcomps.json().catch(() => []) : [];
        const notasAll = respNotas && respNotas.ok ? await respNotas.json().catch(() => []) : [];

        // Apenas consultas pendentes/confirmadas e futuras devem ser removidas
        const getStatusNome = (c) => c?.statusConsulta?.nomeStatus ?? 'Agendada';
        const agora = new Date();
        const consultasDoColaborador = (consultasAll || []).filter(c => {
            if (!c?.medico?.id || c.medico.id !== colaboradorId) return false;
            const status = getStatusNome(c);
            const dataConsulta = c?.datahoraConsulta ? new Date(c.datahoraConsulta) : null;
            const isFutura = dataConsulta ? dataConsulta >= agora : true; // se faltar data, trata como futura para garantir remoção
            const isPendente = status === 'Agendada' || status === 'Confirmada';
            return isPendente && isFutura;
        });
        const consultaIds = new Set(consultasDoColaborador.map(c => c.id));

        await Promise.all((acompAll || [])
            .filter(a => a?.consulta?.id && consultaIds.has(a.consulta.id))
            .map(a => fetch(`${API_BASE}/mc/acompanhamentos/${a.id}`, { method: 'DELETE' }).catch(() => null))
        );

        await Promise.all((notasAll || [])
            .filter(n => (n?.consulta?.id && consultaIds.has(n.consulta.id)))
            .map(n => fetch(`${API_BASE}/mc/notas/${n.id}`, { method: 'DELETE' }).catch(() => null))
        );

        const delResults = await Promise.all(consultasDoColaborador.map(c =>
            fetch(`${API_BASE}/mc/consultas/${c.id}`, { method: 'DELETE' }).catch(() => null)
        ));
        const deletedCount = delResults.filter(r => r && r.ok).length;

        Swal.fire({
            icon: 'success',
            title: 'Colaborador inativado!',
            text: `Consultas removidas: ${deletedCount}.`,
            showConfirmButton: false,
            timer: 1800
        });
        buscarMedicos();
    } catch (erro) {
        console.error('Erro ao inativar colaborador:', erro);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao inativar',
            text: 'Não foi possível inativar o colaborador.',
        });
    }
}

// Ativa o colaborador
async function ativarMedico(id) {
    try {
        const colaboradorId = Number(id);
        const resp = await fetch(`${API_BASE}/mc/medicos/${colaboradorId}/ativar`, { method: 'PATCH' });
        if (!resp.ok) throw new Error(`Falha ao ativar: ${resp.status}`);
        Swal.fire({ icon: 'success', title: 'Colaborador ativado!', showConfirmButton: false, timer: 1200 });
        buscarMedicos();
    } catch (erro) {
        console.error('Erro ao ativar colaborador:', erro);
        Swal.fire({ icon: 'error', title: 'Erro ao ativar', text: 'Não foi possível ativar o colaborador.' });
    }
}

async function buscarKPIsMedico() {
    try {
        // Buscar o número total de médicos
        const respostaTotalMedicos = await fetch(`${API_BASE}/mc/medicos/todos`);
        const listaMedicos = await respostaTotalMedicos.json();
        const totalMedicos = listaMedicos.length;

        // Buscar o número de médicos ativos
        const respostaMedicosAtivos = await fetch(`${API_BASE}/mc/medicos`);
        const listaMedicosAtivos = await respostaMedicosAtivos.json();
        const medicosAtivos = listaMedicosAtivos.length;

        // Buscar o total de administradores
        const respostaTotalAdmins = await fetch(`${API_BASE}/mc/medicos/totalAdministradores`);
        const totalAdmins = await respostaTotalAdmins.json();

        // Buscar o número de administradores ativos
        const respostaAdminsAtivos = await fetch(`${API_BASE}/mc/medicos/totalAdministradoresAtivos`);
        const totalAdminsAtivos = await respostaAdminsAtivos.json();

        // Função para adicionar zero à esquerda se necessário
        const formatarNumero = (numero) => numero.toString().padStart(2, '0');

        // Atualizar os valores nos elementos HTML, com zero à esquerda
        document.querySelector('.cardKpi:nth-child(1) .kpiNumber').textContent = formatarNumero(totalMedicos);
        document.querySelector('.cardKpi:nth-child(2) .kpiNumber').textContent = formatarNumero(medicosAtivos);
        document.querySelector('.cardKpi:nth-child(3) .kpiNumber').textContent = formatarNumero(totalAdmins);
        document.querySelector('.cardKpi:nth-child(4) .kpiNumber').textContent = formatarNumero(totalAdminsAtivos);

    } catch (erro) {
        console.error('Erro ao buscar os dados dos KPIs:', erro);
    }
}

buscarKPIsMedico();

// Listener do toggle de inativos
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggleInativosColab');
    if (toggle) {
        // Restaura estado salvo do toggle
        const saved = sessionStorage.getItem('mostrarInativosColab') === 'true';
        toggle.checked = saved;
        mostrarInativosColab = saved;
        buscarMedicos();

        toggle.addEventListener('change', (e) => {
            mostrarInativosColab = e.target.checked;
            sessionStorage.setItem('mostrarInativosColab', String(mostrarInativosColab));
            buscarMedicos();
        });
    }
});

async function buscarAreasClinica() {
    try {
        const resposta = await fetch(`${API_BASE}/mc/especificacoes`);
        const listaAreas = await resposta.json();
        console.log('Áreas recebidas:', listaAreas);

        // Buscar profissionais para identificar áreas em uso
        let listaMedicosAll = [];
        try {
            const respTodos = await fetch(`${API_BASE}/mc/medicos/todos`);
            if (respTodos.ok) {
                listaMedicosAll = await respTodos.json();
            } else {
                const respAtivos = await fetch(`${API_BASE}/mc/medicos`);
                listaMedicosAll = respAtivos.ok ? await respAtivos.json() : [];
            }
        } catch (_) {
            listaMedicosAll = [];
        }
        const usoPorArea = new Map();
        (listaMedicosAll || []).forEach(m => {
            const areaId = m?.especificacaoMedica?.id;
            if (!areaId) return;
            usoPorArea.set(areaId, (usoPorArea.get(areaId) || 0) + 1);
        });

        const listaAreasContainer = document.getElementById("listagemAreas");
        listaAreasContainer.innerHTML = listaAreas.map((especificacao) => {
            const usados = usoPorArea.get(especificacao.id) || 0;
            const titleDel = usados > 0 ? `title="Área em uso por ${usados} profissional(is). Clique para reatribuir e excluir."` : 'title="Excluir área"';
            return `
                <div class="cardArea" data-area-id="${especificacao.id}">
                    <div class="info">
                        <p id="areaNome_${especificacao.id}">${especificacao.area}</p>
                        <input type="text" id="inputArea_${especificacao.id}" class="inputAtualizar" style="display: none;" placeholder="Atualizar área" value="${especificacao.area}">
                    </div>
                    <div class="actions">
                        <button class="update" onclick="toggleEditarArea(${especificacao.id})">Editar</button>
                        <button class="confirm" onclick="atualizarArea(${especificacao.id})" style="display: none;" id="botaoConfirmar_${especificacao.id}">✔</button>
                        <button class="delete" onclick="deletarArea(${especificacao.id})" ${titleDel}>Excluir</button>
                    </div>
                </div>`;
        }).join('');

    } catch (erro) {
        console.error('Erro ao buscar áreas:', erro);
    }
}

function toggleEditarArea(areaId) {
    const nomeArea = document.getElementById(`areaNome_${areaId}`);
    const inputArea = document.getElementById(`inputArea_${areaId}`);
    const botaoEditar = document.querySelector(`[onclick="toggleEditarArea(${areaId})"]`);
    const botaoConfirmar = document.getElementById(`botaoConfirmar_${areaId}`);

    // Alterna a exibição do nome da área e do campo de entrada
    const isEditing = inputArea.style.display === 'inline-block';
    nomeArea.style.display = isEditing ? 'block' : 'none';
    inputArea.style.display = isEditing ? 'none' : 'inline-block';
    botaoEditar.style.display = isEditing ? 'inline-block' : 'none';
    botaoConfirmar.style.display = isEditing ? 'none' : 'inline-block';

    // Se estiver editando, define o valor do campo como o nome atual
    if (!isEditing) {
        inputArea.value = nomeArea.textContent.trim();
    }
}

async function atualizarArea(areaId) {
    const inputArea = document.getElementById(`inputArea_${areaId}`);
    const novoNome = inputArea.value.trim();

    try {
        const resposta = await fetch(`${API_BASE}/mc/especificacoes/${areaId}`, {
            method: "PUT",
            body: JSON.stringify({ area: novoNome }),
            headers: { "Content-type": "application/json; charset=UTF-8" }
        });

        if (resposta.ok) {
            document.getElementById(`areaNome_${areaId}`).textContent = novoNome;
            toggleEditarArea(areaId); // Volta ao modo de visualização
            Swal.fire({
                icon: 'success',
                title: 'Área atualizada com sucesso!',
                showConfirmButton: false,
                timer: 1500
            });
        } else {
            throw new Error('Erro ao atualizar a área.');
        }
    } catch (error) {
        console.error('Erro ao atualizar a área:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao atualizar a área.',
            text: error.message
        });
    }
}

// Deleta uma área (especificação) por ID
async function deletarArea(areaId) {
    try {
        // Pré-checagem: impedir exclusão se houver profissionais vinculados
        try {
            const respMed = await fetch(`${API_BASE}/mc/medicos/todos`);
            const lista = respMed && respMed.ok ? await respMed.json() : [];
            const emUso = (lista || []).filter(m => m?.especificacaoMedica?.id === Number(areaId));
            if (emUso.length > 0) {
                // Oferecer reatribuição em massa para outra área antes de excluir
                // Carrega áreas disponíveis (exceto a atual)
                const respAreas = await fetch(`${API_BASE}/mc/especificacoes`);
                const areas = respAreas.ok ? await respAreas.json() : [];
                const outras = (areas || []).filter(a => Number(a.id) !== Number(areaId));
                if (!outras.length) {
                    if (window.Swal) {
                        await Swal.fire({ icon: 'info', title: 'Nenhuma outra área disponível', text: 'Cadastre outra área para poder reatribuir os profissionais.' });
                    } else {
                        alert('Nenhuma outra área disponível para reatribuição. Cadastre outra área.');
                    }
                    return;
                }

                const options = outras.map(a => `<option value="${a.id}">${a.area}</option>`).join('');
                const nomes = emUso.slice(0, 8).map(m => `${m.nome} ${m.sobrenome || ''}`.trim()).join('<br>');
                const { isConfirmed, value: areaDestinoId } = await Swal.fire({
                    icon: 'warning',
                    title: 'Área em uso',
                    html: `Esta área está associada a <b>${emUso.length}</b> profissional(is).<br><small>${nomes}${emUso.length > 8 ? '<br>…' : ''}</small><br><br>` +
                        `<div style="text-align:left">Selecione a nova área para reatribuir todos:<br>` +
                        `<select id="novaAreaSel" class="swal2-select" style="width:100%">${options}</select></div>`,
                    showCancelButton: true,
                    confirmButtonText: 'Reatribuir e excluir área',
                    cancelButtonText: 'Cancelar',
                    focusConfirm: false,
                    preConfirm: () => {
                        const sel = document.getElementById('novaAreaSel');
                        return sel ? sel.value : '';
                    }
                });
                if (!isConfirmed || !areaDestinoId) return;

                // Loader
                if (window.Swal) {
                    Swal.fire({ title: 'Reatribuindo…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                }

                // Reatribui cada profissional sequencialmente
                for (const med of emUso) {
                    try { await reatribuirMedicoParaArea(med.id, Number(areaDestinoId)); } catch (e) { console.warn('Falha ao reatribuir médico', med.id, e); }
                }

                // Tenta excluir a área original após reatribuição
                try {
                    const rdel = await fetch(`${API_BASE}/mc/especificacoes/${areaId}`, { method: 'DELETE' });
                    if (!rdel.ok) {
                        let msg = await rdel.text().catch(() => '');
                        if (window.Swal) { Swal.close(); }
                        throw new Error(msg || `Falha ao excluir área após reatribuição (status ${rdel.status}).`);
                    }
                    if (window.Swal) { Swal.close(); }
                    Swal.fire({ icon: 'success', title: 'Área reatribuída e excluída!', timer: 1600, showConfirmButton: false });
                    buscarAreasClinica();
                } catch (e) {
                    if (window.Swal) { Swal.fire({ icon: 'warning', title: 'Reatribuiu, mas não excluiu', text: e.message || 'Exclusão falhou. A área pode ainda estar em uso.' }); }
                }
                return;
            }
        } catch (_) { /* se falhar pré-checagem, segue para confirmação e tratará erro do backend */ }

        // Confirmação antes de excluir
        const confirmar = await (window.Swal ? Swal.fire({
            title: 'Excluir área?',
            text: 'Esta ação não poderá ser desfeita.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar'
        }) : Promise.resolve({ isConfirmed: confirm('Deseja excluir esta área?') }));

        if (!confirmar.isConfirmed) return;

        const resposta = await fetch(`${API_BASE}/mc/especificacoes/${areaId}`, { method: 'DELETE' });
        if (!resposta.ok) {
            let mensagem = await resposta.text().catch(() => '');
            const amigavel = (mensagem && /foreign key|Cannot delete or update a parent row/i.test(mensagem))
                ? 'Não é possível excluir: a área está vinculada a profissionais. Altere-os antes de excluir.'
                : (mensagem || `Falha ao excluir a área. Status ${resposta.status}`);
            throw new Error(amigavel);
        }

        if (window.Swal) {
            Swal.fire({ icon: 'success', title: 'Área excluída!', showConfirmButton: false, timer: 1400 });
        }
        // Recarrega a listagem no modal
        buscarAreasClinica();
    } catch (erro) {
        console.error('Erro ao excluir a área:', erro);
        if (window.Swal) {
            Swal.fire({ icon: 'error', title: 'Erro ao excluir', text: erro.message || 'Não foi possível excluir a área.' });
        } else {
            alert('Erro ao excluir a área.');
        }
    }
}

// Atualiza um médico para nova área preservando os demais campos
async function reatribuirMedicoParaArea(medicoId, novaAreaId) {
    // Busca dados completos do médico para montar payload compatível
    const r = await fetch(`${API_BASE}/mc/medicos/${medicoId}`);
    if (!r.ok) throw new Error(`Não foi possível ler médico ${medicoId}`);
    const j = await r.json();

    // Normaliza permissao para objeto {id}
    let permissaoObj = null;
    if (j.permissao) {
        if (typeof j.permissao === 'object' && j.permissao.id != null) permissaoObj = { id: Number(j.permissao.id) };
        else if (!isNaN(Number(j.permissao))) permissaoObj = { id: Number(j.permissao) };
    }

    const payload = {
        nome: j.nome || '',
        sobrenome: j.sobrenome || '',
        email: j.email || '',
        telefone: j.telefone || '',
        cpf: j.cpf || null,
        dataNascimento: j.dataNascimento || null,
        especificacaoMedica: { id: Number(novaAreaId) },
        carteirinha: j.carteirinha || null,
        senha: j.senha || null,
        permissao: permissaoObj,
        foto: j.foto || null
    };

    const rput = await fetch(`${API_BASE}/mc/medicos/${medicoId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!rput.ok) {
        const txt = await rput.text().catch(() => '');
        throw new Error(txt || `Falha ao atualizar médico ${medicoId}`);
    }
}



// Chama a função para listar as áreas ao carregar a página
buscarAreasClinica();


function abrirModal() {
    buscarAreasClinica();
    document.getElementById("modalArea").style.display = "flex";
}

function fecharModal() {
    document.getElementById("modalArea").style.display = "none";
}

async function cadastrarArea() {
    const nomeArea = document.getElementById("nomeArea").value;

    if (nomeArea.trim() === "") {
        alert("O nome da área não pode estar vazio.");
        return;
    }

    const dadosArea = {
        "area": nomeArea
    };

    try {
        const respostaCadastro = await fetch(`${API_BASE}/mc/especificacoes`, {
            method: "POST",
            body: JSON.stringify(dadosArea),
            headers: { "Content-type": "application/json; charset=UTF-8" }
        });

        console.log(respostaCadastro);
        console.log(respostaCadastro.status);

        if (respostaCadastro.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Área cadastrada com sucesso!',
                text: 'A nova área foi adicionada.',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                buscarAreasClinica(); // Recarrega a lista de áreas
                document.getElementById("nomeArea").value = ""; // Limpa o input
            });
        } else {
            alert("Ocorreu um erro ao cadastrar a área.");
        }
    } catch (error) {
        console.error("Erro ao realizar o cadastro:", error);
        alert("Erro de comunicação com o servidor.");
    }
}

// ===== SISTEMA DE PERMISSÕES INDIVIDUAIS =====

let colaboradorAtualId = null;

// Abre o modal de permissões
function abrirModalPermissoes(medicoId, nomeCompleto) {
    colaboradorAtualId = Number(medicoId);
    document.getElementById('nomeColaboradorPermissoes').textContent = `Colaborador: ${nomeCompleto}`;

    // Carrega permissões salvas
    carregarPermissoes(Number(medicoId));

    document.getElementById('modalPermissoes').style.display = 'flex';
}

// Fecha o modal de permissões
function fecharModalPermissoes() {
    document.getElementById('modalPermissoes').style.display = 'none';
    colaboradorAtualId = null;
}

// Carrega as permissões do colaborador
async function carregarPermissoes(medicoId) {
    try {
        // Busca permissões salvas no backend
        const resposta = await fetch(`${API_BASE}/mc/permissoes-individuais/buscar/${medicoId}`);
        const resultado = await resposta.json();

        if (resultado.permissoes) {
            const permissoes = JSON.parse(resultado.permissoes);

            // Marca os checkboxes de menus
            document.getElementById('perm_menu_Colaborador').checked = permissoes.menus.includes('Colaborador');
            document.getElementById('perm_menu_Paciente').checked = permissoes.menus.includes('Paciente');
            document.getElementById('perm_menu_Dash').checked = permissoes.menus.includes('Dash');
            document.getElementById('perm_menu_Lead').checked = permissoes.menus.includes('Lead');
            document.getElementById('perm_menu_AgendaDiaria').checked = permissoes.menus.includes('AgendaDiaria');

            // Marca os checkboxes de botões
            document.getElementById('perm_btn_btnAdicionarColaborador').checked = permissoes.botoes.includes('btnAdicionarColaborador');
            document.getElementById('perm_btn_addPacienteBtn').checked = permissoes.botoes.includes('addPacienteBtn');
            document.getElementById('perm_btn_btnAdicionarConsulta').checked = permissoes.botoes.includes('btnAdicionarConsulta');
            document.getElementById('perm_btn_btnAdicionarArea').checked = permissoes.botoes.includes('btnAdicionarArea');
        } else {
            // Se não houver permissões salvas, desmarca tudo
            document.querySelectorAll('#modalPermissoes input[type="checkbox"]').forEach(cb => cb.checked = false);
        }
    } catch (erro) {
        console.error('Erro ao carregar permissões:', erro);
        // Em caso de erro, desmarca tudo
        document.querySelectorAll('#modalPermissoes input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
}

// Salva as permissões do colaborador
async function salvarPermissoes() {
    if (!colaboradorAtualId) return;

    try {
        // Coleta menus marcados
        const menus = [];
        if (document.getElementById('perm_menu_Colaborador').checked) menus.push('Colaborador');
        if (document.getElementById('perm_menu_Paciente').checked) menus.push('Paciente');
        if (document.getElementById('perm_menu_Dash').checked) menus.push('Dash');
        if (document.getElementById('perm_menu_Lead').checked) menus.push('Lead');
        if (document.getElementById('perm_menu_AgendaDiaria').checked) menus.push('AgendaDiaria');

        // Coleta botões marcados
        const botoes = [];
        if (document.getElementById('perm_btn_btnAdicionarColaborador').checked) botoes.push('btnAdicionarColaborador');
        if (document.getElementById('perm_btn_addPacienteBtn').checked) botoes.push('addPacienteBtn');
        if (document.getElementById('perm_btn_btnAdicionarConsulta').checked) botoes.push('btnAdicionarConsulta');
        if (document.getElementById('perm_btn_btnAdicionarArea').checked) botoes.push('btnAdicionarArea');

        // Monta o objeto de permissões
        const permissoes = { menus, botoes };

        // Salva no backend
        const resposta = await fetch(`${API_BASE}/mc/permissoes-individuais/salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                medicoId: colaboradorAtualId,
                permissoes: JSON.stringify(permissoes)
            })
        });

        if (!resposta.ok) {
            throw new Error('Erro ao salvar permissões');
        }

        Swal.fire({
            icon: 'success',
            title: 'Permissões Salvas!',
            text: 'As permissões foram atualizadas com sucesso no banco de dados.',
            showConfirmButton: false,
            timer: 1500
        });

        fecharModalPermissoes();
    } catch (erro) {
        console.error('Erro ao salvar permissões:', erro);
        Swal.fire({
            icon: 'error',
            title: 'Erro!',
            text: 'Não foi possível salvar as permissões. Tente novamente.',
            confirmButtonText: 'OK'
        });
    }
}

function formatarCPF(cpf) {
  return cpf ? String(cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '';
}

function formatarTelefone(telefone) {
  const t = telefone ? String(telefone).replace(/\D/g, '') : '';
  if (t.length === 11) return t.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (t.length === 10) return t.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return telefone || '';
}

function obterInicioDaSemana(date) {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  const startDate = new Date(date);
  startDate.setDate(date.getDate() - diff);
  startDate.setHours(0, 0, 0, 0);
  return startDate;
}

function formatarData(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let dataInicioAtualColab = obterInicioDaSemana(new Date());
let consultasColabOriginais = [];
let bancoColabFiltrado = [];
let currentColabId = null;

const DIAS_SEMANA = [
  { value: 'SEGUNDA', label: 'Segunda', order: 1 },
  { value: 'TERCA', label: 'Terça', order: 2 },
  { value: 'QUARTA', label: 'Quarta', order: 3 },
  { value: 'QUINTA', label: 'Quinta', order: 4 },
  { value: 'SEXTA', label: 'Sexta', order: 5 },
  { value: 'SABADO', label: 'Sábado', order: 6 },
  { value: 'DOMINGO', label: 'Domingo', order: 7 }
];

function normalizarDia(raw) {
  if (!raw) return '';
  return String(raw).trim().toUpperCase();
}

function obterLabelDia(value) {
  const v = normalizarDia(value);
  const achou = DIAS_SEMANA.find(d => d.value === v);
  return achou ? achou.label : v;
}

function obterOrdemDia(value) {
  const v = normalizarDia(value);
  const achou = DIAS_SEMANA.find(d => d.value === v);
  return achou ? achou.order : 999;
}

function abrirModalColaborador(idMedico) {
  currentColabId = Number(idMedico);
  document.getElementById('modalBackdropColab').style.display = 'flex';

  fetch(`${API_BASE}/mc/medicos/${idMedico}`)
    .then(r => {
      if (!r.ok) throw new Error(`Falha ao carregar colaborador: ${r.status}`);
      return r.json();
    })
    .then(medico => {
      preencherDetalhesColab(medico);
      preencherCalendarioColab(medico.id);
      preencherCargaHoraria(medico.id);

      openTabColab(null, 'colab_detalhes');
      atualizarDisplayDataColab(dataInicioAtualColab);
    })
    .catch(err => {
      console.error(err);
      alert('Não foi possível carregar as informações do colaborador.');
    });
}

function fecharModalColaborador() {
  document.getElementById('modalBackdropColab').style.display = 'none';
  currentColabId = null;
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('closeModalColab');
  const backdrop = document.getElementById('modalBackdropColab');

  if (btn) btn.addEventListener('click', fecharModalColaborador);
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) fecharModalColaborador();
    });
  }
});

function openTabColab(event, tabId) {
  const tabs = document.querySelectorAll('#modalBackdropColab .content');
  tabs.forEach(t => t.classList.remove('show'));

  const alvo = document.getElementById(tabId);
  if (alvo) alvo.classList.add('show');

  document.querySelectorAll('#modalBackdropColab .tab-btn').forEach(b => b.classList.remove('active'));
  if (event && event.currentTarget) event.currentTarget.classList.add('active');

  if (tabId === 'colab_calendario') atualizarDisplayDataColab(dataInicioAtualColab);
  if (tabId === 'colab_carga') preencherCargaHoraria(currentColabId);
}

function preencherDetalhesColab(medico) {
  const foto = medico.foto || '../Assets/perfil.jpeg';
  const nome = `${medico.nome || ''} ${medico.sobrenome || ''}`.trim();

  document.getElementById('colabFoto').src = foto;
  document.getElementById('colabNome').textContent = nome || 'Nome não informado';
  document.getElementById('colabCPF').textContent = medico.cpf ? formatarCPF(medico.cpf) : 'CPF não informado';
  document.getElementById('colabPermissao').textContent = medico?.permissao?.nome || 'Não informado';

  document.getElementById('colabEmail').textContent = medico.email || 'Email não informado';
  document.getElementById('colabTelefone').textContent = medico.telefone ? formatarTelefone(medico.telefone) : 'Telefone não informado';
  document.getElementById('colabDataNascimento').textContent = medico.dataNascimento
    ? new Date(medico.dataNascimento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Não informada';

  document.getElementById('colabArea').textContent = medico?.especificacaoMedica?.area || 'Não informada';
  document.getElementById('colabStatus').textContent = (medico.ativo === true || medico.ativo === 1 || String(medico.ativo).toLowerCase() === 'true')
    ? 'Ativo'
    : 'Inativo';
}

function preencherCalendarioColab(medicoId) {
  currentColabId = Number(medicoId);
  buscarConsultasColaborador(medicoId);
}

async function buscarConsultasColaborador(medicoId) {
  try {
    const resposta = await fetch(`${API_BASE}/mc/consultas`);
    if (!resposta.ok) throw new Error(`HTTP error: ${resposta.status}`);
    const todasConsultas = await resposta.json();

    consultasColabOriginais = (todasConsultas || []).filter(c => {
      const isThis = c?.medico?.id === Number(medicoId);
      const medicoAtivo = c?.medico?.ativo !== false;
      const pacienteAtivo = c?.paciente?.ativo !== false;
      return isThis && medicoAtivo && pacienteAtivo;
    });

    bancoColabFiltrado = filtrarConsultasColabPorPermissao(consultasColabOriginais);
    atualizarDisplayCalendarioColab(bancoColabFiltrado);
  } catch (error) {
    console.error('Erro ao buscar consultas do colaborador:', error);
  }
}

function filtrarConsultasColabPorPermissao(lista) {
  const permissao = (sessionStorage.getItem('PERMISSIONAMENTO_MEDICO') || '').toLowerCase();
  const idMedicoLogado = Number(sessionStorage.getItem('ID_MEDICO'));
  const areaSupervisor = (sessionStorage.getItem('ESPECIFICACAO_MEDICA') || '').toLowerCase();

  if (permissao.includes('admin')) return lista;

  if (permissao.includes('supervi')) {
    return (lista || []).filter(c => {
      const area = (c?.especificacaoMedica?.area || c?.medico?.especificacaoMedica?.area || '').toLowerCase();
      return area && areaSupervisor && area.includes(areaSupervisor);
    });
  }

  if (permissao.includes('medic') || permissao.includes('profiss')) {
    return (lista || []).filter(c => Number(c?.medico?.id) === idMedicoLogado);
  }

  return lista;
}
function irParaEdicaoColaborador() {
  if (!currentColabId) return
  window.location.href = `atualizarColaborador.html?id=${currentColabId}`
}

function bindBotaoEditarColab() {
  const btn = document.getElementById('btnEditarColab')
  if (!btn) return

  btn.onclick = irParaEdicaoColaborador
}

document.addEventListener('DOMContentLoaded', () => {
  bindBotaoEditarColab()
})


function atualizarDisplayDataColab(startDate) {
  dataInicioAtualColab = obterInicioDaSemana(startDate);
  const endDate = new Date(dataInicioAtualColab);
  endDate.setDate(dataInicioAtualColab.getDate() + 4);

  const options = { day: '2-digit', month: 'long' };
  const startStr = `${dataInicioAtualColab.toLocaleDateString('pt-BR', options)} ${dataInicioAtualColab.getFullYear()}`;
  const endStr = `${endDate.toLocaleDateString('pt-BR', options)} ${endDate.getFullYear()}`;

  const diasEl = document.getElementById('diasColab');
  if (diasEl) diasEl.innerText = `${startStr} - ${endStr}`;

  atualizarDiasDaSemanaColab(dataInicioAtualColab);
}

function atualizarDiasDaSemanaColab(startDate) {
  const diasSemanaElement = document.getElementById('diasSemanaColab');
  if (!diasSemanaElement) return;

  diasSemanaElement.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const options = { weekday: 'short', day: '2-digit' };
    const dayStr = currentDate.toLocaleDateString('pt-BR', options);

    const dayElement = document.createElement('div');
    dayElement.className = 'day';
    dayElement.innerText = dayStr;

    diasSemanaElement.appendChild(dayElement);
  }

  atualizarDisplayCalendarioColab(bancoColabFiltrado);
}

function atualizarDisplayCalendarioColab(consultas) {
  const colunas = document.getElementById('colunasTarefasColab');
  if (!colunas) return;

  colunas.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    const diaAtual = new Date(dataInicioAtualColab);
    diaAtual.setDate(dataInicioAtualColab.getDate() + i);

    const tarefas = (consultas || []).filter(c =>
      String(c?.datahoraConsulta || '').startsWith(formatarData(diaAtual))
    );

    const colunaElement = document.createElement('div');
    colunaElement.className = 'column';

    if (!tarefas.length) {
      const noTaskElement = document.createElement('div');
      noTaskElement.className = 'task inactive';
      noTaskElement.innerText = 'Sem tarefas';
      colunaElement.appendChild(noTaskElement);
    } else {
      tarefas.forEach(consulta => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task';
        taskElement.innerText = consulta.descricao || 'Consulta';

        taskElement.onclick = () => abrirDetalhesTarefaColab(consulta);

        colunaElement.appendChild(taskElement);
      });
    }

    colunas.appendChild(colunaElement);
  }
}

function semanaPassadaColab() {
  dataInicioAtualColab.setDate(dataInicioAtualColab.getDate() - 7);
  atualizarDisplayDataColab(dataInicioAtualColab);
}

function proximaSemanaColab() {
  dataInicioAtualColab.setDate(dataInicioAtualColab.getDate() + 7);
  atualizarDisplayDataColab(dataInicioAtualColab);
}

function abrirDetalhesTarefaColab(consulta) {
  const dataHora = consulta?.datahoraConsulta ? new Date(consulta.datahoraConsulta) : null;
  const dataFormatada = dataHora ? dataHora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Não informada';
  const horaFormatada = dataHora ? dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Não informada';

  const pacienteNome = consulta?.paciente ? `${consulta.paciente.nome || ''} ${consulta.paciente.sobrenome || ''}`.trim() : 'Desconhecido';
  const medicoNome = consulta?.medico ? `${consulta.medico.nome || ''} ${consulta.medico.sobrenome || ''}`.trim() : 'Desconhecido';
  const area = consulta?.medico?.especificacaoMedica?.area || consulta?.especificacaoMedica?.area || 'Desconhecida';
  const status = consulta?.statusConsulta?.nomeStatus || 'Desconhecido';
  const duracao = consulta?.duracaoConsulta ?? consulta?.duracao ?? '—';

  const detalhesDiv = document.getElementById('detalhesTarefaColab');
  if (!detalhesDiv) return;

  detalhesDiv.innerHTML = `
    <p><strong>Descrição:</strong> ${consulta?.descricao || 'Sem descrição'}</p>
    <p><strong>Data e Hora:</strong> ${dataFormatada} às ${horaFormatada}</p>
    <p><strong>Paciente:</strong> ${pacienteNome}</p>
    <p><strong>Profissional:</strong> ${medicoNome} - ${area}</p>
    <p><strong>Status:</strong> ${status}</p>
    <p><strong>Duração:</strong> ${duracao}</p>
  `;

  const modal = document.getElementById('modalDetalhesTarefaColab');
  if (modal) modal.style.display = 'flex';
}

function fecharModalDetalhesColab() {
  const modal = document.getElementById('modalDetalhesTarefaColab');
  if (modal) modal.style.display = 'none';
}

function criarLinhaCargaView(item) {
  const diaVal = normalizarDia(item?.diaSemana || item?.dia_semana || item?.dia || item?.diaSemanaEnum);
  const inicioVal = String(item?.horaInicio || item?.hora_inicio || item?.inicio || '').slice(0, 5);
  const fimVal = String(item?.horaFim || item?.hora_fim || item?.fim || '').slice(0, 5);

  const row = document.createElement('div');
  row.className = 'carga-row';

  row.innerHTML = `
    <select class="carga-dia" disabled>
      ${DIAS_SEMANA.map(d => `<option value="${d.value}">${d.label}</option>`).join('')}
    </select>

    <input type="time" class="carga-inicio" disabled>
    <input type="time" class="carga-fim" disabled>
  `;

  const sel = row.querySelector('.carga-dia');
  const ini = row.querySelector('.carga-inicio');
  const fim = row.querySelector('.carga-fim');

  if (sel) sel.value = diaVal || 'SEGUNDA';
  if (ini) ini.value = inicioVal || '';
  if (fim) fim.value = fimVal || '';

  return row;
}

async function preencherCargaHoraria(medicoId) {
  if (!medicoId) return;

  const box = document.getElementById('cargaHorariaView');
  const msg = document.getElementById('cargaViewMsg');
  if (!box) return;

  box.innerHTML = '';
  if (msg) msg.textContent = 'Carregando...';

  try {
    const r = await fetch(`${API_BASE}/mc/carga-horaria/medico/${medicoId}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const lista = await r.json();

    const dados = Array.isArray(lista) ? lista : [];
    dados.sort((a, b) => {
      const da = obterOrdemDia(a?.diaSemana || a?.dia_semana);
      const db = obterOrdemDia(b?.diaSemana || b?.dia_semana);
      if (da !== db) return da - db;
      const ia = String(a?.horaInicio || a?.hora_inicio || '').slice(0, 5);
      const ib = String(b?.horaInicio || b?.hora_inicio || '').slice(0, 5);
      return ia.localeCompare(ib);
    });

    if (!dados.length) {
      if (msg) msg.textContent = 'Sem carga horária cadastrada.';
      return;
    }

    if (msg) msg.textContent = '';

    dados.forEach(item => {
      box.appendChild(criarLinhaCargaView(item));
    });
  } catch (e) {
    console.error(e);
    if (msg) msg.textContent = 'Falha ao carregar a carga horária.';
  }
}

let cargaEditando = false
let cargaCache = []

function btn(id) {
  return document.getElementById(id)
}

function setTexto(el, txt) {
  if (el) el.textContent = txt
}

function isHoraValida(inicio, fim) {
  if (!inicio || !fim) return false
  return inicio < fim
}

function criarLinhaCargaView(item, editavel) {
  const diaVal = normalizarDia(item?.diaSemana || item?.dia_semana || item?.dia || item?.diaSemanaEnum) || 'SEGUNDA'
  const inicioVal = String(item?.horaInicio || item?.hora_inicio || item?.inicio || '').slice(0, 5)
  const fimVal = String(item?.horaFim || item?.hora_fim || item?.fim || '').slice(0, 5)

  const row = document.createElement('div')
  row.className = 'carga-row'
  row.innerHTML = `
    <select class="carga-dia">
      ${DIAS_SEMANA.map(d => `<option value="${d.value}">${d.label}</option>`).join('')}
    </select>

    <input type="time" class="carga-inicio">
    <input type="time" class="carga-fim">

    <button type="button" class="carga-remover" style="display:none">X</button>
  `

  const sel = row.querySelector('.carga-dia')
  const ini = row.querySelector('.carga-inicio')
  const fim = row.querySelector('.carga-fim')
  const rem = row.querySelector('.carga-remover')

  if (sel) sel.value = diaVal
  if (ini) ini.value = inicioVal || ''
  if (fim) fim.value = fimVal || ''

  if (!editavel) {
    if (sel) sel.disabled = true
    if (ini) ini.disabled = true
    if (fim) fim.disabled = true
  } else {
    if (rem) {
      rem.style.display = 'inline-flex'
      rem.addEventListener('click', () => {
        const box = document.getElementById('cargaHorariaView')
        if (!box) return
        const total = box.querySelectorAll('.carga-row').length
        if (total <= 1) return
        row.remove()
      })
    }
  }

  return row
}

function renderCargaHoraria(dados, editavel) {
  const box = document.getElementById('cargaHorariaView')
  const msg = document.getElementById('cargaViewMsg')
  if (!box) return

  box.innerHTML = ''

  const lista = Array.isArray(dados) ? dados : []

  if (!lista.length && !editavel) {
    setTexto(msg, 'Sem carga horária cadastrada.')
    return
  }

  setTexto(msg, '')

  const ordenado = [...lista]
  ordenado.sort((a, b) => {
    const da = obterOrdemDia(a?.diaSemana || a?.dia_semana)
    const db = obterOrdemDia(b?.diaSemana || b?.dia_semana)
    if (da !== db) return da - db
    const ia = String(a?.horaInicio || a?.hora_inicio || '').slice(0, 5)
    const ib = String(b?.horaInicio || b?.hora_inicio || '').slice(0, 5)
    return ia.localeCompare(ib)
  })

  if (editavel && !ordenado.length) {
    box.appendChild(criarLinhaCargaView({}, true))
    return
  }

  ordenado.forEach(item => {
    box.appendChild(criarLinhaCargaView(item, editavel))
  })
}

function coletarCargaHorariaDoModal() {
  const box = document.getElementById('cargaHorariaView')
  if (!box) return null

  const rows = box.querySelectorAll('.carga-row')
  if (!rows.length) return null

  const horarios = []

  for (const r of rows) {
    const dia = r.querySelector('.carga-dia')?.value || ''
    const inicio = r.querySelector('.carga-inicio')?.value || ''
    const fim = r.querySelector('.carga-fim')?.value || ''

    if (!dia || !isHoraValida(inicio, fim)) return null

    horarios.push({
      diaSemana: dia,
      horaInicio: inicio,
      horaFim: fim
    })
  }

  return horarios
}

function cargaEndpoint(medicoId) {
  return `${API_BASE}/mc/carga-horaria/medico/${medicoId}`
}

async function deletarCargaHorariaDoMedico(medicoId) {
  const resp = await fetch(cargaEndpoint(medicoId), { method: 'DELETE' })
  if (resp.ok) return true

  // Se o backend devolver 404 quando não existe carga, ignora
  if (resp.status === 404) return true

  const txt = await resp.text().catch(() => '')
  throw new Error(txt || `Falha ao apagar carga horária. Status ${resp.status}`)
}

async function salvarCargaHorariaModal(medicoId, cargaHoraria) {
  const tinhaCargaAntes = Array.isArray(cargaCache) && cargaCache.length > 0

  if (tinhaCargaAntes) {
    await deletarCargaHorariaDoMedico(medicoId)
  }

  const post = await fetch(cargaEndpoint(medicoId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(cargaHoraria)
  })

  if (!post.ok) {
    const txt = await post.text().catch(() => '')
    throw new Error(txt || `Falha ao salvar carga horária. Status ${post.status}`)
  }

  // Recarrega do backend para manter o cache consistente
  try {
    const r = await fetch(cargaEndpoint(medicoId))
    if (r.ok) {
      const lista = await r.json()
      cargaCache = Array.isArray(lista) ? lista : []
    } else {
      cargaCache = cargaHoraria
    }
  } catch (_) {
    cargaCache = cargaHoraria
  }

  return true
}


function setModoEdicaoCarga(on) {
  cargaEditando = on

  const bEdit = btn('btnEditarCargaColab')
  const bAdd = btn('btnAddCargaColab')
  const bSave = btn('btnSalvarCargaColab')

  if (bEdit) bEdit.style.display = on ? 'none' : 'inline-flex'
  if (bAdd) bAdd.style.display = on ? 'inline-flex' : 'none'
  if (bSave) bSave.style.display = on ? 'inline-flex' : 'none'

  renderCargaHoraria(cargaCache, on)
}

function bindEdicaoCarga() {
  const bEdit = btn('btnEditarCargaColab')
  const bAdd = btn('btnAddCargaColab')
  const bSave = btn('btnSalvarCargaColab')

  if (bEdit) {
    bEdit.addEventListener('click', () => {
      setModoEdicaoCarga(true)
    })
  }

  if (bAdd) {
    bAdd.addEventListener('click', () => {
      const box = document.getElementById('cargaHorariaView')
      if (!box) return
      box.appendChild(criarLinhaCargaView({}, true))
    })
  }

  if (bSave) {
    bSave.addEventListener('click', async () => {
      if (!currentColabId) return

      const carga = coletarCargaHorariaDoModal()
      if (!carga) {
        if (window.Swal) {
          Swal.fire({
            icon: 'error',
            title: 'Carga horária inválida',
            text: 'Preencha dia, início e fim. Início precisa ser menor que fim.'
          })
        }
        return
      }

      try {
        if (window.Swal) {
          Swal.fire({ title: 'Salvando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() })
        }

        await salvarCargaHorariaModal(currentColabId, carga)

        if (window.Swal) Swal.close()

        cargaCache = carga
        setModoEdicaoCarga(false)

        if (window.Swal) {
          Swal.fire({ icon: 'success', title: 'Carga horária salva', showConfirmButton: false, timer: 1200 })
        }
      } catch (e) {
        if (window.Swal) {
          Swal.fire({ icon: 'error', title: 'Falha ao salvar', text: e?.message || 'Erro' })
        }
      }
    })
  }
}

async function preencherCargaHoraria(medicoId) {
  if (!medicoId) return

  const msg = document.getElementById('cargaViewMsg')
  setTexto(msg, 'Carregando...')

  try {
    const r = await fetch(`${API_BASE}/mc/carga-horaria/medico/${medicoId}`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const lista = await r.json()

    cargaCache = Array.isArray(lista) ? lista : []
    setModoEdicaoCarga(false)
  } catch (e) {
    console.error(e)
    cargaCache = []
    setModoEdicaoCarga(false)
    setTexto(msg, 'Falha ao carregar a carga horária.')
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bindEdicaoCarga()
})



