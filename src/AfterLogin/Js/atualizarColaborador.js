const API_BASE = window.location.origin.includes('localhost')
  ? 'http://localhost:8080/mc'
  : '/mc'

// =========================
// UI. SENHA E IMAGEM
// =========================
function setupPasswordToggle(iconSel, inputSel) {
  const icon = document.querySelector(iconSel)
  const wrapper = icon ? icon.closest('.input__icon-wrapper') : null
  const input = document.querySelector(inputSel)
  if (!icon || !input) return

  const toggle = () => {
    input.type = input.type === 'password' ? 'text' : 'password'
    icon.classList.toggle('ri-eye-off-line')
    icon.classList.toggle('ri-eye-line')
  }

  icon.setAttribute('role', 'button')
  icon.setAttribute('tabindex', '0')
  icon.setAttribute('aria-label', 'Mostrar ou ocultar senha')
  icon.addEventListener('click', toggle)
  icon.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle()
    }
  })

  if (wrapper) {
    wrapper.addEventListener('click', (e) => {
      if (e.target !== icon) toggle()
    })
    wrapper.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggle()
      }
    })
  }
}

let selectedImage = null

function initUI() {
  setupPasswordToggle('.input__icon', '#password')
  setupPasswordToggle('.input__icon2', '#confirmedPassword')

  const inputFile = document.querySelector('#picture__input')
  const pictureImage = document.querySelector('.picture__image')
  const pictureImageTxt = 'Choose an image'

  if (pictureImage) pictureImage.innerHTML = pictureImageTxt

  if (inputFile && pictureImage) {
    inputFile.addEventListener('change', (e) => {
      const file = e.target.files[0]
      if (!file) {
        pictureImage.innerHTML = pictureImageTxt
        selectedImage = null
        return
      }

      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = document.createElement('img')
        img.src = ev.target.result
        img.classList.add('picture__img')
        pictureImage.innerHTML = ''
        pictureImage.appendChild(img)
        selectedImage = ev.target.result
      }
      reader.readAsDataURL(file)
    })
  }
}

// =========================
// VALIDACAO
// =========================
function validarCadastro() {
  const nome = document.getElementById('nome')?.value.trim() || ''
  const sobrenome = document.getElementById('sobrenome')?.value.trim() || ''
  const email = document.getElementById('email')?.value.trim() || ''
  const telefone = document.getElementById('telefone')?.value.trim() || ''
  const especificacao = document.getElementById('especificacao')?.value || ''
  const dataNascimento = document.getElementById('dataNascimento')?.value || ''
  const password = document.getElementById('password')?.value || ''
  const confirmedPassword = document.getElementById('confirmedPassword')?.value || ''
  const nivelAcesso = document.getElementById('nivelAcesso')?.value || ''

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const telefoneRegex = /^\d{10,}$/
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/

  const set = (id, msg) => {
    const el = document.getElementById(id)
    if (el) el.textContent = msg
  }

  const clear = (id) => {
    const el = document.getElementById(id)
    if (el) el.textContent = ''
  }

  let ok = true

  if (!nome) { set('error-nome', 'Nome é obrigatório.') ; ok = false } else clear('error-nome')
  if (!sobrenome) { set('error-sobrenome', 'Sobrenome é obrigatório.') ; ok = false } else clear('error-sobrenome')
  if (!emailRegex.test(email)) { set('error-email', 'E-mail inválido.') ; ok = false } else clear('error-email')
  if (!telefoneRegex.test(telefone)) { set('error-telefone', 'Telefone inválido.') ; ok = false } else clear('error-telefone')
  if (!especificacao) { set('error-especificacao', 'Especificação é obrigatória.') ; ok = false } else clear('error-especificacao')
  if (!dataNascimento) { set('error-dataNascimento', 'Data de nascimento é obrigatória.') ; ok = false } else clear('error-dataNascimento')

  if (password && !passwordRegex.test(password)) { set('error-password', 'Senha inválida.') ; ok = false } else clear('error-password')
  if (password !== confirmedPassword) { set('error-confirmedPassword', 'As senhas não coincidem.') ; ok = false } else clear('error-confirmedPassword')
  if (!nivelAcesso) { set('error-nivelAcesso', 'Nível de acesso é obrigatório.') ; ok = false } else clear('error-nivelAcesso')

  return ok
}

// =========================
// CARGA HORARIA
// =========================
const lista = document.getElementById('listaHorarios')
const btnAdd = document.getElementById('btnAddHorario')

function adicionarLinha(preenchido) {
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

  const selDia = row.querySelector('.dia')
  const inpInicio = row.querySelector('.inicio')
  const inpFim = row.querySelector('.fim')

  if (preenchido) {
    if (preenchido.diaSemana) selDia.value = preenchido.diaSemana
    if (preenchido.horaInicio) inpInicio.value = normalizarHora(preenchido.horaInicio)
    if (preenchido.horaFim) inpFim.value = normalizarHora(preenchido.horaFim)
  }

  row.querySelector('.btn-remover').onclick = () => {
    const total = document.querySelectorAll('.horario-row').length
    if (total <= 1) return
    row.remove()
  }

  lista.appendChild(row)
}

function normalizarHora(v) {
  if (!v) return ''
  if (typeof v === 'string' && v.length >= 5) return v.slice(0, 5)
  return v
}

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

async function carregarCargaHorariaDoColaborador(id) {
  if (!lista) return

  lista.innerHTML = ''

  try {
    const r = await fetch(`${API_BASE}/carga-horaria/medico/${id}`)
    if (!r.ok) throw new Error(`Status ${r.status}`)
    const arr = await r.json()

    if (Array.isArray(arr) && arr.length > 0) {
      arr.forEach(h => adicionarLinha(h))
      return
    }

    adicionarLinha()
  } catch (e) {
    adicionarLinha()
  }
}

// =========================
// ESPECIFICACOES
// =========================
async function carregarEspecificacoes() {
  try {
    const r = await fetch(`${API_BASE}/especificacoes`)
    if (!r.ok) throw new Error(`Status ${r.status}`)
    const arr = await r.json()
    const sel = document.getElementById('especificacao')
    if (!sel) return

    sel.innerHTML = '<option value=""></option>'
    arr.forEach(e => {
      const o = document.createElement('option')
      o.value = e.id
      o.textContent = e.area
      sel.appendChild(o)
    })
  } catch (err) {
    console.error('carregarEspecificacoes', err)
  }
}

// =========================
// BUSCAR E ATUALIZAR
// =========================
function getIdFromURL() {
  return new URLSearchParams(window.location.search).get('id')
}

async function buscarValores(id) {
  try {
    const r = await fetch(`${API_BASE}/medicos/${id}`)
    if (!r.ok) throw new Error(`Status ${r.status}`)
    const j = await r.json()

    document.getElementById('nome').value = j.nome || ''
    document.getElementById('sobrenome').value = j.sobrenome || ''
    document.getElementById('email').value = j.email || ''
    document.getElementById('telefone').value = j.telefone || ''
    document.getElementById('cpf').value = j.cpf || ''
    document.getElementById('dataNascimento').value = (j.dataNascimento || '').slice(0, 10)
    document.getElementById('carteirinha').value = j.carteirinha || ''
    document.getElementById('password').value = j.senha || ''
    document.getElementById('confirmedPassword').value = j.senha || ''

    await carregarEspecificacoes()
    if (j.especificacaoMedica?.id) {
      document.getElementById('especificacao').value = String(j.especificacaoMedica.id)
    }

    const nivelSelect = document.getElementById('nivelAcesso')
    if (nivelSelect) {
      const perm = j.permissao
      if (perm && perm.id != null) nivelSelect.value = String(perm.id)
      else if (typeof perm === 'number') nivelSelect.value = String(perm)
      else if (typeof perm === 'string' && /^\d+$/.test(perm)) nivelSelect.value = perm
    }

    const pictureImage = document.querySelector('.picture__image')
    if (j.foto && pictureImage) {
      pictureImage.innerHTML = ''
      const img = document.createElement('img')
      img.src = j.foto
      img.classList.add('picture__img')
      pictureImage.appendChild(img)
      selectedImage = j.foto
    }
  } catch (err) {
    console.error('buscarValores', err)
  }
}

async function salvarCargaHoraria(id, cargaHoraria) {
  // 1) tenta PUT em lote
  const put = await fetch(`${API_BASE}/carga-horaria/medico/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(cargaHoraria)
  })

  if (put.ok) return

  // 2) fallback: apaga e recria
  await fetch(`${API_BASE}/carga-horaria/medico/${id}`, { method: 'DELETE' })

  const post = await fetch(`${API_BASE}/carga-horaria/medico/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(cargaHoraria)
  })

  if (!post.ok) {
    const txt = await post.text()
    throw new Error(txt || `Status ${post.status}`)
  }
}

async function atualizarColaborador() {
  const id = getIdFromURL()
  if (!id) {
    Swal.fire({ icon: 'error', title: 'ID não encontrado' })
    return
  }

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

  const payload = {
    nome: document.getElementById('nome').value.trim(),
    sobrenome: document.getElementById('sobrenome').value.trim(),
    email: document.getElementById('email').value.trim(),
    telefone: document.getElementById('telefone').value.trim(),
    cpf: document.getElementById('cpf').value.trim(),
    dataNascimento: document.getElementById('dataNascimento').value,
    carteirinha: document.getElementById('carteirinha').value.trim(),
    senha: document.getElementById('password').value,
    ativo: true,
    especificacaoMedica: { id: Number(document.getElementById('especificacao').value) },
    permissao: { id: Number(document.getElementById('nivelAcesso').value) },
    foto: selectedImage || null
  }

  try {
    const r = await fetch(`${API_BASE}/medicos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(payload)
    })

    if (!r.ok) {
      const txt = await r.text()
      throw new Error(txt || `Status ${r.status}`)
    }

    await salvarCargaHoraria(id, cargaHoraria)

    Swal.fire({
      icon: 'success',
      title: 'Atualização realizada com sucesso!',
      showConfirmButton: false,
      timer: 1500
    }).then(() => {
      window.location.href = 'listagemColaborador.html'
    })
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Falha ao atualizar',
      text: err.message || 'Erro'
    })
  }
}

// =========================
// INIT
// =========================
document.addEventListener('DOMContentLoaded', async () => {
  initUI()

  if (btnAdd) btnAdd.onclick = () => adicionarLinha()

  const id = getIdFromURL()
  await carregarEspecificacoes()

  if (id) {
    await buscarValores(id)
    await carregarCargaHorariaDoColaborador(id)
  } else {
    if (lista && lista.children.length === 0) adicionarLinha()
  }
})
