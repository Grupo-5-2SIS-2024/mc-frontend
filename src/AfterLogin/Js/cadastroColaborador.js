// inputs especiais

const inputIcon = document.querySelector(".input__icon");
const inputIcon2 = document.querySelector(".input__icon2");
const inputPassword = document.getElementById("password");
const inputConfirmedPassword = document.getElementById("confirmedPassword");

inputIcon.addEventListener("click", () => {
  inputIcon.classList.toggle("ri-eye-off-line");
  inputIcon.classList.toggle("ri-eye-line");
  inputPassword.type = inputPassword.type === "password" ? "text" : "password";
});

inputIcon2.addEventListener("click", () => {
  inputIcon2.classList.toggle("ri-eye-off-line");
  inputIcon2.classList.toggle("ri-eye-line");
  inputConfirmedPassword.type = inputConfirmedPassword.type === "password" ? "text" : "password";
});

const inputFile = document.querySelector("#picture__input");
const pictureImage = document.querySelector(".picture__image");
const pictureImageTxt = "Choose an image";
pictureImage.innerHTML = pictureImageTxt;

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


// Função para validar o cadastro do colaborador

function validarCadastro() {
  var nome = document.getElementById('nome').value;
  var sobrenome = document.getElementById('sobrenome').value;
  var email = document.getElementById('email').value;
  var telefone = document.getElementById('telefone').value;
  var cpf = document.getElementById('cpf').value;
  var especificacao = document.getElementById('especificacao').value;
  var dataNascimento = document.getElementById('dataNascimento').value;
  var carteirinha = document.getElementById('carteirinha').value;
  var password = document.getElementById('password').value;
  var confirmedPassword = document.getElementById('confirmedPassword').value;
  var nivelAcesso = document.getElementById('nivelAcesso').value;

  // Expressões regulares para validações
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var telefoneRegex = /^\d{10,}$/; // Mínimo de 10 dígitos
  var cpfRegex = /^\d{11}$/; // CPF tem 11 dígitos
  var passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/; // Senha: mínimo 8 caracteres, pelo menos uma letra maiúscula, uma letra minúscula e um número

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
    document.getElementById('error-telefone').textContent = "Telefone inválido.";
    errors.push("Telefone inválido.");
  } else {
    document.getElementById('error-telefone').textContent = "";
  }

  if (!cpfRegex.test(cpf)) {
    document.getElementById('error-cpf').textContent = "CPF inválido.";
    errors.push("CPF inválido.");
  } else {
    document.getElementById('error-cpf').textContent = "";
  }

  if (!especificacao.trim()) {
    document.getElementById('error-especificacao').textContent = "Especificação é obrigatória.";
    errors.push("especificacao é obrigatória.");
  } else {
    document.getElementById('error-especificacao').textContent = "";
  }

  if (!dataNascimento) {
    document.getElementById('error-dataNascimento').textContent = "Data de nascimento é obrigatória.";
    errors.push("Data de nascimento é obrigatória.");
  } else {
    document.getElementById('error-dataNascimento').textContent = "";
  }

  if (!carteirinha.trim()) {
    document.getElementById('error-carteirinha').textContent = "Carteirinha é obrigatória.";
    errors.push("Carteirinha é obrigatória.");
  } else {
    document.getElementById('error-carteirinha').textContent = "";
  }

  if (!passwordRegex.test(password)) {
    document.getElementById('error-password').textContent = "Senha: 8+ caracteres, 1 maiúscula, 1 minúscula, 1 número.";
    errors.push("Senha: 8+ caracteres, 1 maiúscula, 1 minúscula, 1 número.");
  } else {
    document.getElementById('error-password').textContent = "";
  }

  if (password !== confirmedPassword) {
    document.getElementById('error-confirmedPassword').textContent = "As senhas não coincidem.";
    errors.push("As senhas não coincidem.");
  } else {
    document.getElementById('error-confirmedPassword').textContent = "";
  }

  if (!nivelAcesso.trim()) {
    document.getElementById('error-nivelAcesso').textContent = "Nível de acesso é obrigatório.";
    errors.push("Nível de acesso é obrigatório.");
  } else {
    document.getElementById('error-nivelAcesso').textContent = "";
  }

  // Exibir os erros se houverem
  if (errors.length > 0) {
    const errorMessage = errors.join("<br>");
    document.querySelector('.error-message').innerHTML = errorMessage;
    return false;
  } else {
    return true;
  }
}


// Função assíncrona para cadastrar o colaborador

const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
});

function carregarEspecificacoes() {
  fetch("http://localhost:8080/especificacoes")
    .then(response => response.json())
    .then(especificacoes => {
      const especificacaoSelect = document.getElementById("especificacao");

      especificacoes.forEach(especificacao => {
        const option = document.createElement("option");
        option.value = especificacao.id;
        option.textContent = especificacao.area;
        especificacaoSelect.appendChild(option);
      });
    })
    .catch(error => {
      console.error("Erro ao carregar especificações:", error);
      alert("Erro ao carregar especificações. Tente novamente mais tarde.");
    });
}

// Chamar a função ao carregar a página
window.onload = function () {
  carregarEspecificacoes();
};

async function cadastrarColaborador() {

  if (validarCadastro()) {

    const nomeDigitado = document.getElementById("nome").value;
    const sobrenomeDigitado = document.getElementById("sobrenome").value;
    const emailDigitado = document.getElementById("email").value;
    const telefoneDigitado = document.getElementById("telefone").value;
    const cpfDigitado = document.getElementById("cpf").value;
    const dataNascimentoDigitada = document.getElementById("dataNascimento").value;
    const especificacaoDigitada = document.getElementById("especificacao").value;
    const carteirinhaDigitada = document.getElementById("carteirinha").value;
    const senhaDigitada = document.getElementById("password").value;
    const nivelAcessoEscolhido = document.getElementById("nivelAcesso").value;
    const fotoEscolhida = document.getElementById("picture__input").files[0];

    const nivelAcessoMap = {
      "Admin": 1,
      "Supervisor": 2,
      "Médico": 3
    };

    const nivelAcessoId = nivelAcessoMap[nivelAcessoEscolhido];

    if (!nivelAcessoId) {
      alert("Opções inválidas selecionadas.");
      return;
    }

    const dadosColaborador = {
      "nome": nomeDigitado,
      "sobrenome": sobrenomeDigitado,
      "email": emailDigitado,
      "telefone": telefoneDigitado,
      "cpf": cpfDigitado,
      "dataNascimento": dataNascimentoDigitada,
      "especificacaoMedica": {
        "id": especificacaoDigitada
      },
      "carterinha": carteirinhaDigitada,
      "senha": senhaDigitada,
      "ativo": false,
      "permissao": {
        "id": nivelAcessoId
      },
      "foto": await toBase64(fotoEscolhida)
    };

    console.log(dadosColaborador);

    try {
      const respostaCadastro = await fetch("http://localhost:8080/medicos", {
        method: "POST",
        body: JSON.stringify(dadosColaborador),
        headers: { "Content-type": "application/json; charset=UTF-8" }
      });

      if (respostaCadastro.status == 201) {
        Swal.fire({
          icon: 'success',
          title: 'Colaborador cadastrado com sucesso!',
          text: 'Redirecionando para a área do colaborador...',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          window.location.href = "listagemColaborador.html";
        });
      } else {
        alert("Ocorreu um erro ao cadastrar");
      }
    } catch (error) {
      alert("Ocorreu um erro ao tentar cadastrar: " + error.message);
    }
  }
}

