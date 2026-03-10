// Base da API: usa localhost em dev, vazio em produção
const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : '';

const inputFile = document.querySelector("#picture__input");
const pictureImage = document.querySelector(".picture__image");
const pictureImageTxt = "Choose an image";

if (pictureImage) {
    pictureImage.innerHTML = pictureImageTxt;
}

if (inputFile && pictureImage) {
    inputFile.addEventListener("change", function (e) {
        const inputTarget = e.target;
        const file = inputTarget.files[0];

        if (file) {
            const reader = new FileReader();

            reader.addEventListener("load", function (e) {
                const readerTarget = e.target;

                const img = document.createElement("img");
                img.src = readerTarget.result;
                img.classList.add("picture__img");

                pictureImage.innerHTML = "";
                pictureImage.appendChild(img);
            });

            reader.readAsDataURL(file);
        } else {
            pictureImage.innerHTML = pictureImageTxt;
        }
    });
}

// Função para validar o cadastro do paciente
function validarCadastro() {
    var nome = document.getElementById('nome').value;
    var sobrenome = document.getElementById('sobrenome').value;
    var email = document.getElementById('email').value;
    var telefone = document.getElementById('telefone').value;
    var cpf = document.getElementById('cpf').value;
    var genero = document.getElementById('genero').value;
    var dataNascimento = document.getElementById('dataNascimento').value;
    var cns = document.getElementById('cns').value;
    var rua = document.getElementById('rua').value;
    var numero = document.getElementById('numero').value;
    var bairro = document.getElementById('bairro').value;

    // Expressões regulares para validações
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var telefoneRegex = /^\d{10,}$/; // Mínimo de 10 dígitos
    var cpfRegex = /^\d{11}$/; // CPF tem 11 dígitos

    // Validar cada campo
    var errors = [];

    if (!nome.trim()) {
        document.getElementById('error-nome').textContent = "Nome é obrigatório.";
        errors.push("Nome é obrigatório.");
    } else {
        document.getElementById('error-nome').textContent = "";
    }

    if (!sobrenome.trim()) {
        document.getElementById('error-sobrenome').textContent = "Sobrenome é obrigatório.";
        errors.push("Sobrenome é obrigatório.");
    } else {
        document.getElementById('error-sobrenome').textContent = "";
    }

    if (!emailRegex.test(email)) {
        document.getElementById('error-email').textContent = "E-mail inválido.";
        errors.push("E-mail inválido.");
    } else {
        document.getElementById('error-email').textContent = "";
    }

    if (!telefoneRegex.test(telefone)) {
        document.getElementById('error-telefone').textContent = "Telefone inválido. Deve conter no mínimo 10 dígitos.";
        errors.push("Telefone inválido.");
    } else {
        document.getElementById('error-telefone').textContent = "";
    }

    if(cpf.trim() !== ""){
      if (!cpfRegex.test(cpf)) {
        document.getElementById('error-cpf').textContent = "CPF inválido. Deve conter 11 dígitos.";
        errors.push("CPF inválido.");
    } else {
        document.getElementById('error-cpf').textContent = "";
    }
    }

    if (!genero.trim()) {
        document.getElementById('error-especialidade').textContent = "Gênero é obrigatório.";
        errors.push("Gênero é obrigatório.");
    } else {
        document.getElementById('error-especialidade').textContent = "";
    }

    if (!dataNascimento) {
        document.getElementById('error-dataNascimento').textContent = "Data de nascimento é obrigatória.";
        errors.push("Data de nascimento é obrigatória.");
    } else {
        document.getElementById('error-dataNascimento').textContent = "";
    }

    if (!cns.trim()) {
        document.getElementById('error-cns').textContent = "CNS é obrigatório.";
        errors.push("CNS é obrigatório.");
    } else {
        document.getElementById('error-cns').textContent = "";
    }

    if (!rua.trim()) {
        document.getElementById('error-rua').textContent = "Rua é obrigatória.";
        errors.push("Rua é obrigatória.");
    } else {
        document.getElementById('error-rua').textContent = "";
    }

    if (!bairro.trim()) {
        document.getElementById('error-bairro').textContent = "Bairro é obrigatório.";
        errors.push("Bairro é obrigatório.");
    } else {
        document.getElementById('error-bairro').textContent = "";
    }

    if (!numero.trim()) {
        document.getElementById('error-numero').textContent = "Número é obrigatório.";
        errors.push("Número é obrigatório.");
    } else {
        document.getElementById('error-numero').textContent = "";
    }

    // Exibir os erros se houverem
    if (errors.length > 0) {
        return false;
    } else {
        return true;
    }
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
});

// Função para validar responsável (se necessário)
function validarResponsavel() {
    const nomeResp = document.getElementById('nomeResponsavel').value;
    const sobrenomeResp = document.getElementById('sobrenomeResponsavel').value;
    const emailResp = document.getElementById('emailResponsavel').value;
    const telefoneResp = document.getElementById('telefoneResponsavel').value;
    const cpfResp = document.getElementById('cpfResponsavel').value;
    const generoResp = document.getElementById('generoResponsavel').value;
    const dataNascResp = document.getElementById('dataNascimentoResponsavel').value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const telefoneRegex = /^\d{10,}$/;
    const cpfRegex = /^\d{11}$/;
    const errors = [];

    if (!nomeResp.trim()) {
        document.getElementById('error-nomeResponsavel').textContent = "Nome do responsável é obrigatório.";
        errors.push("Nome do responsável");
    } else {
        document.getElementById('error-nomeResponsavel').textContent = "";
    }

    if (!sobrenomeResp.trim()) {
        document.getElementById('error-sobrenomeResponsavel').textContent = "Sobrenome do responsável é obrigatório.";
        errors.push("Sobrenome do responsável");
    } else {
        document.getElementById('error-sobrenomeResponsavel').textContent = "";
    }

    if (!emailRegex.test(emailResp)) {
        document.getElementById('error-emailResponsavel').textContent = "E-mail do responsável inválido.";
        errors.push("E-mail do responsável");
    } else {
        document.getElementById('error-emailResponsavel').textContent = "";
    }

    if (!telefoneRegex.test(telefoneResp)) {
        document.getElementById('error-telefoneResponsavel').textContent = "Telefone do responsável inválido.";
        errors.push("Telefone do responsável");
    } else {
        document.getElementById('error-telefoneResponsavel').textContent = "";
    }

    // CPF é opcional, mas se preenchido deve ser válido
    if (cpfResp.trim() !== "" && !cpfRegex.test(cpfResp)) {
        document.getElementById('error-cpfResponsavel').textContent = "CPF do responsável inválido. Deve conter 11 dígitos.";
        errors.push("CPF do responsável");
    } else {
        document.getElementById('error-cpfResponsavel').textContent = "";
    }

    if (!generoResp.trim()) {
        document.getElementById('error-generoResponsavel').textContent = "Gênero do responsável é obrigatório.";
        errors.push("Gênero do responsável");
    } else {
        document.getElementById('error-generoResponsavel').textContent = "";
    }

    if (!dataNascResp) {
        document.getElementById('error-dataNascimentoResponsavel').textContent = "Data de nascimento do responsável é obrigatória.";
        errors.push("Data de nascimento do responsável");
    } else {
        document.getElementById('error-dataNascimentoResponsavel').textContent = "";
    }

    return errors.length === 0;
}

// Função principal para cadastrar paciente (com ou sem responsável)
async function cadastrarPaciente() {
    const menorIdade = document.getElementById('menorIdade').checked;
    
    // Valida dados do paciente
    if (!validarCadastro()) {
        return;
    }
    
    // Se menor de idade, valida dados do responsável
    if (menorIdade && !validarResponsavel()) {
        Swal.fire({
            icon: 'warning',
            title: 'Dados incompletos',
            text: 'Por favor, preencha todos os campos obrigatórios do responsável.',
        });
        return;
    }
    
    if (menorIdade) {
        await cadastrarPacienteComResponsavel();
    } else {
        await cadastrarPacienteSemResponsavel();
    }
}

// Função para cadastrar paciente com responsável
async function cadastrarPacienteComResponsavel() {
    const nomeDigitado = document.getElementById("nome").value;
    const sobrenomeDigitado = document.getElementById("sobrenome").value;
    const emailDigitado = document.getElementById("email").value;
    const telefoneDigitado = document.getElementById("telefone").value;
    const cpfDigitado = document.getElementById("cpf").value;
    const generoEscolhido = document.getElementById("genero").value;
    const dataNascimentoDigitada = document.getElementById("dataNascimento").value;
    const cnsDigitado = document.getElementById("cns").value;
    const cepDigitado = document.getElementById("cep").value;
    const ruaDigitada = document.getElementById("rua").value;
    const numeroDigitado = document.getElementById("numero").value;
    const complementoDigitado = document.getElementById("complemento").value;
    const bairroDigitado = document.getElementById("bairro").value;
    const fotoEscolhida = document.getElementById("picture__input").files[0];

    const nomeResp = document.getElementById("nomeResponsavel").value;
    const sobrenomeResp = document.getElementById("sobrenomeResponsavel").value;
    const emailResp = document.getElementById("emailResponsavel").value;
    const telefoneResp = document.getElementById("telefoneResponsavel").value;
    const cpfResp = document.getElementById("cpfResponsavel").value;
    const generoResp = document.getElementById("generoResponsavel").value;
    const dataNascResp = document.getElementById("dataNascimentoResponsavel").value;

    // Primeiro cadastra ou busca o responsável
    try {
        let idResponsavel = null;

        // Tenta buscar responsável por CPF (se informado)
        if (cpfResp.trim() !== '') {
            try {
                const respBusca = await fetch(`${API_BASE}/mc/responsaveis/cpf?cpf=${cpfResp}`);
                if (respBusca.ok) {
                    const respEncontrado = await respBusca.json();
                    idResponsavel = respEncontrado.id;
                }
            } catch (e) {
                // Responsável não existe, será cadastrado
            }
        }

        // Se não encontrou, cadastra novo responsável
        if (!idResponsavel) {
            const dadosResponsavel = {
                "nome": nomeResp,
                "sobrenome": sobrenomeResp,
                "email": emailResp,
                "telefone": telefoneResp,
                "cpf": cpfResp && cpfResp.trim() !== '' ? cpfResp : null,
                "genero": generoResp,
                "dataNascimento": dataNascResp
            };

            const respCadastro = await fetch(`${API_BASE}/mc/responsaveis`, {
                method: "POST",
                body: JSON.stringify(dadosResponsavel),
                headers: { "Content-Type": "application/json; charset=UTF-8" }
            });

            if (respCadastro.ok) {
                const respCadastrado = await respCadastro.json();
                idResponsavel = respCadastrado.id;
            } else {
                throw new Error('Erro ao cadastrar responsável');
            }
        }

        // Agora cadastra o paciente com o responsável
        const dadosPaciente = {
            "nome": nomeDigitado,
            "sobrenome": sobrenomeDigitado,
            "email": emailDigitado,
            "telefone": telefoneDigitado,
            "cpf": cpfDigitado && cpfDigitado.trim() !== '' ? cpfDigitado : null,
            "genero": generoEscolhido,
            "dataNascimento": dataNascimentoDigitada,
            "cns": cnsDigitado,
            "ativo": true,
            "foto": fotoEscolhida ? await toBase64(fotoEscolhida) : null,
            "responsavel": {
                "id": idResponsavel
            },
            "endereco": {
                "id": null,
                "cep": cepDigitado,
                "logradouro": ruaDigitada,
                "numero": numeroDigitado,
                "complemento": complementoDigitado,
                "bairro": bairroDigitado
            },
            "plano": obterPlanoSelecionado() ? { "id": obterPlanoSelecionado() } : null
        };

        const respostaCadastro = await fetch(`${API_BASE}/mc/pacientes/ComResponsavel`, {
            method: "POST",
            body: JSON.stringify(dadosPaciente),
            headers: { "Content-Type": "application/json; charset=UTF-8" }
        });

        if (respostaCadastro.status === 201 || respostaCadastro.status === 200) {
            Swal.fire({
                icon: 'success',
                title: 'Paciente cadastrado com sucesso!',
                text: 'Redirecionando para a lista de pacientes...',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                window.location.href = "listagemPaciente.html";
            });
        } else {
            const raw = await respostaCadastro.text().catch(() => '');
            let msg = raw || 'Por favor, tente novamente.';
            
            if (respostaCadastro.status === 409) {
                msg = 'Este email já está cadastrado no sistema.';
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Erro ao cadastrar paciente',
                text: msg,
            });
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Erro de comunicação',
            text: 'Ocorreu um erro ao tentar cadastrar: ' + error.message,
        });
    }
}

// Função para cadastrar paciente sem responsável
async function cadastrarPacienteSemResponsavel() {
    if (validarCadastro()) {
        const nomeDigitado = document.getElementById("nome").value;
        const sobrenomeDigitado = document.getElementById("sobrenome").value;
        const emailDigitado = document.getElementById("email").value;
        const telefoneDigitado = document.getElementById("telefone").value;
        const cpfDigitado = document.getElementById("cpf").value;
        const generoEscolhido = document.getElementById("genero").value;
        const dataNascimentoDigitada = document.getElementById("dataNascimento").value;
        const cnsDigitado = document.getElementById("cns").value;
        const cepDigitado = document.getElementById("cep").value;
        const ruaDigitada = document.getElementById("rua").value;
        const numeroDigitado = document.getElementById("numero").value;
        const complementoDigitado = document.getElementById("complemento").value;
        const bairroDigitado = document.getElementById("bairro").value;
        const fotoEscolhida = document.getElementById("picture__input").files[0];

        const dadosPaciente = {
            "nome": nomeDigitado,
            "sobrenome": sobrenomeDigitado,
            "email": emailDigitado,
            "telefone": telefoneDigitado,
            "cpf": cpfDigitado && cpfDigitado.trim() !== '' ? cpfDigitado : null,
            "genero": generoEscolhido,
            "dataNascimento": dataNascimentoDigitada,
            "cns": cnsDigitado,
            "ativo": true,
            "foto": fotoEscolhida ? await toBase64(fotoEscolhida) : null,
            "cep": cepDigitado,
            "logradouro": ruaDigitada,
            "numero": numeroDigitado,
            "complemento": complementoDigitado,
            "bairro": bairroDigitado,
            "plano": obterPlanoSelecionado() ? { "id": obterPlanoSelecionado() } : null
        };

        try {
            const respostaCadastro = await fetch(`${API_BASE}/mc/pacientes/SemResponsavel`, {
                method: "POST",
                body: JSON.stringify(dadosPaciente),
                headers: { "Content-Type": "application/json; charset=UTF-8" }
            });

            // Lê corpo de resposta de forma defensiva (pode estar vazio)
            let raw = '';
            try { raw = await respostaCadastro.text(); } catch (_) { raw = ''; }

            if (respostaCadastro.status === 201 || respostaCadastro.status === 200) {
                Swal.fire({
                    icon: 'success',
                    title: 'Paciente cadastrado com sucesso!',
                    text: 'Redirecionando para a lista de pacientes...',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.href = "listagemPaciente.html";
                });
            } else {
                let msg = raw || 'Por favor, tente novamente.';
                
                // Mensagem específica para conflito de email
                if (respostaCadastro.status === 409) {
                    msg = 'Este email já está cadastrado no sistema. Por favor, use outro email ou verifique se o paciente já existe.';
                }
                
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao cadastrar paciente',
                    text: msg,
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Erro de comunicação',
                text: 'Ocorreu um erro ao tentar cadastrar: ' + error.message,
            });
        }
    }
}

// Garante que a função esteja disponível globalmente
window.cadastrarPaciente = cadastrarPaciente;