const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : ''
const qs = new URLSearchParams(window.location.search)
const consultaId = qs.get('id') || qs.get('consultaId')

let medicosCache = []
let pacientesCache = []
let statusCache = []
let especsCache = []
let salasCache = []
let consultaCarregada = null

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
            label.classList.add(
                label.classList.contains('input__labelDate')
                    ? 'input__labelDate--active'
                    : 'input__label--active'
            )
        }

        el.addEventListener('input', () => {
            const active = el.value && el.value.toString().trim() !== ''
            label.classList.toggle(
                label.classList.contains('input__labelDate')
                    ? 'input__labelDate--active'
                    : 'input__label--active',
                active
            )
        })

        el.addEventListener('change', () => {
            const active = el.value && el.value.toString().trim() !== ''
            label.classList.toggle(
                label.classList.contains('input__labelDate')
                    ? 'input__labelDate--active'
                    : 'input__label--active',
                active
            )
        })
    })
}

async function carregarCombos() {
    const [medicos, pacientes, status, especs, salas] = await Promise.all([
        fetch(`${API_BASE}/mc/medicos`).then(r => r.json()),
        fetch(`${API_BASE}/mc/pacientes`).then(r => r.json()),
        fetch(`${API_BASE}/mc/statusConsultas`).then(r => r.json()),
        fetch(`${API_BASE}/mc/especificacoes`).then(r => r.json()),
        fetch(`${API_BASE}/mc/salas`).then(r => r.json())
    ])

    medicosCache = medicos || []
    pacientesCache = pacientes || []
    statusCache = status || []
    especsCache = especs || []
    salasCache = salas || []

    fillSelect('paciente', pacientesCache, 'id', p => `${p.nome} ${p.sobrenome}`)
    fillSelect('status', statusCache, 'id', s => s.nomeStatus)
    fillSelect('especificacao', especsCache, 'id', e => e.area)
    fillSelect('sala', salasCache, 'id', s => s.nome)

    fillMedicosFiltrados()
}

function fillSelect(id, itens, valueField, textMap, selectedValue = '') {
    const sel = document.getElementById(id)
    sel.innerHTML = '<option value=""></option>'

    ;(itens || []).forEach(it => {
        const opt = document.createElement('option')
        opt.value = it[valueField]
        opt.textContent = textMap(it)
        if (selectedValue && String(opt.value) === String(selectedValue)) {
            opt.selected = true
        }
        sel.appendChild(opt)
    })
}

function fillMedicosFiltrados(selectedMedicoId = '') {
    const especId = document.getElementById('especificacao')?.value

    let filtrados = medicosCache

    if (especId) {
        filtrados = (medicosCache || []).filter(
            m => String(m?.especificacaoMedica?.id) === String(especId)
        )
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

    return {
        date: `${yyyy}-${mm}-${dd}`,
        time: `${hh}:${mi}`,
        full: `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`
    }
}

function resolverEspecificacaoIdDaConsulta(consulta) {
    const direto = consulta?.especificacaoMedica?.id
    if (direto != null && direto !== '') return direto

    const viaMedico = consulta?.medico?.especificacaoMedica?.id
    if (viaMedico != null && viaMedico !== '') return viaMedico

    const areaNome = (
        consulta?.especificacaoMedica?.area ||
        consulta?.medico?.especificacaoMedica?.area ||
        ''
    ).toString().trim().toLowerCase()

    if (!areaNome) return ''

    const encontrada = (especsCache || []).find(
        e => (e?.area || '').toString().trim().toLowerCase() === areaNome
    )

    return encontrada?.id || ''
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
    consultaCarregada = c

    $('#descricao').value = c.descricao || ''

    const dt = fDate(c.datahoraConsulta)
    $('#data').value = dt.date
    $('#hora').value = dt.time
    $('#duracao').value = (c.duracaoConsulta || '00:30:00')

    const especificacaoId = resolverEspecificacaoIdDaConsulta(c)
    $('#especificacao').value = especificacaoId || ''

    fillMedicosFiltrados(c.medico?.id || '')
    $('#medico').value = c.medico?.id || ''
    $('#paciente').value = c.paciente?.id || ''
    $('#status').value = c.statusConsulta?.id || ''
    $('#sala').value = c.sala?.id || ''

    setFloatLabels()
}

function getDuracaoMinutosFromValue(val) {
    if (val == null) return null
    if (typeof val === 'number' && isFinite(val)) return val

    const s = String(val).trim()

    let m = s.match(/^([0-9]{1,2}):([0-9]{2}):([0-9]{2})$/)
    if (m) {
        const hh = Number(m[1])
        const mm = Number(m[2])
        return (hh * 60) + mm
    }

    m = s.match(/^([0-9]{1,2}):([0-9]{2})$/)
    if (m) {
        const hh = Number(m[1])
        const mm = Number(m[2])
        return (hh * 60) + mm
    }

    const n = Number(s)
    if (!Number.isNaN(n) && isFinite(n)) return n

    return null
}

function timeHHMMFromISO(iso) {
    try {
        const d = new Date(iso)
        const hh = String(d.getHours()).padStart(2, '0')
        const mm = String(d.getMinutes()).padStart(2, '0')
        return `${hh}:${mm}`
    } catch {
        return ''
    }
}

function computeSeriesKeyFromConsulta(c) {
    const medicoId = c?.medico?.id ?? ''
    const pacienteId = c?.paciente?.id ?? ''
    const especId = c?.especificacaoMedica?.id ?? ''
    const salaId = c?.sala?.id ?? ''
    const durMin = getDuracaoMinutosFromValue(c?.duracaoConsulta ?? c?.duracao)
    const hhmm = timeHHMMFromISO(c?.datahoraConsulta)

    return `${medicoId}|${pacienteId}|${especId}|${salaId}|${durMin ?? ''}|${hhmm}`
}

function validar() {
    const obrig = ['descricao', 'data', 'hora', 'duracao', 'medico', 'paciente', 'status', 'especificacao', 'sala']
    let ok = true

    obrig.forEach(id => {
        const el = document.getElementById(id)
        const err = document.getElementById(`erro-${id}`) || document.getElementById(`erro-${id.split('-')[0]}`)

        if (!el.value) {
            ok = false
            if (err) err.textContent = 'Obrigatório'
        } else {
            if (err) err.textContent = ''
        }
    })

    return ok
}

async function atualizar() {
    try {
        if (!validar()) return

        const salaEl = $('#sala')
        if (!salaEl) {
            await Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Campo de sala não encontrado na tela.'
            })
            return
        }

        const data = $('#data').value
        const hora = $('#hora').value

        const payload = {
            id: Number(consultaId),
            descricao: $('#descricao').value,
            datahoraConsulta: `${data}T${hora}:00`,
            duracaoConsulta: $('#duracao').value,
            medico: { id: Number($('#medico').value) },
            paciente: { id: Number($('#paciente').value) },
            statusConsulta: { id: Number($('#status').value) },
            especificacaoMedica: { id: Number($('#especificacao').value) },
            sala: { id: Number($('#sala').value) }
        }

        console.log('Payload de atualização:', payload)

        const choice = await Swal.fire({
            title: 'Atualizar recorrência?',
            text: 'Deseja aplicar esta atualização somente a esta consulta ou a todas as recorrentes deste dia em diante?',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'Somente esta',
            denyButtonText: 'Recorrentes a partir desta',
            cancelButtonText: 'Cancelar'
        })

        if (choice.isDismissed) return

        if (choice.isConfirmed) {
            const resp = await fetch(`${API_BASE}/mc/consultas/${consultaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const txt = await resp.text()

            if (!resp.ok) {
                throw new Error(txt || `Falha ao atualizar. HTTP ${resp.status}`)
            }

            await Swal.fire({
                icon: 'success',
                title: 'Sucesso',
                text: 'Consulta atualizada com sucesso!',
                confirmButtonColor: '#1976D2'
            })

            window.location.href = 'calendario.html'
            return
        }

        const startDate = new Date(`${data}T00:00:00`)
        const key = computeSeriesKeyFromConsulta(consultaCarregada || {})

        Swal.fire({
            title: 'Atualizando recorrências...',
            text: 'Aplicando alterações nas consultas futuras.',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => { Swal.showLoading() }
        })

        const allRes = await fetch(`${API_BASE}/mc/consultas`)
        const todas = allRes.ok ? await allRes.json() : []

        const afuturas = (todas || []).filter(c => {
            const d = new Date(c.datahoraConsulta)
            const sameSeries = computeSeriesKeyFromConsulta(c) === key
            return sameSeries && d >= startDate
        })

        const hhmm = hora

        const makeISO = (dateObj) => {
            const yyyy = dateObj.getFullYear()
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
            const dd = String(dateObj.getDate()).padStart(2, '0')
            return `${yyyy}-${mm}-${dd}T${hhmm}:00`
        }

        const updates = afuturas.map(c2 => {
            const d = new Date(c2.datahoraConsulta)

            const p2 = {
                id: Number(c2.id),
                descricao: $('#descricao').value,
                datahoraConsulta: makeISO(d),
                duracaoConsulta: $('#duracao').value,
                medico: { id: Number($('#medico').value) },
                paciente: { id: Number($('#paciente').value) },
                statusConsulta: { id: Number($('#status').value) },
                especificacaoMedica: { id: Number($('#especificacao').value) },
                sala: { id: Number($('#sala').value) }
            }

            return fetch(`${API_BASE}/mc/consultas/${c2.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(p2)
            })
        })

        const results = await Promise.allSettled(updates)
        Swal.close()

        const failed = results.filter(r => r.status === 'rejected' || (r.value && !r.value.ok))

        if (failed.length === 0) {
            await Swal.fire({
                icon: 'success',
                title: 'Sucesso',
                text: `Atualizações aplicadas em ${updates.length} consultas.`,
                confirmButtonColor: '#1976D2'
            })
            window.location.href = 'calendario.html'
        } else {
            await Swal.fire({
                icon: 'warning',
                title: 'Parcialmente atualizado',
                text: `Algumas consultas não puderam ser atualizadas (${failed.length}).`,
                confirmButtonColor: '#1976D2'
            })
        }
    } catch (e) {
        console.error('Erro ao atualizar consulta:', e)

        await Swal.fire({
            icon: 'error',
            title: 'Erro ao atualizar',
            text: e?.message || 'Falha ao salvar a consulta.'
        })
    }
}

document.getElementById('btnAtualizar').addEventListener('click', atualizar)

;(async function init() {
    await carregarCombos()
    await carregarConsulta()
})()

document.getElementById('especificacao').addEventListener('change', () => {
    fillMedicosFiltrados('')
    setFloatLabels()
})