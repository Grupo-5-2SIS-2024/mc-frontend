// Funções para abrir e fechar o modal de filtros
function abrirModalFiltroLeads() {
    document.getElementById("modalFiltroLeads").style.display = "block";
}
function fecharModalFiltroLeads() {
    document.getElementById("modalFiltroLeads").style.display = "none";
}

// Funções para limpar e aplicar filtros
function limparFiltrosLeads() {
    document.getElementById('filtroNomeLead').value = '';
    document.getElementById('filtroEmailLead').value = '';
    document.getElementById('filtroDataEntradaLead').value = '';
    document.getElementById('filtroFaseLead').value = '';
    document.getElementById('listaFiltrosAtivosLeads').innerHTML = ''; // Limpa a lista de filtros ativos
    buscarLeads(); // Busca os leads sem filtros
}

function aplicarFiltrosLeads() {
    const nome = document.getElementById('filtroNomeLead').value.toLowerCase();
    const email = document.getElementById('filtroEmailLead').value.toLowerCase();
    const dataEntrada = document.getElementById('filtroDataEntradaLead').value;
    const fase = document.getElementById('filtroFaseLead').value.toLowerCase();

    const filtrosAtivos = {
        nome: nome,
        email: email,
        dataEntrada: dataEntrada,
        fase: fase
    };

    const listaFiltrosAtivos = document.getElementById('listaFiltrosAtivosLeads');
    listaFiltrosAtivos.innerHTML = '';

    // Adiciona cada filtro ativo à lista com um botão "X" para remover
    for (const [key, value] of Object.entries(filtrosAtivos)) {
        if (value) {
            const li = document.createElement('li');
            li.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;

            // Cria o botão "X" para remover o filtro
            const botaoRemover = document.createElement('button');
            botaoRemover.textContent = 'X';
            botaoRemover.classList.add('removerFiltro');
            botaoRemover.addEventListener('click', () => removerFiltroEspecifico(key));

            li.appendChild(botaoRemover);
            listaFiltrosAtivos.appendChild(li);
        }
    }

    // Busca leads com os filtros aplicados
    buscarLeads(nome, email, dataEntrada, fase);
}

// Função para remover um filtro específico
function removerFiltroEspecifico(filtro) {
    document.getElementById(`filtro${filtro.charAt(0).toUpperCase() + filtro.slice(1)}Lead`).value = '';
    aplicarFiltrosLeads(); // Reaplica os filtros após remover o específico
}

// Função para buscar leads com filtros específicos
async function buscarLeads(nomeFiltro = '', emailFiltro = '', dataEntradaFiltro = '', faseFiltro = '') {
    try {
        const resposta = await fetch("http://localhost:8080/leads");
        const listaLeads = await resposta.json();
        console.log(listaLeads); // Adicione isto para verificar os dados recebidos

        const leadsFiltrados = listaLeads.filter(lead => {
            const nomeCompleto = `${lead.nome} ${lead.sobrenome}`.toLowerCase();
            const dataEntrada = new Date(lead.dataEntrada).toISOString().split('T')[0];
            return (
                (nomeCompleto.includes(nomeFiltro) || nomeFiltro === '') &&
                (lead.email.toLowerCase().includes(emailFiltro) || emailFiltro === '') &&
                (dataEntrada === dataEntradaFiltro || dataEntradaFiltro === '') &&
                (lead.fase.toLowerCase().includes(faseFiltro) || faseFiltro === '')
            );
        });

        atualizarListagemLeads(leadsFiltrados);
    } catch (e) {
        console.log(e);
    }
}

// Função para atualizar a listagem de leads
function atualizarListagemLeads(listaLeads) {
    const cardsLeads = document.getElementById("listagemLeads");
    cardsLeads.innerHTML = listaLeads.map(lead => {
        const dataEntradaFormatada = new Date(lead.dataEntrada).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const formatarTelefone = (telefone) => telefone ? telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : '';

        return `
           <div class="cardLead" data-lead-id="${lead.id}">
                    <div class="info">
                        <div class="field">
                            <label for="nome">Nome</label>
                            <p id="nome">${lead.nome} ${lead.sobrenome}</p>
                        </div>
                        <div class="field">
                            <label for="email">Email</label>
                            <p id="email">${lead.email}</p>
                        </div>
                        <div class="field">
                            <label for="cpf">Data de Entrada</label>
                            <p id="cpf">${dataEntradaFormatada}</p>
                        </div>
                        <div class="field">
                            <label for="telefone">Telefone</label>
                            <p id="telefone">${formatarTelefone(lead.telefone)}</p>
                        </div>
                        <div class="field">
                            <label for="fase">Fase</label>
                            <p id="fase">${lead.fase}</p>
                        </div>
                    </div>
                    <div class="actions">
                        <button class="delete"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
        `;
    }).join('');

    // Adiciona evento de clique para os botões de exclusão
    cardsLeads.querySelectorAll('.delete').forEach((botao) => {
        botao.addEventListener('click', function () {
            const card = this.closest('.cardLead');
            const id = card.dataset.leadId;

            if (id) {
                Swal.fire({
                    title: 'Tem certeza?',
                    text: "Você não poderá reverter isso!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Sim, deletar!',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        deletarLead(id);
                    }
                });
            } else {
                console.error('ID do lead não encontrado.');
            }
        });
    });
}

async function deletarLead(id) {
    try {
        const resposta = await fetch(`http://localhost:8080/leads/${id}`, {
            method: 'DELETE'
        });
        if (!resposta.ok) {
            throw new Error(`Erro ao deletar lead: ${resposta.statusText}`);
        }
        console.log('Lead deletado com sucesso.');
        buscarLeads();
    } catch (erro) {
        console.error('Erro ao deletar lead:', erro);
    }
}

// Chama a função para listar os leads ao carregar a página
buscarLeads();

async function buscarKPIsLeads() {
    try {
        // Buscar o número total de leads
        const respostaTotalLeads = await fetch('http://localhost:8080/leads');
        const listaLeads = await respostaTotalLeads.json();
        const totalLeads = listaLeads.length;

        // Buscar a porcentagem de leads convertidos
        const respostaPorcentagemConvertidos = await fetch('http://localhost:8080/leads/percentual-convertidos');
        const porcentagemConvertidos = await respostaPorcentagemConvertidos.json();

        // Filtrar leads com mais de 6 meses de cadastro
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

        const leadsMaisDeSeisMeses = listaLeads.filter(lead => {
            const dataEntrada = new Date(lead.dataEntrada);
            return dataEntrada < seisMesesAtras;
        });
        const totalLeadsMaisDeSeisMeses = leadsMaisDeSeisMeses.length;

        // Função para adicionar zero à esquerda se necessário
        const formatarNumero = (numero) => numero.toString().padStart(2, '0');

        // Atualizar os valores nos elementos HTML, com zero à esquerda
        document.querySelector('.cardKpi:nth-child(1) .kpiNumber').textContent = formatarNumero(totalLeads);
        document.querySelector('.cardKpi:nth-child(2) .kpiNumber').textContent = porcentagemConvertidos + '%';
        document.querySelector('.cardKpi:nth-child(3) .kpiNumber').textContent = formatarNumero(totalLeadsMaisDeSeisMeses);

    } catch (erro) {
        console.error('Erro ao buscar os dados dos KPIs:', erro);
    }
}

buscarKPIsLeads();