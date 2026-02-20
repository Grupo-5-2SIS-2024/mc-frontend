// Base da API: usa localhost em dev, vazio em produção
const API_BASE = window.location.origin.includes('localhost')
  ? 'http://localhost:8080/mc'
  : '/mc'

// Verificação de permissão - Apenas Admin pode acessar
(function verificarPermissao() {
    const permissao = sessionStorage.getItem("PERMISSIONAMENTO_MEDICO");
    
    if (!permissao || !permissao.toLowerCase().includes("admin")) {
        Swal.fire({
            icon: 'error',
            title: 'Acesso Negado',
            text: 'Apenas administradores podem acessar esta página.',
            confirmButtonColor: '#00796b'
        }).then(() => {
            window.location.href = 'homePosLoginMedico.html';
        });
    }
})();

// Função helper para obter headers com permissão
function getHeaders() {
    const permissao = sessionStorage.getItem("PERMISSIONAMENTO_MEDICO");
    return {
        'Content-Type': 'application/json',
        'Nivel-Acesso': permissao || ''
    };
}

// Variáveis globais
let convenios = [];
let convenioSelecionado = null;
let filtroAtual = 'todos';

// Inicializa a página
document.addEventListener('DOMContentLoaded', function() {
    carregarConvenios();
    configurarEventos();
});

// Configura os eventos da página
function configurarEventos() {
    // Filtro de busca
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        filtrarConvenios();
    });
    
    // Tabs de filtro
    const tabs = document.querySelectorAll('.tab-button');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            filtroAtual = this.getAttribute('data-filter');
            filtrarConvenios();
        });
    });
    
    // Modal de detalhes
    const modal = document.getElementById('modalDetalhes');
    const span = document.getElementsByClassName('close')[0];
    span.onclick = function() {
        modal.style.display = 'none';
    }
    
    // Modal de edição
    const modalEdit = document.getElementById('modalEdicao');
    const spanEdit = document.getElementsByClassName('close-edit')[0];
    spanEdit.onclick = function() {
        modalEdit.style.display = 'none';
    }
    
    // Fecha modal ao clicar fora
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
        if (event.target == modalEdit) {
            modalEdit.style.display = 'none';
        }
    }
}

// Carrega os convênios da API
async function carregarConvenios() {
    try {
        const response = await fetch(`${API_BASE}/convenios`);
        
        if (response.status === 204) {
            convenios = [];
            mostrarEstadoVazio();
            return;
        }
        
        if (response.ok) {
            convenios = await response.json();
            filtrarConvenios();
        } else {
            throw new Error('Erro ao carregar convênios');
        }
    } catch (error) {
        console.error('Erro:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro ao carregar convênios. Tente novamente.',
            confirmButtonColor: '#00796b'
        });
    }
}

// Filtra os convênios com base na busca e no filtro ativo
function filtrarConvenios() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let conveniosFiltrados = convenios.filter(convenio => {
        // Filtro de status
        if (filtroAtual === 'ativos' && !convenio.ativo) return false;
        if (filtroAtual === 'inativos' && convenio.ativo) return false;
        
        // Filtro de busca
        if (searchTerm) {
            const nome = convenio.nome.toLowerCase();
            const descricao = convenio.descricao ? convenio.descricao.toLowerCase() : '';
            return nome.includes(searchTerm) || descricao.includes(searchTerm);
        }
        
        return true;
    });
    
    renderizarConvenios(conveniosFiltrados);
}

// Renderiza os convênios na tela
function renderizarConvenios(conveniosFiltrados) {
    const grid = document.getElementById('conveniosGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (conveniosFiltrados.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    grid.innerHTML = conveniosFiltrados.map(convenio => `
        <div class="convenio-card ${!convenio.ativo ? 'inativo' : ''}" onclick="abrirDetalhes(${convenio.id})">
            <div class="convenio-header">
                <h3>${convenio.nome}</h3>
                <span class="status-badge ${convenio.ativo ? 'ativo' : 'inativo'}">
                    ${convenio.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </div>
            <p class="convenio-descricao">${convenio.descricao || 'Sem descrição'}</p>
            <div class="convenio-footer">
                <span class="planos-count">
                    <i class="fa-solid fa-file-medical"></i>
                    ${convenio.planos ? convenio.planos.length : 0} planos
                </span>
                <button class="btn-ver-mais" onclick="event.stopPropagation(); abrirDetalhes(${convenio.id})">
                    Ver detalhes <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Mostra o estado vazio
function mostrarEstadoVazio() {
    const grid = document.getElementById('conveniosGrid');
    const emptyState = document.getElementById('emptyState');
    grid.style.display = 'none';
    emptyState.style.display = 'flex';
}

// Abre o modal de detalhes do convênio
async function abrirDetalhes(convenioId) {
    try {
        const response = await fetch(`${API_BASE}/convenios/${convenioId}`);
        
        if (response.ok) {
            convenioSelecionado = await response.json();
            
            document.getElementById('modalTitulo').textContent = convenioSelecionado.nome;
            document.getElementById('modalDescricao').textContent = convenioSelecionado.descricao || 'Sem descrição';
            
            const planosHtml = convenioSelecionado.planos && convenioSelecionado.planos.length > 0
                ? convenioSelecionado.planos.map(plano => `
                    <div class="plano-badge ${!plano.ativo ? 'inativo' : ''}">
                        <i class="fa-solid fa-file-medical"></i>
                        ${plano.nome}
                        ${!plano.ativo ? '<span class="plano-status">(Inativo)</span>' : ''}
                    </div>
                  `).join('')
                : '<p>Nenhum plano cadastrado</p>';
            
            document.getElementById('modalPlanos').innerHTML = planosHtml;
            
            // Atualiza o botão de status
            const btnToggle = document.getElementById('btnToggleStatus');
            const statusText = document.getElementById('statusText');
            if (convenioSelecionado.ativo) {
                statusText.textContent = 'Inativar';
                btnToggle.innerHTML = '<i class="fa-solid fa-toggle-off"></i> Inativar';
            } else {
                statusText.textContent = 'Ativar';
                btnToggle.innerHTML = '<i class="fa-solid fa-toggle-on"></i> Ativar';
            }
            
            document.getElementById('modalDetalhes').style.display = 'block';
        } else {
            throw new Error('Erro ao carregar detalhes do convênio');
        }
    } catch (error) {
        console.error('Erro:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro ao carregar detalhes do convênio',
            confirmButtonColor: '#00796b'
        });
    }
}

// Abre o modal de edição
function editarConvenio() {
    if (!convenioSelecionado) return;
    
    document.getElementById('modalDetalhes').style.display = 'none';
    
    document.getElementById('editNomeConvenio').value = convenioSelecionado.nome;
    document.getElementById('editDescricaoConvenio').value = convenioSelecionado.descricao || '';
    
    // Renderiza os planos existentes
    renderizarPlanosEdit();
    
    document.getElementById('modalEdicao').style.display = 'block';
}

// Renderiza os planos no modal de edição
function renderizarPlanosEdit() {
    const listaPlanosEdit = document.getElementById('listaPlanosEdit');
    
    if (!convenioSelecionado.planos || convenioSelecionado.planos.length === 0) {
        listaPlanosEdit.innerHTML = '<p class="no-planos">Nenhum plano cadastrado</p>';
        return;
    }
    
    listaPlanosEdit.innerHTML = convenioSelecionado.planos.map((plano, index) => `
        <div class="plano-item-edit" data-plano-id="${plano.id}">
            <div class="plano-inputs-edit">
                <div class="input">
                    <input class="input__field" id="editNomePlano_${plano.id}" type="text" value="${plano.nome}" required />
                    <label for="editNomePlano_${plano.id}" class="input__label">Nome do Plano</label>
                </div>
                <div class="input">
                    <textarea class="input__field textarea" id="editDescricaoPlano_${plano.id}" rows="2">${plano.descricao || ''}</textarea>
                    <label for="editDescricaoPlano_${plano.id}" class="input__label">Descrição</label>
                </div>
                <div class="plano-actions">
                    <button type="button" class="btn-toggle-plano ${plano.ativo ? 'ativo' : 'inativo'}" 
                            onclick="togglePlanoStatus(${plano.id})">
                        <i class="fa-solid fa-toggle-${plano.ativo ? 'on' : 'off'}"></i>
                        ${plano.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                    <button type="button" class="btn-remover-plano-edit" onclick="removerPlanoEdit(${plano.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Adiciona um novo plano no modal de edição
function adicionarPlanoEdit() {
    const listaPlanosEdit = document.getElementById('listaPlanosEdit');
    
    // Remove mensagem de "nenhum plano" se existir
    const noPlanos = listaPlanosEdit.querySelector('.no-planos');
    if (noPlanos) noPlanos.remove();
    
    const newPlanoId = 'new_' + Date.now();
    
    const planoDiv = document.createElement('div');
    planoDiv.className = 'plano-item-edit';
    planoDiv.setAttribute('data-plano-id', newPlanoId);
    
    planoDiv.innerHTML = `
        <div class="plano-inputs-edit">
            <div class="input">
                <input class="input__field" id="editNomePlano_${newPlanoId}" type="text" required />
                <label for="editNomePlano_${newPlanoId}" class="input__label">Nome do Plano</label>
            </div>
            <div class="input">
                <textarea class="input__field textarea" id="editDescricaoPlano_${newPlanoId}" rows="2"></textarea>
                <label for="editDescricaoPlano_${newPlanoId}" class="input__label">Descrição</label>
            </div>
            <div class="plano-actions">
                <button type="button" class="btn-toggle-plano ativo" onclick="togglePlanoStatusLocal('${newPlanoId}')">
                    <i class="fa-solid fa-toggle-on"></i> Ativo
                </button>
                <button type="button" class="btn-remover-plano-edit" onclick="removerPlanoEditLocal('${newPlanoId}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    listaPlanosEdit.appendChild(planoDiv);
}

// Remove plano localmente (novo plano ainda não salvo)
function removerPlanoEditLocal(planoId) {
    const planoElement = document.querySelector(`[data-plano-id="${planoId}"]`);
    if (planoElement) {
        planoElement.remove();
    }
    
    const listaPlanosEdit = document.getElementById('listaPlanosEdit');
    if (listaPlanosEdit.children.length === 0) {
        listaPlanosEdit.innerHTML = '<p class="no-planos">Nenhum plano cadastrado</p>';
    }
}

// Toggle status do plano localmente
function togglePlanoStatusLocal(planoId) {
    const btn = event.target.closest('.btn-toggle-plano');
    const isAtivo = btn.classList.contains('ativo');
    
    if (isAtivo) {
        btn.classList.remove('ativo');
        btn.classList.add('inativo');
        btn.innerHTML = '<i class="fa-solid fa-toggle-off"></i> Inativo';
    } else {
        btn.classList.remove('inativo');
        btn.classList.add('ativo');
        btn.innerHTML = '<i class="fa-solid fa-toggle-on"></i> Ativo';
    }
}

// Remove plano existente
async function removerPlanoEdit(planoId) {
    const result = await Swal.fire({
        icon: 'warning',
        title: 'Confirmar exclusão',
        text: 'Deseja realmente excluir este plano?',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#00796b',
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        try {
            const response = await fetch(`${API_BASE}/planos/${planoId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            
            if (response.ok || response.status === 204) {
                Swal.fire({
                    icon: 'success',
                    title: 'Sucesso',
                    text: 'Plano excluído com sucesso',
                    confirmButtonColor: '#00796b',
                    timer: 1500
                });
                
                const planoElement = document.querySelector(`[data-plano-id="${planoId}"]`);
                if (planoElement) planoElement.remove();
                
                const listaPlanosEdit = document.getElementById('listaPlanosEdit');
                if (listaPlanosEdit.children.length === 0) {
                    listaPlanosEdit.innerHTML = '<p class="no-planos">Nenhum plano cadastrado</p>';
                }
                
                // Atualiza os dados do convênio selecionado
                convenioSelecionado.planos = convenioSelecionado.planos.filter(p => p.id !== planoId);
            } else {
                throw new Error('Erro ao excluir plano');
            }
        } catch (error) {
            console.error('Erro:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Erro ao excluir plano',
                confirmButtonColor: '#00796b'
            });
        }
    }
}

// Toggle status do plano existente
async function togglePlanoStatus(planoId) {
    const plano = convenioSelecionado.planos.find(p => p.id === planoId);
    if (!plano) return;
    
    const novoStatus = !plano.ativo;
    const endpoint = novoStatus ? 'ativar' : 'inativar';
    
    try {
        const response = await fetch(`${API_BASE}/planos/${planoId}/${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders()
        });
        
        if (response.ok) {
            plano.ativo = novoStatus;
            
            const btn = event.target.closest('.btn-toggle-plano');
            if (novoStatus) {
                btn.classList.remove('inativo');
                btn.classList.add('ativo');
                btn.innerHTML = '<i class="fa-solid fa-toggle-on"></i> Ativo';
            } else {
                btn.classList.remove('ativo');
                btn.classList.add('inativo');
                btn.innerHTML = '<i class="fa-solid fa-toggle-off"></i> Inativo';
            }
        } else {
            throw new Error('Erro ao alterar status do plano');
        }
    } catch (error) {
        console.error('Erro:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro ao alterar status do plano',
            confirmButtonColor: '#00796b'
        });
    }
}

// Salva a edição do convênio
async function salvarEdicao() {
    if (!convenioSelecionado) return;
    
    const nome = document.getElementById('editNomeConvenio').value.trim();
    const descricao = document.getElementById('editDescricaoConvenio').value.trim();
    
    if (!nome) {
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Nome do convênio é obrigatório',
            confirmButtonColor: '#00796b'
        });
        return;
    }
    
    // Coleta os dados dos planos editados e novos
    const planosEditados = [];
    const planosItems = document.querySelectorAll('.plano-item-edit');
    
    planosItems.forEach(item => {
        const planoId = item.getAttribute('data-plano-id');
        const nomeInput = document.getElementById(`editNomePlano_${planoId}`);
        const descricaoInput = document.getElementById(`editDescricaoPlano_${planoId}`);
        const btnStatus = item.querySelector('.btn-toggle-plano');
        
        if (nomeInput && nomeInput.value.trim()) {
            const planoData = {
                nome: nomeInput.value.trim(),
                descricao: descricaoInput ? descricaoInput.value.trim() : '',
                ativo: btnStatus ? btnStatus.classList.contains('ativo') : true
            };
            
            // Se é um plano novo, não inclui o ID
            if (!planoId.startsWith('new_')) {
                planoData.id = parseInt(planoId);
            }
            
            planosEditados.push(planoData);
        }
    });
    
    const convenioAtualizado = {
        nome: nome,
        descricao: descricao,
        ativo: convenioSelecionado.ativo
    };
    
    try {
        // Atualiza o convênio
        const response = await fetch(`${API_BASE}/convenios/${convenioSelecionado.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(convenioAtualizado)
        });
        
        if (!response.ok) {
            throw new Error('Erro ao atualizar convênio');
        }
        
        // Atualiza/cria os planos
        for (const plano of planosEditados) {
            if (plano.id) {
                // Atualiza plano existente
                await fetch(`${API_BASE}/planos/${plano.id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(plano)
                });
            } else {
                // Cria novo plano
                await fetch(`${API_BASE}/planos/convenio/${convenioSelecionado.id}`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(plano)
                });
            }
        }
        
        Swal.fire({
            icon: 'success',
            title: 'Sucesso!',
            text: 'Convênio atualizado com sucesso',
            confirmButtonColor: '#00796b'
        }).then(() => {
            fecharModalEdicao();
            carregarConvenios();
        });
        
    } catch (error) {
        console.error('Erro:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro ao atualizar convênio',
            confirmButtonColor: '#00796b'
        });
    }
}

// Fecha o modal de edição
function fecharModalEdicao() {
    document.getElementById('modalEdicao').style.display = 'none';
}

// Alterna o status do convênio (ativar/inativar)
async function toggleStatus() {
    if (!convenioSelecionado) return;
    
    const novoStatus = !convenioSelecionado.ativo;
    const endpoint = novoStatus ? 'ativar' : 'inativar';
    const acao = novoStatus ? 'ativar' : 'inativar';
    
    const result = await Swal.fire({
        icon: 'warning',
        title: `Confirmar ${acao}`,
        text: `Deseja realmente ${acao} este convênio?`,
        showCancelButton: true,
        confirmButtonColor: '#00796b',
        cancelButtonColor: '#d33',
        confirmButtonText: `Sim, ${acao}`,
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        try {
            const response = await fetch(`${API_BASE}/convenios/${convenioSelecionado.id}/${endpoint}`, {
                method: 'PATCH',
                headers: getHeaders()
            });
            
            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Sucesso',
                    text: `Convênio ${novoStatus ? 'ativado' : 'inativado'} com sucesso`,
                    confirmButtonColor: '#00796b',
                    timer: 1500
                }).then(() => {
                    document.getElementById('modalDetalhes').style.display = 'none';
                    carregarConvenios();
                });
            } else {
                throw new Error('Erro ao alterar status');
            }
        } catch (error) {
            console.error('Erro:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Erro ao alterar status do convênio',
                confirmButtonColor: '#00796b'
            });
        }
    }
}

