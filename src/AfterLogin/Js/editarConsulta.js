const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : ''
const qs = new URLSearchParams(window.location.search)
const consultaId = qs.get('id')
let medicosCache = []
let pacientesCache = []
let statusCache = []
let especsCache = []

if (!consultaId) {
    Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'ID da consulta não informado.'
    }).then(() => {
        window.location.href = 'calendario.html'
    })
}

const $ = sel => document.querySelector(sel)
function setFloatLabels() {
    document.querySelectorAll('.input__field').forEach(el => {
        const hasValue = el.value && el.value.toString().trim() !== ''
        const label = el.parentElement.querySelector('.input__label, .input__labelDate')
        if (!label) return
        if (hasValue) {
            label.classList.add(label.classList.contains('input__labelDate') ? 'input__labelDate--active' : 'input__label--active')
        }
        el.addEventListener('input', () => {
            const active = el.value && el.value.toString().trim() !== ''
            label.classList.toggle(label.classList.contains('input__labelDate') ? 'input__labelDate--active' : 'input__label--active', active)
        })
    })
}
async function carregarCombos() {
   const [medicos, pacientes, status, especs] = await Promise.all([
        fetch(`${API_BASE}/mc/medicos`).then(r => r.json()),
        fetch(`${API_BASE}/mc/pacientes`).then(r => r.json()),
        fetch(`${API_BASE}/mc/statusConsultas`).then(r => r.json()),
        fetch(`${API_BASE}/mc/especificacoes`).then(r => r.json())
    ])

    medicosCache = medicos || []
    pacientesCache = pacientes || []
    statusCache = status || []
    especsCache = especs || []

    fillSelect('paciente', pacientesCache, 'id', p => `${p.nome} ${p.sobrenome}`)
    fillSelect('status', statusCache, 'id', s => s.nomeStatus)
    fillSelect('especificacao', especsCache, 'id', e => e.area)

    fillMedicosFiltrados()
}

function fillSelect(id, itens, valueField, textMap, selectedValue = '') {
    const sel = document.getElementById(id)
    sel.innerHTML = '<option value=""></option>'

    ;(itens || []).forEach(it => {
        const opt = document.createElement('option')
        opt.value = it[valueField]
        opt.textContent = textMap(it)
        if (selectedValue && String(opt.value) === String(selectedValue)) opt.selected = true
        sel.appendChild(opt)
    })
}

function fillMedicosFiltrados(selectedMedicoId = '') {
    const especId = document.getElementById('especificacao')?.value

    let filtrados = medicosCache

    if (especId) {
        filtrados = (medicosCache || []).filter(m => String(m?.especificacaoMedica?.id) === String(especId))
    }

    fillSelect('medico', filtrados, 'id', m => `${m.nome} ${m.sobrenome}`, selectedMedicoId)
}

function fDate(dtStr) {
    const d = new Date(dtStr)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}`, full: `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}` }
}
async function carregarConsulta() {
    const res = await fetch(`${API_BASE}/mc/consultas/id/${consultaId}`)
    if (!res.ok) {
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Consulta não encontrada.'
        }).then(() => {
            window.location.href = 'calendario.html'
        })
        return
    }
    const c = await res.json()
    $('#descricao').value = c.descricao || ''
    const dt = fDate(c.datahoraConsulta)
    $('#data').value = dt.date
    $('#hora').value = dt.time
    $('#duracao').value = (c.duracaoConsulta || '00:30:00')
    $('#medico').value = c.medico?.id || ''
    $('#paciente').value = c.paciente?.id || ''
    $('#status').value = c.statusConsulta?.id || ''
    $('#especificacao').value = c.especificacaoMedica?.id || ''
     fillMedicosFiltrados(c.medico?.id || '')

    $('#paciente').value = c.paciente?.id || ''
    setFloatLabels()
}
function validar() {
    const obrig = ['descricao', 'data', 'hora', 'duracao', 'medico', 'paciente', 'status', 'especificacao']
    let ok = true
    obrig.forEach(id => {
        const el = document.getElementById(id)
        const err = document.getElementById(`erro-${id}`) || document.getElementById(`erro-${id.split('-')[0]}`)
        if (!el.value) {
            ok = false
            if (err) err.textContent = 'Obrigatório'
        } else { if (err) err.textContent = '' }
    })
    return ok
} async function atualizar() {
    if (!validar()) return
    const data = $('#data').value
    const hora = $('#hora').value
    const payload = { id: Number(consultaId), descricao: $('#descricao').value, datahoraConsulta: `${data}T${hora}:00`, duracaoConsulta: $('#duracao').value, medico: { id: Number($('#medico').value) }, paciente: { id: Number($('#paciente').value) }, statusConsulta: { id: Number($('#status').value) }, especificacaoMedica: { id: Number($('#especificacao').value) } }
    const resp = await fetch(`${API_BASE}/mc/consultas/${consultaId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (resp.ok) {
        Swal.fire({
            icon: 'success',
            title: 'Sucesso',
            text: 'Consulta atualizada com sucesso!',
            confirmButtonColor: '#1976D2'
        }).then(() => {
            window.location.href = 'calendario.html'
        })
    } else {
        const txt = await resp.text()
        Swal.fire({
            icon: 'error',
            title: 'Erro ao atualizar',
            text: txt || 'Não foi possível salvar as alterações.',
            confirmButtonColor: '#1976D2'
        })
    }

} document.getElementById('btnAtualizar').addEventListener('click', atualizar); (async function init() {
    await carregarCombos()
    await carregarConsulta()
})()
document.getElementById('especificacao').addEventListener('change', () => {
    fillMedicosFiltrados('')
    setFloatLabels()
})

