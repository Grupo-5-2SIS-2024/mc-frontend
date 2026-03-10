// Gerenciador de Convênios e Planos para Formulários de Pacientes
// Este arquivo deve ser incluído nas páginas que precisam carregar convênios e planos

const API_BASE_CONVENIO = window.location.origin.includes('localhost')
  ? 'http://localhost:8080/mc'
  : '/mc'

// Carrega os convênios ativos quando a página carrega
document.addEventListener('DOMContentLoaded', function() {
    carregarConvenios();
});

// Função para carregar os convênios ativos
async function carregarConvenios() {
    const selectConvenio = document.getElementById('convenio');
    
    if (!selectConvenio) return;
    
    try {
        const response = await fetch(`${API_BASE_CONVENIO}/convenios/ativos`);
        
        if (response.ok) {
            const convenios = await response.json();
            
            // Limpa as opções existentes (exceto a primeira vazia)
            selectConvenio.innerHTML = '<option value="">Selecione um convênio</option>';
            
            // Adiciona os convênios padrão solicitados
            const conveniosPadrao = [
                { id: 'particular', nome: 'Particular' },
                ...convenios
            ];
            
            conveniosPadrao.forEach(convenio => {
                const option = document.createElement('option');
                option.value = convenio.id;
                option.textContent = convenio.nome;
                selectConvenio.appendChild(option);
            });
        } else if (response.status === 204) {
            // Sem convênios cadastrados, apenas adiciona "Particular"
            selectConvenio.innerHTML = '<option value="">Selecione um convênio</option>';
            const option = document.createElement('option');
            option.value = 'particular';
            option.textContent = 'Particular';
            selectConvenio.appendChild(option);
        }
    } catch (error) {
        console.error('Erro ao carregar convênios:', error);
        // Em caso de erro, adiciona apenas "Particular"
        selectConvenio.innerHTML = '<option value="">Selecione um convênio</option>';
        const option = document.createElement('option');
        option.value = 'particular';
        option.textContent = 'Particular';
        selectConvenio.appendChild(option);
    }
}

// Função para carregar os planos de um convênio específico
async function carregarPlanos() {
    const selectConvenio = document.getElementById('convenio');
    const selectPlano = document.getElementById('plano');
    
    if (!selectConvenio || !selectPlano) return;
    
    const convenioId = selectConvenio.value;
    
    // Limpa o select de planos
    selectPlano.innerHTML = '<option value="">Selecione um plano</option>';
    
    // Se não selecionou convênio ou é particular, desabilita o select de planos
    if (!convenioId || convenioId === 'particular') {
        selectPlano.disabled = true;
        if (convenioId === 'particular') {
            selectPlano.innerHTML = '<option value="">Não aplicável</option>';
        } else {
            selectPlano.innerHTML = '<option value="">Selecione um convênio primeiro</option>';
        }
        return;
    }
    
    // Habilita o select de planos
    selectPlano.disabled = false;
    
    try {
        const response = await fetch(`${API_BASE_CONVENIO}/planos/convenio/${convenioId}/ativos`);
        
        if (response.ok) {
            const planos = await response.json();
            
            if (planos.length === 0) {
                selectPlano.innerHTML = '<option value="">Nenhum plano disponível</option>';
                selectPlano.disabled = true;
                return;
            }
            
            planos.forEach(plano => {
                const option = document.createElement('option');
                option.value = plano.id;
                option.textContent = plano.nome;
                if (plano.descricao) {
                    option.title = plano.descricao;
                }
                selectPlano.appendChild(option);
            });
        } else if (response.status === 204) {
            selectPlano.innerHTML = '<option value="">Nenhum plano disponível</option>';
            selectPlano.disabled = true;
        }
    } catch (error) {
        console.error('Erro ao carregar planos:', error);
        selectPlano.innerHTML = '<option value="">Erro ao carregar planos</option>';
        selectPlano.disabled = true;
    }
}

// Função para obter o ID do plano selecionado (para usar no cadastro)
function obterPlanoSelecionado() {
    const selectConvenio = document.getElementById('convenio');
    const selectPlano = document.getElementById('plano');
    
    if (!selectConvenio || !selectPlano) return null;
    
    const convenioId = selectConvenio.value;
    
    // Se for particular, retorna null (sem plano)
    if (convenioId === 'particular') {
        return null;
    }
    
    // Retorna o ID do plano selecionado
    const planoId = selectPlano.value;
    return planoId ? parseInt(planoId) : null;
}

// Função para obter informações do convênio e plano selecionados
function obterInfoConvenioPlano() {
    const selectConvenio = document.getElementById('convenio');
    const selectPlano = document.getElementById('plano');
    
    if (!selectConvenio) return { convenio: null, plano: null };
    
    const convenioId = selectConvenio.value;
    const convenioNome = selectConvenio.options[selectConvenio.selectedIndex]?.text || '';
    
    if (convenioId === 'particular') {
        return {
            convenio: 'Particular',
            plano: null,
            planoId: null
        };
    }
    
    if (!convenioId || !selectPlano) {
        return { convenio: null, plano: null, planoId: null };
    }
    
    const planoId = selectPlano.value;
    const planoNome = selectPlano.options[selectPlano.selectedIndex]?.text || '';
    
    return {
        convenio: convenioNome,
        plano: planoNome || null,
        planoId: planoId ? parseInt(planoId) : null
    };
}

