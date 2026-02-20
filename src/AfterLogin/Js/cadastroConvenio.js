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

// Array para armazenar os planos temporariamente
let planos = [];

// Inicializa a página
document.addEventListener('DOMContentLoaded', function() {
    // Adiciona o primeiro plano por padrão
    adicionarPlano();
});

// Adiciona evento ao botão de adicionar plano
document.getElementById('btnAddPlano').addEventListener('click', adicionarPlano);

// Função para adicionar um novo plano
function adicionarPlano() {
    const listaPlanos = document.getElementById('listaPlanos');
    const planoIndex = planos.length;
    
    const planoDiv = document.createElement('div');
    planoDiv.className = 'plano-item';
    planoDiv.setAttribute('data-index', planoIndex);
    
    planoDiv.innerHTML = `
        <div class="plano-header">
            <h3>Plano ${planoIndex + 1}</h3>
            <button type="button" class="btn-remover-plano" onclick="removerPlano(${planoIndex})">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        <div class="plano-inputs">
            <div class="input">
                <input class="input__field" id="nomePlano_${planoIndex}" type="text" required />
                <label for="nomePlano_${planoIndex}" class="input__label">Nome do Plano</label>
                <small class="error" id="error-nomePlano_${planoIndex}"></small>
            </div>
            <div class="input">
                <textarea class="input__field textarea" id="descricaoPlano_${planoIndex}" rows="2"></textarea>
                <label for="descricaoPlano_${planoIndex}" class="input__label">Descrição do Plano</label>
                <small class="error" id="error-descricaoPlano_${planoIndex}"></small>
            </div>
        </div>
    `;
    
    listaPlanos.appendChild(planoDiv);
    planos.push({ index: planoIndex });
}

// Função para remover um plano
function removerPlano(index) {
    const planoElement = document.querySelector(`.plano-item[data-index="${index}"]`);
    if (planoElement) {
        // Remove do DOM
        planoElement.remove();
        
        // Remove do array
        planos = planos.filter(p => p.index !== index);
        
        // Reordena os índices e atualiza os headers
        const planosElements = document.querySelectorAll('.plano-item');
        planosElements.forEach((element, idx) => {
            const header = element.querySelector('.plano-header h3');
            if (header) {
                header.textContent = `Plano ${idx + 1}`;
            }
        });
        
        // Se não houver mais planos, adiciona um novo
        if (planos.length === 0) {
            adicionarPlano();
        }
    }
}

// Função para validar o cadastro
function validarCadastro() {
    let valido = true;
    const nomeConvenio = document.getElementById('nomeConvenio').value.trim();
    const descricaoConvenio = document.getElementById('descricaoConvenio').value.trim();
    
    // Limpa mensagens de erro anteriores
    document.querySelectorAll('.error').forEach(el => el.textContent = '');
    
    // Valida nome do convênio
    if (!nomeConvenio) {
        document.getElementById('error-nomeConvenio').textContent = 'Nome do convênio é obrigatório';
        valido = false;
    }
    
    // Valida planos
    const planosElements = document.querySelectorAll('.plano-item');
    planosElements.forEach((element, idx) => {
        const index = element.getAttribute('data-index');
        const nomePlano = document.getElementById(`nomePlano_${index}`);
        
        if (nomePlano && !nomePlano.value.trim()) {
            const errorElement = document.getElementById(`error-nomePlano_${index}`);
            if (errorElement) {
                errorElement.textContent = 'Nome do plano é obrigatório';
            }
            valido = false;
        }
    });
    
    return valido;
}

// Função para coletar os dados dos planos
function coletarPlanos() {
    const planosData = [];
    const planosElements = document.querySelectorAll('.plano-item');
    
    planosElements.forEach(element => {
        const index = element.getAttribute('data-index');
        const nomePlano = document.getElementById(`nomePlano_${index}`);
        const descricaoPlano = document.getElementById(`descricaoPlano_${index}`);
        
        if (nomePlano && nomePlano.value.trim()) {
            planosData.push({
                nome: nomePlano.value.trim(),
                descricao: descricaoPlano ? descricaoPlano.value.trim() : '',
                ativo: true
            });
        }
    });
    
    return planosData;
}

// Função principal para cadastrar o convênio
async function cadastrarConvenio() {
    // Valida o formulário
    if (!validarCadastro()) {
        Swal.fire({
            icon: 'error',
            title: 'Erro na validação',
            text: 'Por favor, preencha todos os campos obrigatórios',
            confirmButtonColor: '#00796b'
        });
        return;
    }
    
    // Coleta os dados do formulário
    const nomeConvenio = document.getElementById('nomeConvenio').value.trim();
    const descricaoConvenio = document.getElementById('descricaoConvenio').value.trim();
    const planosData = coletarPlanos();
    
    // Verifica se há pelo menos um plano
    if (planosData.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Atenção',
            text: 'Adicione pelo menos um plano ao convênio',
            confirmButtonColor: '#00796b'
        });
        return;
    }
    
    // Monta o objeto do convênio
    const convenioData = {
        nome: nomeConvenio,
        descricao: descricaoConvenio,
        ativo: true,
        planos: planosData
    };
    
    try {
        // Envia para a API
        const response = await fetch(`${API_BASE}/convenios`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(convenioData)
        });
        
        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Sucesso!',
                text: 'Convênio cadastrado com sucesso',
                confirmButtonColor: '#00796b'
            }).then(() => {
                window.location.href = 'listagemConvenio.html';
            });
        } else if (response.status === 409) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Já existe um convênio com este nome',
                confirmButtonColor: '#00796b'
            });
        } else {
            throw new Error('Erro ao cadastrar convênio');
        }
    } catch (error) {
        console.error('Erro:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro ao cadastrar convênio. Tente novamente.',
            confirmButtonColor: '#00796b'
        });
    }
}

// Função para limpar o formulário
function limparFormulario() {
    document.getElementById('nomeConvenio').value = '';
    document.getElementById('descricaoConvenio').value = '';
    document.getElementById('listaPlanos').innerHTML = '';
    planos = [];
    adicionarPlano();
    document.querySelectorAll('.error').forEach(el => el.textContent = '');
}

