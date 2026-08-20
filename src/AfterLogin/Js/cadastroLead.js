const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : '';
const leadId = new URLSearchParams(window.location.search).get('id');

const form = document.getElementById('formCadastroLead');
const camposObrigatorios = ['nome', 'sobrenome', 'email', 'cpf', 'telefone', 'dataNascimento', 'fase', 'faseContato'];

function mostrarErro(campo, mensagem) {
    const erro = document.getElementById(`error-${campo}`);
    if (erro) erro.textContent = mensagem;
}

function validarLead() {
    let valido = true;

    camposObrigatorios.forEach(campo => {
        const elemento = document.getElementById(campo);
        const valor = elemento?.value.trim() || '';
        mostrarErro(campo, valor ? '' : 'Campo obrigatório.');
        if (!valor) valido = false;
    });

    const email = document.getElementById('email').value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        mostrarErro('email', 'Informe um e-mail válido.');
        valido = false;
    }

    const cpf = document.getElementById('cpf').value.trim();
    if (cpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf)) {
        mostrarErro('cpf', 'Use o formato 000.000.000-00.');
        valido = false;
    }

    return valido;
}

async function salvarLead(event) {
    event.preventDefault();
    if (!validarLead()) return;

    const payload = {
        nome: document.getElementById('nome').value.trim(),
        sobrenome: document.getElementById('sobrenome').value.trim(),
        email: document.getElementById('email').value.trim(),
        cpf: document.getElementById('cpf').value.trim(),
        telefone: document.getElementById('telefone').value.trim(),
        dataNascimento: document.getElementById('dataNascimento').value,
        fase: document.getElementById('fase').value.trim(),
        tipoDeContato: {
            id: Number(document.getElementById('faseContato').value)
        }
    };

    const botao = form.querySelector('.btn-salvar');
    botao.disabled = true;

    try {
        const resposta = await fetch(`${API_BASE}/mc/possivel-cliente${leadId ? `/${encodeURIComponent(leadId)}` : ''}`, {
            method: leadId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(payload)
        });

        if (!resposta.ok) {
            const mensagem = await resposta.text().catch(() => '');
            throw new Error(mensagem || `HTTP ${resposta.status}`);
        }

        await Swal.fire({
            icon: 'success',
            title: leadId ? 'Lead atualizado!' : 'Lead cadastrado!',
            showConfirmButton: false,
            timer: 1500
        });
        window.location.href = 'listagemLead.html';
    } catch (erro) {
        console.error('Erro ao cadastrar lead:', erro);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao cadastrar lead',
            text: erro.message || 'Não foi possível concluir o cadastro.'
        });
        botao.disabled = false;
    }
}

function aplicarMascaraCpf(event) {
    const apenasNumeros = event.target.value.replace(/\D/g, '').slice(0, 11);
    event.target.value = apenasNumeros
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

form.addEventListener('submit', salvarLead);
document.getElementById('cpf').addEventListener('input', aplicarMascaraCpf);

async function carregarLeadParaEdicao() {
    if (!leadId) return;

    try {
        const resposta = await fetch(`${API_BASE}/mc/possivel-cliente/${encodeURIComponent(leadId)}`);
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

        const lead = await resposta.json();
        document.getElementById('nome').value = lead.nome || '';
        document.getElementById('sobrenome').value = lead.sobrenome || '';
        document.getElementById('email').value = lead.email || '';
        document.getElementById('cpf').value = lead.cpf || '';
        document.getElementById('telefone').value = lead.telefone || '';
        document.getElementById('dataNascimento').value = (lead.dataNascimento || '').slice(0, 10);
        document.getElementById('fase').value = lead.fase || '';
        document.getElementById('faseContato').value = lead.tipoDeContato?.id || '';
        document.getElementById('tituloCadastroLead').innerHTML = 'Atualizar <span>lead</span>';
        document.getElementById('btnSalvarLead').innerHTML = '<i class="fa-solid fa-check"></i> Atualizar lead';
    } catch (erro) {
        console.error('Erro ao carregar lead para edição:', erro);
        Swal.fire({ icon: 'error', title: 'Erro ao carregar lead', text: 'Não foi possível carregar os dados.' });
    }
}

carregarLeadParaEdicao();
