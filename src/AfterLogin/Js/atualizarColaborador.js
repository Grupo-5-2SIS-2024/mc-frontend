// Consolidated and cleaned atualizarColaborador.js
const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : '';

// UI helpers (password toggles, image preview)
const inputIcon = document.querySelector('.input__icon');
const inputIcon2 = document.querySelector('.input__icon2');
const inputPassword = document.getElementById('password');
const inputConfirmedPassword = document.getElementById('confirmedPassword');
const inputFile = document.querySelector('#picture__input');
const pictureImage = document.querySelector('.picture__image');
const pictureImageTxt = 'Choose an image';
if (pictureImage) pictureImage.innerHTML = pictureImageTxt;
let selectedImage = null;

if (inputIcon && inputPassword) inputIcon.addEventListener('click', () => { inputPassword.type = inputPassword.type === 'password' ? 'text' : 'password'; inputIcon.classList.toggle('ri-eye-off-line'); inputIcon.classList.toggle('ri-eye-line'); });
if (inputIcon2 && inputConfirmedPassword) inputIcon2.addEventListener('click', () => { inputConfirmedPassword.type = inputConfirmedPassword.type === 'password' ? 'text' : 'password'; inputIcon2.classList.toggle('ri-eye-off-line'); inputIcon2.classList.toggle('ri-eye-line'); });

if (inputFile && pictureImage) {
  inputFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) { pictureImage.innerHTML = pictureImageTxt; selectedImage = null; return; }
    const reader = new FileReader();
    reader.onload = (ev) => { const img = document.createElement('img'); img.src = ev.target.result; img.classList.add('picture__img'); pictureImage.innerHTML = ''; pictureImage.appendChild(img); selectedImage = ev.target.result; };
    reader.readAsDataURL(file);
  });
}

function validarCadastro() {
  const nome = document.getElementById('nome')?.value.trim() || '';
  const sobrenome = document.getElementById('sobrenome')?.value.trim() || '';
  const email = document.getElementById('email')?.value.trim() || '';
  const telefone = document.getElementById('telefone')?.value.trim() || '';
  const especificacao = document.getElementById('especificacao')?.value || '';
  const dataNascimento = document.getElementById('dataNascimento')?.value || '';
  const password = document.getElementById('password')?.value || '';
  const confirmedPassword = document.getElementById('confirmedPassword')?.value || '';
  const nivelAcesso = document.getElementById('nivelAcesso')?.value || '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const telefoneRegex = /^\d{10,}$/;
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

  const errors = [];
  const set = (id, msg) => { const el = document.getElementById(id); if (el) el.textContent = msg; errors.push(msg); };
  const clear = (id) => { const el = document.getElementById(id); if (el) el.textContent = ''; };

  if (!nome) set('error-nome', 'Nome é obrigatório.'); else clear('error-nome');
  if (!sobrenome) set('error-sobrenome', 'Sobrenome é obrigatório.'); else clear('error-sobrenome');
  if (!emailRegex.test(email)) set('error-email', 'E-mail inválido.'); else clear('error-email');
  if (!telefoneRegex.test(telefone)) set('error-telefone', 'Telefone inválido.'); else clear('error-telefone');
  if (!especificacao) set('error-especificacao', 'Especificação é obrigatória.'); else clear('error-especificacao');
  if (!dataNascimento) set('error-dataNascimento', 'Data de nascimento é obrigatória.'); else clear('error-dataNascimento');
  if (password && !passwordRegex.test(password)) set('error-password', 'Senha inválida.'); else clear('error-password');
  if (password !== confirmedPassword) set('error-confirmedPassword', 'As senhas não coincidem.'); else clear('error-confirmedPassword');
  if (!nivelAcesso) set('error-nivelAcesso', 'Nível de acesso é obrigatório.'); else clear('error-nivelAcesso');

  if (errors.length) { const em = document.querySelector('.error-message'); if (em) em.innerHTML = errors.join('<br>'); return false; }
  const em = document.querySelector('.error-message'); if (em) em.innerHTML = ''; return true;
}

async function buscarValores(id) {
  try {
    const r = await fetch(`${API_BASE}/mc/medicos/${id}`);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    const j = await r.json();
    document.getElementById('nome').value = j.nome || '';
    document.getElementById('sobrenome').value = j.sobrenome || '';
    document.getElementById('email').value = j.email || '';
    document.getElementById('telefone').value = j.telefone || '';
    document.getElementById('cpf').value = j.cpf || '';
    document.getElementById('dataNascimento').value = j.dataNascimento || '';
    document.getElementById('carteirinha').value = j.carteirinha || '';
    document.getElementById('password').value = j.senha || '';
    // permissao may be an object or a primitive. Prefer permission id (number) for the select value.
    try {
      const nivelSelect = document.getElementById('nivelAcesso');
      let nivelVal = '';
      const perm = j.permissao;
      if (perm && (perm.id !== undefined && perm.id !== null)) {
        nivelVal = String(perm.id);
      } else if (perm && perm.nome) {
        const nameMap = { Admin: '1', Supervisor: '2', Profissional: '3', Medico: '3', 'Médico': '3' };
        nivelVal = nameMap[perm.nome] || '';
      } else if (typeof perm === 'number' || (typeof perm === 'string' && /^\d+$/.test(perm))) {
        nivelVal = String(perm);
      }
      if (nivelSelect) nivelSelect.value = nivelVal;
    } catch (e) { }
    await carregarEspecificacoes();
    if (j.especificacaoMedica?.id) document.getElementById('especificacao').value = j.especificacaoMedica.id;
    if (j.foto && pictureImage) { pictureImage.innerHTML = ''; const img = document.createElement('img'); img.src = j.foto; img.classList.add('picture__img'); pictureImage.appendChild(img); selectedImage = j.foto; }
  } catch (err) { console.error('buscarValores:', err); }
}

async function carregarEspecificacoes() {
  try {
    const r = await fetch(`${API_BASE}/mc/especificacoes`);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    const arr = await r.json();
    const sel = document.getElementById('especificacao'); if (!sel) return;
    sel.innerHTML = '<option value=""></option>';
    arr.forEach(e => { const o = document.createElement('option'); o.value = e.id; o.textContent = e.area; sel.appendChild(o); });
  } catch (err) { console.error('carregarEspecificacoes:', err); }
}

function getIdFromURL() { return new URLSearchParams(window.location.search).get('id'); }

async function atualizarColaborador() {
  const id = getIdFromURL(); if (!id) { alert('ID não encontrado'); return; }
  if (!validarCadastro()) return;
  const nome = document.getElementById('nome').value.trim();
  const sobrenome = document.getElementById('sobrenome').value.trim();
  const email = document.getElementById('email').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const cpf = document.getElementById('cpf').value.trim() || null;
  const dataNascimento = document.getElementById('dataNascimento').value || null;
  const especificacaoId = document.getElementById('especificacao').value || null;
  const carteirinha = document.getElementById('carteirinha').value.trim() || null;
  const senha = document.getElementById('password').value || null;
  const nivelAcessoRaw = document.getElementById('nivelAcesso').value || null;
  const nivelMap = { Admin: 1, Supervisor: 2, Profissional: 3, Medico: 3, 'Médico': 3 };
  const nivelId = nivelMap[nivelAcessoRaw] || (isFinite(Number(nivelAcessoRaw)) ? Number(nivelAcessoRaw) : null);

  const payload = {
    nome, sobrenome, email, telefone, cpf, dataNascimento,
    especificacaoMedica: especificacaoId ? { id: Number(especificacaoId) } : null,
    carteirinha, senha, permissao: nivelId ? { id: Number(nivelId) } : null,
    foto: selectedImage || null
  };

  try {
    const r = await fetch(`${API_BASE}/mc/medicos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (r.ok) {
      const logged = sessionStorage.getItem('ID_MEDICO');
      if (logged && String(logged) === String(id) && selectedImage) { sessionStorage.setItem('FOTO', selectedImage); const ua = document.getElementById('user_avatar'); if (ua) ua.src = selectedImage; }
      Swal.fire({ icon: 'success', title: 'Atualização realizada com sucesso!', showConfirmButton: false, timer: 1500 }).then(() => window.location.href = 'listagemColaborador.html');
    } else {
      const txt = await r.text(); let msg = txt || 'Erro ao atualizar'; try { const j = JSON.parse(txt); msg = j.message || msg; } catch (e) { }
      alert(msg);
    }
  } catch (err) { console.error('atualizarColaborador:', err); alert('Erro ao atualizar. Veja console.'); }
}

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
  const id = getIdFromURL(); if (id) buscarValores(id); carregarEspecificacoes();
  const btn = document.getElementById('btnSalvarColaborador'); if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); atualizarColaborador(); });
});
