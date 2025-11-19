if (!window.API_BASE) {
    window.API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : '';
}
// Use window.API_BASE directly to avoid duplicate top-level declarations across scripts

function validarSessao() {
    var nomeMedico = sessionStorage.getItem("NOME_MEDICO");
    var sobrenomeMedico = sessionStorage.getItem("SOBRENOME_MEDICO");
    var nivelPermissao = sessionStorage.getItem("PERMISSIONAMENTO_MEDICO");
    var especificacao = sessionStorage.getItem("ESPECIFICACAO_MEDICA");
    var fotoPerfil = sessionStorage.getItem("FOTO");

    // Atualizar o nome e a permissão na navbar
    var userNome = document.getElementById("user_nome");
    var userPermissao = document.getElementById("user_permissao");
    var userAvatar = document.getElementById("user_avatar");
    // elementos usados por múltiplos ramos
    const Dashboards = document.getElementById("Dash");
    const Leads = document.getElementById("Lead");

    // Defensive: avoid printing literal 'null' and ensure elements exist
    if (userNome) {
        const safeNome = nomeMedico && nomeMedico !== 'null' ? nomeMedico : '';
        const safeSobrenome = sobrenomeMedico && sobrenomeMedico !== 'null' ? sobrenomeMedico : '';
        userNome.textContent = `${safeNome} ${safeSobrenome}`.trim();
    }
    if (userPermissao) {
        const safeNivel = nivelPermissao && nivelPermissao !== 'null' ? nivelPermissao : '';
        const safeEspec = especificacao && especificacao !== 'null' ? especificacao : '';
        userPermissao.textContent = `${safeNivel} ${safeEspec}`.trim();
    }

    if (userAvatar) {
        // Normalize fotoPerfil to an absolute URL to avoid wrong relative resolves
        let src = '';
        if (!fotoPerfil || fotoPerfil === 'null') {
            // default avatar (serve from the AfterLogin assets folder)
            src = `${window.location.origin}/AfterLogin/Assets/perfil.jpeg`;
        } else if (/^https?:\/\//i.test(fotoPerfil)) {
            src = fotoPerfil;
        } else if (fotoPerfil.startsWith('/')) {
            src = window.location.origin + fotoPerfil;
        } else if (fotoPerfil.startsWith('.')) {
            // relative path like ../Assets/perfil.jpeg — let the browser resolve it against the document
            const a = document.createElement('a');
            a.href = fotoPerfil;
            src = a.href;
        } else {
            // likely stored as 'AfterLogin/Assets/..' or 'Assets/..' — make absolute
            src = `${window.location.origin}/${fotoPerfil.replace(/^\/+/, '')}`;
        }

        userAvatar.src = src;
        // fallback to default if the image fails to load
        userAvatar.onerror = () => {
            userAvatar.onerror = null;
            userAvatar.src = `${window.location.origin}/AfterLogin/Assets/perfil.jpeg`;
        };
    }


    // Normalize permission string: remove diacritics and compare case-insensitively
    const normalize = (s) => {
        if (!s) return '';
        try {
            return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
        } catch (e) {
            // fallback if environment doesn't support Unicode property escapes
            return s.replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        }
    };

    const nivelNorm = normalize(nivelPermissao);
    console.debug('validarSessao: nivelPermissao=', nivelPermissao, '->', nivelNorm);

    if (nivelNorm === 'admin' || nivelNorm.includes('admin')) {
        // ADM pode acessar tudo, nenhuma ação necessária

    } else if (nivelNorm === 'supervisor' || nivelNorm.includes('supervi')) {

        // Supervisor: remover funções de adicionar pacientes e cadastrar colaboradores

        const cadastrarPacienteBtn = document.getElementById("addPacienteBtn");
        const adicionarColaboradorBtn = document.getElementById("btnAdicionarColaborador");
        const adicionarAreaBtn = document.getElementById("btnAdicionarArea");
        const adicionarConsultaBtn = document.getElementById("btnAdicionarConsulta");

        if (cadastrarPacienteBtn) {
            cadastrarPacienteBtn.style.display = "none";
        }
        if (adicionarAreaBtn) {
            adicionarAreaBtn.style.display = "none";
        }
        if (adicionarConsultaBtn) {
            adicionarConsultaBtn.style.display = "none";
        }
        if (adicionarColaboradorBtn) {
            adicionarColaboradorBtn.style.display = "none";
        }
        if (Leads) {
            Leads.style.display = "none"
        }
        if (Dashboards) {
            Dashboards.style.display = "none"
        }
    } else if (nivelNorm === 'medico' || nivelNorm.includes('medic')) {
        // Médico: remover botoes de Colaboradores, Pacientes e Dashboards
        if (Dashboards) {
            Dashboards.style.display = "none"
        }
        const Colaboradores = document.getElementById("Colaborador");
        const Pacientes = document.getElementById("Paciente");
        const adicionarConsultaBtn = document.getElementById("btnAdicionarConsulta");

        if (adicionarConsultaBtn) {
            adicionarConsultaBtn.style.display = "none";
        }

        if (Colaboradores) {
            Colaboradores.style.display = "none";
        }
        if (Pacientes) {
            Pacientes.style.display = "none"
        }
        if (Dashboards) {
            Dashboards.style.display = "none"
        }
        if (Leads) {
            Leads.style.display = "none"
        }
    }
}

validarSessao();

function deslogar() {

    var emailMedico = sessionStorage.getItem("EMAIL_MEDICO");


    if (!emailMedico) {
        // Redirect to application root index — use absolute path to avoid wrong relative resolution
        window.location = `${window.location.origin}/index.html`;
        return;
    }

    fetch(`${window.API_BASE}/mc/medicos/logout`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: emailMedico
        })
    })
        .then(response => {
            if (response.ok) {
                sessionStorage.clear();
                // Redirect to application root index after logout
                window.location = `${window.location.origin}/index.html`;
            } else {
                console.error('Erro ao deslogar o médico.');
            }
        })
        .catch(error => {
            console.error('Erro na requisição de logout:', error);
        });
}
