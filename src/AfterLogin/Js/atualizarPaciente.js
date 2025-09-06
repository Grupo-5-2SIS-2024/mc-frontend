let selectedImage = null; // Variável para armazenar a imagem inicial ou a nova imagem selecionada

const inputFile = document.querySelector("#picture__input");
const pictureImage = document.querySelector(".picture__image");
const pictureImageTxt = "Choose an image";
pictureImage.innerHTML = pictureImageTxt;

// Função para lidar com o evento de mudança do input de imagem
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

            selectedImage = readerTarget.result; // Atualiza selectedImage com a nova imagem selecionada
        });
        reader.readAsDataURL(file);
    } else {
        pictureImage.innerHTML = pictureImageTxt;
        selectedImage = null; // Reseta selectedImage se não houver imagem
    }
});

// Função para buscar os valores do paciente e preencher o formulário
async function buscarValoresPaciente(id) {
    try {
        const response = await fetch(`http://localhost:8080/pacientes/${id}`);
        if (!response.ok) throw new Error(`Erro ao buscar dados: ${response.statusText}`);

        const paciente = await response.json();

        document.getElementById("nome").value = paciente.nome || '';
        document.getElementById("sobrenome").value = paciente.sobrenome || '';
        document.getElementById("email").value = paciente.email || '';
        document.getElementById("telefone").value = paciente.telefone || '';
        document.getElementById("cpf").value = paciente.cpf || '';
        document.getElementById("dataNascimento").value = paciente.dataNascimento || '';
        document.getElementById("cns").value = paciente.cns || '';
        document.getElementById("genero").value = paciente.genero || '';
        document.getElementById("cep").value = paciente.endereco?.cep || '';
        document.getElementById("rua").value = paciente.endereco?.rua || '';
        document.getElementById("bairro").value = paciente.endereco?.bairro || '';
        document.getElementById("numero").value = paciente.endereco?.numero || '';
        document.getElementById("complemento").value = paciente.endereco?.complemento || '';

        // Exibir a imagem do paciente existente
        if (pictureImage) {
            if (paciente.foto) {
                const img = document.createElement("img");
                img.src = paciente.foto;
                img.classList.add("picture__img");
                pictureImage.innerHTML = "";
                pictureImage.appendChild(img);
                selectedImage = paciente.foto; // Armazena a imagem existente
            } else {
                pictureImage.innerHTML = pictureImageTxt;
                selectedImage = null;
            }
        }

    } catch (error) {
        console.error("Erro ao buscar dados do paciente:", error);
        alert("Erro ao buscar dados do paciente. Tente novamente mais tarde.");
    }
}

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

    if (!cpfRegex.test(cpf)) {
        document.getElementById('error-cpf').textContent = "CPF inválido. Deve conter 11 dígitos.";
        errors.push("CPF inválido.");
    } else {
        document.getElementById('error-cpf').textContent = "";
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

// Função para atualizar o paciente
async function atualizarPaciente() {
    const id = getIdFromURL();

    if (!id) {
        alert("ID do paciente não encontrado.");
        return;
    }

    if (validarCadastro()) {
        // Seleção de elementos
        const nome = document.getElementById("nome").value.trim();
        const sobrenome = document.getElementById("sobrenome").value.trim();
        const email = document.getElementById("email").value.trim();
        const telefone = document.getElementById("telefone").value.trim();
        const cpf = document.getElementById("cpf").value.trim();
        const dataNascimento = document.getElementById("dataNascimento").value;
        const cns = document.getElementById("cns").value.trim();
        const genero = document.getElementById("genero").value;

        // Endereço
        const cep = document.getElementById("cep").value.trim();
        const rua = document.getElementById("rua").value.trim();
        const bairro = document.getElementById("bairro").value.trim();
        const numero = document.getElementById("numero").value;
        const complemento = document.getElementById("complemento").value.trim();

        // Criando o objeto com chave-valor explícito
        const dadosPaciente = {
            "nome": nome,
            "sobrenome": sobrenome,
            "email": email,
            "telefone": telefone,
            "cpf": cpf,
            "dataNascimento": dataNascimento,
            "cns": cns,
            "genero": genero,
            "endereco": {
                "cep": cep,
                "rua": rua,
                "bairro": bairro,
                "numero": numero,
                "complemento": complemento
            },
            "foto": selectedImage // Envia a imagem atual ou nova imagem selecionada
        };

        try {
            const response = await fetch(`http://localhost:8080/pacientes/${id}`, {
                method: "PUT",
                body: JSON.stringify(dadosPaciente),
                headers: { "Content-Type": "application/json; charset=UTF-8" }
            });

            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Atualização realizada com sucesso!',
                    text: 'Redirecionando para a área de pacientes...',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.href = "listagemPaciente.html";
                });
            } else {
                const errorResponse = await response.json();
                const errorMsg = errorResponse.message || "Ocorreu um erro ao atualizar.";
                alert(errorMsg);
            }
        } catch (error) {
            console.error("Erro ao tentar atualizar:", error);
            alert("Ocorreu um erro ao tentar atualizar: " + error.message);
        }
    }
}

function getIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

window.onload = function () {
    const id = getIdFromURL();
    if (id) {
        buscarValoresPaciente(id);
    } else {
        console.error('ID do paciente não encontrado na URL.');
    }
};
