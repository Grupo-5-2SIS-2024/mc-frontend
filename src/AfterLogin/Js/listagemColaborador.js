function abrirModalFiltro() {
    document.getElementById("modalFiltro").style.display = "block";
}

function fecharModalFiltro() {
    document.getElementById("modalFiltro").style.display = "none";
}

function limparFiltros() {
    document.getElementById('filtroNome').value = '';
    document.getElementById('filtroEmail').value = '';
    document.getElementById('filtroEspecialidade').value = '';
    document.getElementById('listaFiltrosAtivos').innerHTML = ''; 
    buscarMedicos()
}

function aplicarFiltros() {
    const nome = document.getElementById('filtroNome').value.toLowerCase().trim();
    const email = document.getElementById('filtroEmail').value.toLowerCase().trim();
    const especialidade = document.getElementById('filtroEspecialidade').value.toLowerCase().trim();

    const filtrosAtivos = [];

    if (nome) filtrosAtivos.push(`Nome: ${nome}`);
    if (email) filtrosAtivos.push(`Email: ${email}`);
    if (especialidade) filtrosAtivos.push(`Especialidade: ${especialidade}`);

    // Atualiza a lista de filtros ativos
    const listaFiltrosAtivos = document.getElementById('listaFiltrosAtivos');
    listaFiltrosAtivos.innerHTML = '';
    filtrosAtivos.forEach(filtro => {
        const li = document.createElement('li');
        li.textContent = filtro;
        listaFiltrosAtivos.appendChild(li);
    });

    // Chama buscarMedicos com os valores dos filtros
    buscarMedicos(nome, email, especialidade, status);
}

async function buscarMedicos(nomeFiltro = '', emailFiltro = '', especialidadeFiltro = '', statusFiltro = '') {
    try {
        const nivelPermissao = sessionStorage.getItem("PERMISSIONAMENTO_MEDICO");
        const areaEspecializacaoSupervisor = sessionStorage.getItem("ESPECIFICACAO_MEDICA");
        const idMedicoLogado = Number(sessionStorage.getItem("ID_MEDICO"));

        const resposta = await fetch("http://localhost:8080/medicos");
        const listaMedicos = await resposta.json();

        let medicosFiltrados = listaMedicos.filter(medico => medico.id !== idMedicoLogado);

        if (nivelPermissao === "Supervisor") {
            medicosFiltrados = medicosFiltrados.filter(medico => {
                const especializacaoMedico = medico.especificacaoMedica?.area.trim().toLowerCase() || '';
                const isAdmin = medico.permissao.nome === "Admin";
                return especializacaoMedico === areaEspecializacaoSupervisor.toLowerCase() && !isAdmin;
            });
        }

        const medicosFiltradosFinal = medicosFiltrados.filter(medico => {
            const nomeCompleto = `${medico.nome} ${medico.sobrenome}`.toLowerCase();
            const isAtivo = medico.ativo ? 'Ativo' : 'Inativo';

            return (
                (nomeCompleto.includes(nomeFiltro) || nomeFiltro === '') &&
                (medico.email.toLowerCase().includes(emailFiltro) || emailFiltro === '') &&
                (medico.especificacaoMedica?.area.toLowerCase().includes(especialidadeFiltro) || especialidadeFiltro === '') &&
                (isAtivo === statusFiltro || statusFiltro === '')
            );
        });

        const cardsMedicos = document.getElementById("listagem");
        cardsMedicos.innerHTML = medicosFiltradosFinal.map((medico) => {
            const status = medico.ativo ? 'Ativo' : 'Inativo';
            const foto = medico.foto || "../Assets/perfil.jpeg";
            const acoes = nivelPermissao === "Supervisor" ? '' : `
                <div class="actions">
                    <button class="update"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete"><i class="fas fa-trash-alt"></i></button>
                </div>`;

            return `
                <div class="cardColaborador" data-medico-id="${medico.id}">
                    <img src="${foto}" alt="Foto do Colaborador">
                    <div class="info">
                        <div class="field"><label>Nome</label><p>${medico.nome} ${medico.sobrenome}</p></div>
                        <div class="field"><label>Email</label><p>${medico.email}</p></div>
                        <div class="field"><label>Especificação</label><p>${medico.especificacaoMedica.area}</p></div>
                        <div class="field"><label>Status</label><p>${status}</p></div>
                        <div class="field"><label>Permissão</label><p>${medico.permissao.nome}</p></div>
                    </div>
                    ${acoes}
                </div>`;
        }).join('');

        if (nivelPermissao !== "Supervisor") {
            cardsMedicos.querySelectorAll('.delete').forEach((botao) => {
                botao.addEventListener('click', function () {
                    const id = this.closest('.cardColaborador').dataset.medicoId;
                    if (id) {
                        Swal.fire({
                            title: 'Tem certeza?',
                            text: "Você não poderá reverter isso!",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Sim, deletar!',
                            cancelButtonText: 'Cancelar'
                        }).then((result) => {
                            if (result.isConfirmed) deletarMedico(id);
                        });
                    }
                });
            });

            cardsMedicos.querySelectorAll('.update').forEach((botao) => {
                botao.addEventListener('click', function () {
                    const id = this.closest('.cardColaborador').dataset.medicoId;
                    if (id) window.location.href = `atualizarColaborador.html?id=${id}`;
                });
            });
        }
    } catch (e) {
        console.error('Erro ao buscar médicos:', e);
    }
}

buscarMedicos();


async function deletarMedico(id) {
    try {
        // Tenta deletar o acompanhamento
        try {
            const resposta1 = await fetch(`http://localhost:8080/acompanhamentos/${id}`, {
                method: 'DELETE'
            });
            if (!resposta1.ok && resposta1.status !== 404) {
                throw new Error(`Erro ao deletar acompanhamento: ${resposta1.statusText}`);
            }
        } catch (erro) {
            console.warn('Nenhum acompanhamento para deletar ou erro ao deletar acompanhamento:', erro);
        }

        // Tenta deletar as consultas
        try {
            const resposta2 = await fetch(`http://localhost:8080/consultas/${id}`, {
                method: 'DELETE'
            });
            if (!resposta2.ok && resposta2.status !== 404) {
                throw new Error(`Erro ao deletar consultas: ${resposta2.statusText}`);
            }
        } catch (erro) {
            console.warn('Nenhuma consulta para deletar ou erro ao deletar consultas:', erro);
        }

        // Tenta deletar as notas
        try {
            const resposta3 = await fetch(`http://localhost:8080/notas/${id}`, {
                method: 'DELETE'
            });
            if (!resposta3.ok && resposta3.status !== 404) {
                throw new Error(`Erro ao deletar notas: ${resposta3.statusText}`);
            }
        } catch (erro) {
            console.warn('Nenhuma nota para deletar ou erro ao deletar notas:', erro);
        }

        // Deleta o médico
        const resposta4 = await fetch(`http://localhost:8080/medicos/${id}`, {
            method: 'DELETE'
        });
        if (!resposta4.ok) {
            throw new Error(`Erro ao deletar médico: ${resposta4.statusText}`);
        }

        // Se todas as operações forem bem-sucedidas, exibe a mensagem e recarrega a lista de médicos
        console.log('Médico deletado com sucesso.');
        buscarMedicos();
    } catch (erro) {
        console.error('Erro ao deletar médico:', erro);
    }
}

async function buscarKPIsMedico() {
    try {
        // Buscar o número total de médicos
        const respostaTotalMedicos = await fetch('http://localhost:8080/medicos');
        const listaMedicos = await respostaTotalMedicos.json();
        const totalMedicos = listaMedicos.length;

        // Buscar o número de médicos ativos
        const medicosAtivos = listaMedicos.filter(medico => medico.ativo).length;

        // Buscar o total de administradores
        const respostaTotalAdmins = await fetch('http://localhost:8080/medicos/totalAdministradores');
        const totalAdmins = await respostaTotalAdmins.json();

        // Buscar o número de administradores ativos
        const respostaAdminsAtivos = await fetch('http://localhost:8080/medicos/totalAdministradoresAtivos');
        const totalAdminsAtivos = await respostaAdminsAtivos.json();

        // Função para adicionar zero à esquerda se necessário
        const formatarNumero = (numero) => numero.toString().padStart(2, '0');

        // Atualizar os valores nos elementos HTML, com zero à esquerda
        document.querySelector('.cardKpi:nth-child(1) .kpiNumber').textContent = formatarNumero(totalMedicos);
        document.querySelector('.cardKpi:nth-child(2) .kpiNumber').textContent = formatarNumero(medicosAtivos);
        document.querySelector('.cardKpi:nth-child(3) .kpiNumber').textContent = formatarNumero(totalAdmins);
        document.querySelector('.cardKpi:nth-child(4) .kpiNumber').textContent = formatarNumero(totalAdminsAtivos);

    } catch (erro) {
        console.error('Erro ao buscar os dados dos KPIs:', erro);
    }
}

buscarKPIsMedico();

async function buscarAreasClinica() {
    try {
        const resposta = await fetch('http://localhost:8080/especificacoes');
        const listaAreas = await resposta.json();
        console.log('Áreas recebidas:', listaAreas);

        const listaAreasContainer = document.getElementById("listagemAreas");
        listaAreasContainer.innerHTML = listaAreas.map((especificacao) => {
            return `
                <div class="cardArea" data-area-id="${especificacao.id}">
                    <div class="info">
                        <p id="areaNome_${especificacao.id}">${especificacao.area}</p>
                        <input type="text" id="inputArea_${especificacao.id}" class="inputAtualizar" style="display: none;" placeholder="Atualizar área" value="${especificacao.area}">
                    </div>
                    <div class="actions">
                        <button class="update" onclick="toggleEditarArea(${especificacao.id})">Editar</button>
                        <button class="confirm" onclick="atualizarArea(${especificacao.id})" style="display: none;" id="botaoConfirmar_${especificacao.id}">✔</button>
                    </div>
                </div>`;
        }).join('');

    } catch (erro) {
        console.error('Erro ao buscar áreas:', erro);
    }
}

function toggleEditarArea(areaId) {
    const nomeArea = document.getElementById(`areaNome_${areaId}`);
    const inputArea = document.getElementById(`inputArea_${areaId}`);
    const botaoEditar = document.querySelector(`[onclick="toggleEditarArea(${areaId})"]`);
    const botaoConfirmar = document.getElementById(`botaoConfirmar_${areaId}`);

    // Alterna a exibição do nome da área e do campo de entrada
    const isEditing = inputArea.style.display === 'inline-block';
    nomeArea.style.display = isEditing ? 'block' : 'none';
    inputArea.style.display = isEditing ? 'none' : 'inline-block';
    botaoEditar.style.display = isEditing ? 'inline-block' : 'none';
    botaoConfirmar.style.display = isEditing ? 'none' : 'inline-block';

    // Se estiver editando, define o valor do campo como o nome atual
    if (!isEditing) {
        inputArea.value = nomeArea.textContent.trim();
    }
}

async function atualizarArea(areaId) {
    const inputArea = document.getElementById(`inputArea_${areaId}`);
    const novoNome = inputArea.value.trim();

    try {
        const resposta = await fetch(`http://localhost:8080/especificacoes/${areaId}`, {
            method: "PUT",
            body: JSON.stringify({ area: novoNome }),
            headers: { "Content-type": "application/json; charset=UTF-8" }
        });

        if (resposta.ok) {
            document.getElementById(`areaNome_${areaId}`).textContent = novoNome;
            toggleEditarArea(areaId); // Volta ao modo de visualização
            Swal.fire({
                icon: 'success',
                title: 'Área atualizada com sucesso!',
                showConfirmButton: false,
                timer: 1500
            });
        } else {
            throw new Error('Erro ao atualizar a área.');
        }
    } catch (error) {
        console.error('Erro ao atualizar a área:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao atualizar a área.',
            text: error.message
        });
    }
}



// Chama a função para listar as áreas ao carregar a página
buscarAreasClinica();


function abrirModal() {
    buscarAreasClinica();
    document.getElementById("modalArea").style.display = "flex";
}

function fecharModal() {
    document.getElementById("modalArea").style.display = "none";
}

async function cadastrarArea() {
    const nomeArea = document.getElementById("nomeArea").value;

    if (nomeArea.trim() === "") {
        alert("O nome da área não pode estar vazio.");
        return;
    }

    const dadosArea = {
        "area": nomeArea
    };

    try {
        const respostaCadastro = await fetch('http://localhost:8080/especificacoes', {
            method: "POST",
            body: JSON.stringify(dadosArea),
            headers: { "Content-type": "application/json; charset=UTF-8" }
        });

        console.log(respostaCadastro);
        console.log(respostaCadastro.status);

        if (respostaCadastro.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Área cadastrada com sucesso!',
                text: 'A nova área foi adicionada.',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                buscarAreasClinica(); // Recarrega a lista de áreas
                document.getElementById("nomeArea").value = ""; // Limpa o input
            });
        } else {
            alert("Ocorreu um erro ao cadastrar a área.");
        }
    } catch (error) {
        console.error("Erro ao realizar o cadastro:", error);
        alert("Erro de comunicação com o servidor.");
    }
}



