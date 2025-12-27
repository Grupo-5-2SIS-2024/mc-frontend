if (!window.API_BASE) {
    window.API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:8080' : '';
}

// ===== CONFIGURAÇÃO SIMPLES DE PERMISSÕES =====
// Defina aqui o que cada perfil pode ver/fazer

const PERMISSOES = {
    'admin': {
        menus: ['Home', 'Colaborador', 'Paciente', 'Dash', 'Lead', 'AgendaDiaria'],
        botoes: ['btnAdicionarColaborador', 'addPacienteBtn', 'btnAdicionarConsulta', 'btnAdicionarArea']
    },
    'supervisor': {
        menus: ['Home', 'Colaborador', 'Paciente', 'AgendaDiaria'],
        botoes: [] // Supervisor não pode adicionar
    },
    'medico': {
        menus: ['Home', 'AgendaDiaria'],
        botoes: [] // Médico não pode adicionar
    },
    'profissional': {
        menus: ['Home', 'AgendaDiaria'],
        botoes: [] // Profissional não pode adicionar
    }
};

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
        let src = '';
        if (!fotoPerfil || fotoPerfil === 'null') {
            src = `${window.location.origin}/AfterLogin/Assets/perfil.jpeg`;
        } else if (/^https?:\/\//i.test(fotoPerfil)) {
            src = fotoPerfil;
        } else if (fotoPerfil.startsWith('/')) {
            src = window.location.origin + fotoPerfil;
        } else if (fotoPerfil.startsWith('.')) {
            const a = document.createElement('a');
            a.href = fotoPerfil;
            src = a.href;
        } else {
            src = `${window.location.origin}/${fotoPerfil.replace(/^\/+/, '')}`;
        }

        userAvatar.src = src;
        userAvatar.onerror = () => {
            userAvatar.onerror = null;
            userAvatar.src = `${window.location.origin}/AfterLogin/Assets/perfil.jpeg`;
        };
    }

    // ===== APLICAR PERMISSÕES =====
    aplicarPermissoes(nivelPermissao);
}

async function aplicarPermissoes(nivelPermissao) {
    // Normaliza o nome do perfil
    const normalize = (s) => {
        if (!s) return '';
        try {
            return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
        } catch (e) {
            return s.replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        }
    };

    const nivelNorm = normalize(nivelPermissao);
    let perfil = 'medico'; // padrão
    
    if (nivelNorm.includes('admin')) {
        perfil = 'admin';
    } else if (nivelNorm.includes('supervi')) {
        perfil = 'supervisor';
    } else if (nivelNorm.includes('medic')) {
        perfil = 'medico';
    }

    console.log('Perfil detectado:', perfil);

    // ===== BUSCA PERMISSÕES INDIVIDUAIS DO BACKEND =====
    const userId = sessionStorage.getItem('ID_MEDICO');
    let permissoesIndividuais = null;
    
    if (userId && perfil !== 'admin') {
        try {
            const resposta = await fetch(`${window.API_BASE}/mc/permissoes-individuais/buscar/${userId}`);
            const resultado = await resposta.json();
            
            if (resultado.permissoes) {
                permissoesIndividuais = JSON.parse(resultado.permissoes);
                console.log('Permissões individuais carregadas do backend:', permissoesIndividuais);
            }
        } catch (erro) {
            console.warn('Erro ao buscar permissões individuais, usando permissões padrão:', erro);
        }
    }
    
    if (permissoesIndividuais && perfil !== 'admin') {
        // USA PERMISSÕES INDIVIDUAIS (configuradas pelo Admin)
        console.log('Aplicando permissões individuais para usuário:', userId);
        const config = permissoesIndividuais;
        
        // Ocultar TODOS os menus e botões primeiro
        const todosMenus = ['Colaborador', 'Paciente', 'Dash', 'Lead', 'AgendaDiaria'];
        todosMenus.forEach(menuId => {
            const menu = document.getElementById(menuId);
            if (menu) menu.style.display = 'none';
        });
        
        const todosBotoes = ['btnAdicionarColaborador', 'addPacienteBtn', 'btnAdicionarConsulta', 'btnAdicionarArea'];
        todosBotoes.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.style.display = 'none';
        });
        
        // Mostrar apenas o que foi configurado
        config.menus.forEach(menuId => {
            const menu = document.getElementById(menuId);
            if (menu) menu.style.display = '';
        });
        
        config.botoes.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.style.display = '';
        });
        
    } else {
        // USA PERMISSÕES PADRÃO DO PERFIL
        console.log('Aplicando permissões padrão do perfil:', perfil);
        
        // Ocultar TODOS os menus primeiro
        const todosMenus = ['Colaborador', 'Paciente', 'Dash', 'Lead', 'AgendaDiaria'];
        todosMenus.forEach(menuId => {
            const menu = document.getElementById(menuId);
            if (menu) menu.style.display = 'none';
        });

        // Ocultar TODOS os botões primeiro
        const todosBotoes = ['btnAdicionarColaborador', 'addPacienteBtn', 'btnAdicionarConsulta', 'btnAdicionarArea'];
        todosBotoes.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.style.display = 'none';
        });

        // Mostrar apenas o que o perfil pode ver
        const config = PERMISSOES[perfil];
        if (config) {
            // Mostrar menus permitidos
            config.menus.forEach(menuId => {
                const menu = document.getElementById(menuId);
                if (menu) menu.style.display = '';
            });

            // Mostrar botões permitidos
            config.botoes.forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) btn.style.display = '';
            });
        }
    }
}

validarSessao();

function deslogar() {
    var emailMedico = sessionStorage.getItem("EMAIL_MEDICO");

    if (!emailMedico) {
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
                window.location = `${window.location.origin}/index.html`;
            } else {
                console.error('Erro ao deslogar o médico.');
            }
        })
        .catch(error => {
            console.error('Erro na requisição de logout:', error);
        });
}
