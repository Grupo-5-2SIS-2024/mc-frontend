// Base da API: usa localhost em dev, vazio em produção
// Ajuste necessario: incluir o context-path /mc no API_BASE para nao duplicar /mc nas rotas
const API_BASE = window.location.origin.includes('localhost')
  ? 'http://localhost:8080/mc'
  : '/mc'

// inputs especiais: robust password visibility toggles
function setupPasswordToggle(iconSel, inputSel) {
  const icon = document.querySelector(iconSel);
  const wrapper = icon ? icon.closest('.input__icon-wrapper') : null;
  const input = document.querySelector(inputSel);
  if (!icon || !input) return;
  const toggle = () => {
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.classList.toggle('ri-eye-off-line');
    icon.classList.toggle('ri-eye-line');
  };
  icon.setAttribute('role', 'button');
  icon.setAttribute('tabindex', '0');
  icon.setAttribute('aria-label', 'Mostrar/ocultar senha');
  icon.addEventListener('click', toggle);
  icon.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  if (wrapper) {
    wrapper.addEventListener('click', (e) => { if (e.target !== icon) toggle(); });
    wrapper.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  }
}

const initPwToggles = () => {
  setupPasswordToggle('.input__icon', '#password');
  setupPasswordToggle('.input__icon2', '#confirmedPassword');
};
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPwToggles);
} else {
  initPwToggles();
}

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

  document.getElementById('error-carteirinha').textContent = "";

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
    const errBox = document.querySelector('.error-message');
    if (errBox) errBox.innerHTML = errorMessage;
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

// =========================
// CARGA HORÁRIA
// =========================
const lista = document.getElementById('listaHorarios')
const btnAdd = document.getElementById('btnAddHorario')

function adicionarLinha() {
  if (!lista) return

  const row = document.createElement('div')
  row.className = 'horario-row'

  row.innerHTML = `
    <select class="dia">
      <option value="SEGUNDA">Segunda</option>
      <option value="TERCA">Terça</option>
      <option value="QUARTA">Quarta</option>
      <option value="QUINTA">Quinta</option>
      <option value="SEXTA">Sexta</option>
      <option value="SABADO">Sábado</option>
      <option value="DOMINGO">Domingo</option>
    </select>

    <input type="time" class="inicio">
    <input type="time" class="fim">

    <button type="button" class="btn-remover">X</button>
  `

  row.querySelector('.btn-remover').onclick = () => {
    if (document.querySelectorAll('.horario-row').length <= 1) return
    row.remove()
  }

  lista.appendChild(row)
}

document.addEventListener('DOMContentLoaded', () => {
  if (btnAdd) btnAdd.onclick = adicionarLinha
  if (lista && lista.children.length === 0) adicionarLinha()
})


function coletarCargaHoraria() {
  const rows = document.querySelectorAll('.horario-row')
  if (rows.length === 0) return null

  const horarios = []

  for (const r of rows) {
    const inicio = r.querySelector('.inicio').value
    const fim = r.querySelector('.fim').value

    if (!inicio || !fim || inicio >= fim) return null

    horarios.push({
      diaSemana: r.querySelector('.dia').value,
      horaInicio: inicio,
      horaFim: fim
    })
  }

  return horarios
}

// =========================
// ESPECIFICAÇÕES
// =========================
function carregarEspecificacoes() {
  // Ajuste necessario: remover /mc duplicado, agora API_BASE ja tem /mc
  fetch(`${API_BASE}/especificacoes`)
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

function readErrorBody(text) {
  if (!text) return ''
  return text.length > 400 ? text.slice(0, 400) + '...' : text
}

async function cadastrarColaborador() {
  if (!validarCadastro()) return

  const cargaHoraria = coletarCargaHoraria()

if (!cargaHoraria) {
  Swal.fire({
    icon: 'error',
    title: 'Carga horária obrigatória',
    html: 'Adicione pelo menos 1 horário e preencha início e fim corretamente.',
    confirmButtonText: 'Ok'
  })
  return
}


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
    "Profissional": 3
  };

  const nivelAcessoId = nivelAcessoMap[nivelAcessoEscolhido];

  if (!nivelAcessoId) {
    alert("Opções inválidas selecionadas.");
    return;
  }

  let fotoBase64 = null;
  if (fotoEscolhida) {
    fotoBase64 = await toBase64(fotoEscolhida);
  }

  const dadosColaborador = {
    "nome": nomeDigitado,
    "sobrenome": sobrenomeDigitado,
    "email": emailDigitado,
    "telefone": telefoneDigitado,
    "cpf": cpfDigitado,
    "dataNascimento": dataNascimentoDigitada,
    "especificacaoMedica": {
      // Ajuste seguro: garantir numero
      "id": Number(especificacaoDigitada)
    },
    "carterinha": carteirinhaDigitada,
    "senha": senhaDigitada,
    "ativo": true,
    "permissao": {
      // Ajuste seguro: garantir numero
      "id": Number(nivelAcessoId)
    },
    "foto": fotoBase64
  };

  console.log(dadosColaborador);

  try {
    // Ajuste necessario: remover /mc duplicado, agora API_BASE ja tem /mc
    const respostaCadastro = await fetch(`${API_BASE}/medicos`, {
      method: "POST",
      body: JSON.stringify(dadosColaborador),
      headers: { "Content-type": "application/json; charset=UTF-8" }
    })

    if (!respostaCadastro.ok) {
      const errText = await respostaCadastro.text()
      throw new Error(`Erro médico. Status ${respostaCadastro.status}. ${readErrorBody(errText)}`)
    }

    const medico = await respostaCadastro.json()
    if (!medico || !medico.id) {
      throw new Error('Erro médico. Resposta sem id')
    }

    // Ajuste necessario: remover /mc duplicado, agora API_BASE ja tem /mc
    const resCarga = await fetch(`${API_BASE}/carga-horaria/medico/${medico.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(cargaHoraria)
    })

    if (!resCarga.ok) {
      const errText = await resCarga.text()
      throw new Error(`Erro carga horária. Status ${resCarga.status}. ${readErrorBody(errText)}`)
    }

    Swal.fire({
      icon: 'success',
      title: 'Colaborador cadastrado com sucesso!',
      text: 'Redirecionando para a área do colaborador...',
      showConfirmButton: false,
      timer: 1500
    }).then(() => {
      window.location.href = "listagemColaborador.html";
    });

  } catch (error) {
    alert("Ocorreu um erro ao tentar cadastrar: " + error.message);
  }
}
