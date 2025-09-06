



document.addEventListener("DOMContentLoaded", () => {
    const diaInput = document.getElementById("dia");
    const diaConsulta = sessionStorage.getItem('DIA_CONSULTA');
    if (diaConsulta) {
        diaInput.value = diaConsulta;
        sessionStorage.removeItem('DIA_CONSULTA');
        updateAvailableHours(dia);
    }
});

function formatarData(dataISO){
    const data = new Date(dataISO)
    const dia = String(data.getDate()).padStart(2,'0');
    const mes =String(data.getMonth() + 1). padStart(2,'0');
    const ano = data.getFullYear();
    
    const  horas = String(data.getHours()).padStart(2,'0')
    const minutos = String(data.getMinutes()).padStart(2,'0')
    const segundos = String(data.getSeconds()).padStart(2,'0')
    
    return `${dia}/${mes}/${ano} - ${horas}:${minutos}:${segundos}`
    
    
    }
// Função para determinar o ícone com base no gênero do paciente
function obterIconeGenero(genero) {
    if (genero.toLowerCase() === 'masculino') {
        return '<i class="fas fa-male" style="font-size: 50px; color: #1E90FF;"></i>'; // Azul para homens
    } else if (genero.toLowerCase() === 'feminino') {
        return '<i class="fas fa-female" style="font-size: 50px; color: #E91E63;"></i>'; // Rosa para mulheres
    } else {
        return '<i class="fas fa-user" style="font-size: 50px; color: #9E9E9E;"></i>'; // Ícone genérico para outros casos
    }
}

let consultas = []; // Variável global para armazenar as consultas
async function buscarConsultas() {
    console.log("Buscando consultas...");
    try {
        const resposta = await fetch("http://localhost:8080/consultas");
        if (!resposta.ok) {
            throw new Error(`HTTP error! Status: ${resposta.status}`);
        }
        consultas = await resposta.json(); // Armazena as consultas na variável global
        console.log(consultas);

        // Atualiza a listagem de consultas
        const consultasContainer = document.getElementById("consultas-container");
        consultasContainer.innerHTML = consultas.map((consulta) => {
            return `
                <div class="consulta">
                    ${obterIconeGenero(consulta.paciente.genero)}
                    <div class="consulta-info">
                        <h3>${consulta.paciente.nome} ${consulta.paciente.sobrenome}</h3>
                        <p>${formatarData(consulta.datahoraConsulta)}</p>
                        <p>Médico: ${consulta.medico.nome} ${consulta.medico.sobrenome} - ${consulta.especificacaoMedica.area}</p>
                        <p>Status: ${consulta.statusConsulta.nomeStatus}</p>
                        <div class="consulta-actions">
                            <i class="fas fa-pen" onclick="alterarConsulta(${consulta.id})" title="Alterar Consulta"></i>
                            <i class="fas fa-trash" onclick="excluirConsulta(${consulta.id})" title="Cancelar Consulta"></i>
                            <i class="fas fa-download" onclick="baixarConsultaExcel(${consulta.id})" title="Baixar Excel da Consulta"></i>
                            ${
                                consulta.statusConsulta.nomeStatus === 'Agendada' 
                                ? `<i class="fas fa-notes-medical" onclick="AnaliseConsultasx(${consulta.id})" title="Bloco De Notas"></i>` 
                                : ''
                            }



                              ${
                                consulta.statusConsulta.nomeStatus === 'Realizada' 
                                ? `<i class="fas fa-eye" onclick="verFeedback(${consulta.id})" title="Visualizar Feedback"></i>`
                                : ''
                            }
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        return consultas;
    } catch (error) {
        console.error('Erro ao buscar consultas:', error);
        return []; // Retorna um array vazio em caso de erro
    }
}


function verFeedback(consultaId) {
    window.location.href = `FeedbackConsulta.html?consultaId=${consultaId}&viewOnly=true`;
}


// Função para buscar dados da API para pacientes e médicos e popular os selects
async function buscarPacientesEMedicos() {
    console.log("Buscando pacientes e médicos...");

    try {
        const respostaPacientes = await fetch("http://localhost:8080/pacientes");
        if (!respostaPacientes.ok) {
            throw new Error(`HTTP error! Status: ${respostaPacientes.status}`);
        }
        const pacientes = await respostaPacientes.json();
        console.log(pacientes);

        const respostaMedicos = await fetch("http://localhost:8080/medicos");
        if (!respostaMedicos.ok) {
            throw new Error(`HTTP error! Status: ${respostaMedicos.status}`);
        }
        const medicos = await respostaMedicos.json();
        console.log(medicos);

        // Adiciona a opção padrão antes de popular as opções reais
        populateSelect('paciente', [{nome: 'Selecione um Paciente', id: ''}, ...pacientes], 'nome', 'id');
        populateSelect('medico', [{nome: 'Selecione um Médico', id: ''}, ...medicos], 'nome', 'id');
    } catch (error) {
        console.error('Erro ao buscar pacientes e médicos:', error);
    }
}

// Função para popular as opções dos selects
function populateSelect(selectId, options, textKey = 'nome', valueKey = 'id') {
    const selectElement = document.getElementById(selectId);
    selectElement.innerHTML = ''; // Limpar opções existentes
    
    // Verifica se a lista de opções é válida e não está vazia
    if (options.length === 0 || options[0] === 'Sem horários disponíveis') {
        const optionElement = document.createElement('option');
        optionElement.textContent = 'Nenhum horário disponível';
        optionElement.value = ''; // Define o valor como vazio
        selectElement.appendChild(optionElement);
        return;
    }

    options.forEach(option => {
        const optionElement = document.createElement('option');
        
        if (typeof option === 'string') {
            // Caso seja uma string, adiciona diretamente
            optionElement.textContent = option;
            optionElement.value = option;
        } else {
            // Caso contrário, utiliza as chaves fornecidas
            optionElement.textContent = option[textKey];
            optionElement.value = option[valueKey];
        }
        
        selectElement.appendChild(optionElement);
    });
}

// Função para obter horários disponíveis para um dia específico, considerando todos os médicos
async function getAvailableHours(dia) {
    console.log("Obtendo horas disponíveis para o dia:", dia);
    const consultas = await buscarConsultas();

    const allHours = [];
    for (let h = 6; h <= 18; h++) {
        const hourStr = h.toString().padStart(2, '0') + ':00';
        allHours.push(hourStr);
    }

    // Lista de horários reservados por qualquer médico
    const bookedHours = consultas
        .filter(consulta => consulta.datahoraConsulta.startsWith(dia))
        .map(consulta => consulta.datahoraConsulta.split('T')[1].substring(0, 5));

    // Horários disponíveis são aqueles que não estão reservados para todos os médicos
    const availableHours = allHours.filter(hora => {
        // Verifica se pelo menos um médico está livre neste horário
        const isHourFullyBooked = consultas.every(consulta => consulta.datahoraConsulta.endsWith(hora));
        return !isHourFullyBooked;
    });

    console.log("Horas disponíveis:", availableHours);
    return availableHours.length > 0 ? availableHours : ['Sem horários disponíveis'];
}

// Função para atualizar as horas disponíveis após a seleção da data
async function updateAvailableHours() {
    const dia = document.getElementById('dia').value;
    if (dia) {
        const availableHours = await getAvailableHours(dia);
        populateSelect('hora', availableHours, null, null);
    }
}

// Função para popular as opções dos selects de maneira eficiente
function populateSelect(selectId, options, textKey = 'nome', valueKey = 'id') {
    const selectElement = document.getElementById(selectId);
    selectElement.innerHTML = ''; // Limpar opções existentes

    options.forEach(option => {
        const optionElement = document.createElement('option');
        if (typeof option === 'string') {
            optionElement.textContent = option;
            optionElement.value = option;
        } else {
            optionElement.textContent = option[textKey];
            optionElement.value = option[valueKey];
        }
        selectElement.appendChild(optionElement);
    });
}

async function updateAvailableDoctors() {
    const dia = document.getElementById('dia').value;
    const hora = document.getElementById('hora').value;

    if (dia && hora) {
        try {
            const consultas = await buscarConsultas();
            const respostaMedicos = await fetch("http://localhost:8080/medicos");
            const medicos = await respostaMedicos.json();

            // Filtra os médicos que têm consultas no horário selecionado
            const bookedDoctors = consultas
                .filter(consulta => consulta.datahoraConsulta.startsWith(`${dia}T${hora}`))
                .map(consulta => consulta.medico.id);

            // Médicos disponíveis são aqueles que não estão na lista de médicos ocupados
            const availableDoctors = medicos.filter(medico => !bookedDoctors.includes(medico.id));
            
            // Popula o select com os médicos disponíveis
            populateSelect('medico', [{ nome: 'Selecione um Médico', id: '' }, ...availableDoctors], 'nome', 'id');
        } catch (error) {
            console.error('Erro ao atualizar médicos disponíveis:', error);
        }
    }
}

async function updateAvailablePatients() {
    const dia = document.getElementById('dia').value;
    const hora = document.getElementById('hora').value;

    if (dia && hora) {
        try {
            const consultas = await buscarConsultas();
            const respostaPacientes = await fetch("http://localhost:8080/pacientes");
            const pacientes = await respostaPacientes.json();

            // Filtra os pacientes que têm consultas no horário selecionado
            const bookedPatients = consultas
                .filter(consulta => consulta.datahoraConsulta.startsWith(`${dia}T${hora}`))
                .map(consulta => consulta.paciente.id);

            // Pacientes disponíveis são aqueles que não estão na lista de pacientes ocupados
            const availablePatients = pacientes.filter(paciente => !bookedPatients.includes(paciente.id));

            // Popula o select com os pacientes disponíveis
            populateSelect('paciente', [{ nome: 'Selecione um Paciente', id: '' }, ...availablePatients], 'nome', 'id');
        } catch (error) {
            console.error('Erro ao atualizar pacientes disponíveis:', error);
        }
    }
}
async function agendarConsulta() {
    const dia = document.getElementById('dia').value;
    const hora = document.getElementById('hora').value;
    const medicoId = document.getElementById('medico').value;
    const pacienteId = document.getElementById('paciente').value;
    const descricao = document.getElementById('descricao').value || "Sem descrição";
    const recorrente = document.getElementById('recorrente').checked; // Verifica se o checkbox está marcado

    try {
        const respostaEspec = await fetch("http://localhost:8080/medicos");
        if (!respostaEspec.ok) {
            throw new Error(`HTTP error! Status: ${respostaEspec.status}`);
        }

        const medicos = await respostaEspec.json();
        const medicoSelecionado = medicos.find(medico => medico.id == medicoId);

        if (!medicoSelecionado) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Médico não encontrado.',
            });
            return;
        }

        const especificacaoMedicaId = medicoSelecionado.especificacaoMedica.id;

        // Função para criar o objeto da consulta
        const criarDadosConsulta = (dataConsulta) => ({
            datahoraConsulta: `${dataConsulta}T${hora}:00`,
            descricao: descricao,
            medico: { id: medicoId },
            especificacaoMedica: { id: especificacaoMedicaId },
            statusConsulta: { id: 1 },
            paciente: { id: pacienteId },
            duracaoConsulta: "01:00:00"
        });

        // Agendar a consulta original
        const dadosConsulta = criarDadosConsulta(dia);
        const respostaCadastro = await fetch("http://localhost:8080/consultas", {
            method: "POST",
            body: JSON.stringify(dadosConsulta),
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Accept": "application/json"
            }
        });

        if (!respostaCadastro.ok) {
            throw new Error('Ocorreu um erro ao cadastrar a consulta.');
        }

        // Se o checkbox de recorrente estiver marcado, agendar as próximas 30 semanas
        if (recorrente) {
            const dataOriginal = new Date(dia);
            
            // Agendar para as próximas 30 semanas (7 dias de diferença entre cada consulta)
            for (let i = 1; i <= 30; i++) {
                const novaData = new Date(dataOriginal);
                novaData.setDate(novaData.getDate() + (i * 7)); // Incrementar 7 dias para cada semana

                const novaDataISO = novaData.toISOString().split('T')[0]; // Formata para 'yyyy-mm-dd'
                const novaConsulta = criarDadosConsulta(novaDataISO);

                // Faz a requisição para cadastrar a nova consulta
                const respostaNovaConsulta = await fetch("http://localhost:8080/consultas", {
                    method: "POST",
                    body: JSON.stringify(novaConsulta),
                    headers: {
                        "Content-type": "application/json; charset=UTF-8",
                        "Accept": "application/json"
                    }
                });

                if (!respostaNovaConsulta.ok) {
                    throw new Error(`Erro ao agendar a consulta para ${novaDataISO}`);
                }
            }
        }

        Swal.fire({
            icon: 'success',
            title: 'Consulta agendada com sucesso!',
            showConfirmButton: false,
            timer: 1500,
        }).then(() => {
            window.location.reload();
        });

    } catch (error) {
        console.error('Erro ao agendar consulta:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: 'Erro ao agendar a consulta.',
        });
    }
}
async function excluirConsulta(idConsulta) {
    console.log("Iniciando exclusão da consulta com ID:", idConsulta);

    try {
        // Recupera todas as consultas
        const respostaConsulta = await fetch(`http://localhost:8080/consultas`, {
            method: 'GET',
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Accept": "application/json"
            }
        });

        if (!respostaConsulta.ok) {
            throw new Error(`Erro HTTP! Status: ${respostaConsulta.status}`);
        }

        const todasConsultas = await respostaConsulta.json();
        console.log("Todas as consultas recebidas:", todasConsultas);

        // Filtra a consulta específica pelo ID
        const consultaExistente = todasConsultas.find(consulta => consulta.id === idConsulta);

        // Verifica se a consulta foi encontrada
        if (!consultaExistente) {
            throw new Error('Consulta inválida ou não encontrada');
        }

        // Cria o objeto de consulta com os dados atualizados
        const consultaAtualizada = {
            datahoraConsulta: consultaExistente.datahoraConsulta,
            descricao: consultaExistente.descricao,
            duracaoConsulta: consultaExistente.duracaoConsulta,
            especificacaoMedica: { id: consultaExistente.especificacaoMedica.id },
            medico: { id: consultaExistente.medico.id },
            paciente: { id: consultaExistente.paciente.id },
            statusConsulta: { id: 3 } // Atualiza o status para "Cancelada" (ID = 3)
        };

        console.log("Dados da consulta para atualizar:", consultaAtualizada);

        Swal.fire({
            title: 'Tem certeza?',
            text: "Você não poderá reverter esta ação!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, cancele!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Envia a requisição PUT para atualizar o status da consulta
                    const resposta = await fetch(`http://localhost:8080/consultas/${idConsulta}`, {
                        method: 'PUT',
                        body: JSON.stringify(consultaAtualizada),
                        headers: {
                            "Content-type": "application/json; charset=UTF-8",
                            "Accept": "application/json"
                        }
                    });

                    if (resposta.ok) {
                        Swal.fire(
                            'Cancelado!',
                            'O status da consulta foi atualizado para "Cancelada".',
                            'success'
                        );
                        await buscarConsultas(); // Atualiza a lista de consultas após a alteração
                    } else {
                        const erro = await resposta.text();
                        Swal.fire('Erro!', `Ocorreu um erro ao cancelar a consulta: ${erro}`, 'error');
                    }
                } catch (error) {
                    console.error('Erro ao cancelar consulta:', error);
                    Swal.fire('Erro!', 'Erro ao cancelar a consulta.', 'error');
                }
            }
        });
    } catch (error) {
        console.error('Erro ao buscar consultas:', error);
        Swal.fire('Erro!', 'Erro ao buscar as consultas.', 'error');
    }
}

async function alterarConsulta(idConsulta) {
    console.log("Iniciando alteração da consulta com ID:", idConsulta);

    try {
        // Buscar todas as consultas
        const respostaConsulta = await fetch(`http://localhost:8080/consultas`, {
            method: 'GET',
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Accept": "application/json"
            }
        });

        if (!respostaConsulta.ok) {
            throw new Error(`Erro HTTP! Status: ${respostaConsulta.status}`);
        }

        const consultas = await respostaConsulta.json();
        console.log("Consultas existentes recebidas:", consultas);

        // Localizar a consulta específica pelo ID
        const consultaExistente = consultas.find(consulta => consulta.id === idConsulta);
        if (!consultaExistente) {
            throw new Error('Consulta não encontrada.');
        }

        // Buscar dados para preencher selects de Médicos, Pacientes e Especializações Médicas
        const [medicos, pacientes, especializacoes] = await Promise.all([
            fetch("http://localhost:8080/medicos").then(res => res.json()),
            fetch("http://localhost:8080/pacientes").then(res => res.json()),
            fetch("http://localhost:8080/especificacoes").then(res => res.json())
        ]);

        // Preencher selects com opções
        const medicoOptions = medicos.map(medico => `<option value="${medico.id}" ${medico.id === consultaExistente.medico.id ? 'selected' : ''}>${medico.nome} ${medico.sobrenome}</option>`).join('');
        const pacienteOptions = pacientes.map(paciente => `<option value="${paciente.id}" ${paciente.id === consultaExistente.paciente.id ? 'selected' : ''}>${paciente.nome} ${paciente.sobrenome}</option>`).join('');
        const especializacaoOptions = especializacoes.map(especializacao => `<option value="${especializacao.id}" ${especializacao.id === consultaExistente.especificacaoMedica.id ? 'selected' : ''}>${especializacao.area}</option>`).join('');

        // Exibir popup de edição com os selects preenchidos
        const { value: consultaAtualizada } = await Swal.fire({
            title: 'Alterar Consulta',
            html:
                `<label for="datahoraConsulta">Data e Hora:</label><br><input type="datetime-local" id="datahoraConsulta" value="${consultaExistente.datahoraConsulta}" class="swal2-input"><br>` +
                `<label for="descricao">Descrição:</label><br><textarea id="descricao" class="swal2-textarea">${consultaExistente.descricao}</textarea><br>` +
                `<label for="duracaoConsulta">Duração:</label><br><input type="time" id="duracaoConsulta" value="${consultaExistente.duracaoConsulta}" class="swal2-input"><br>` +
                `<label for="especificacaoMedica">Especialização Médica:</label><br><select id="especificacaoMedica" class="swal2-select">${especializacaoOptions}</select><br>` +
                `<label for="medico">Médico:</label><br><select id="medico" class="swal2-select">${medicoOptions}</select><br>` +
                `<label for="paciente">Paciente:</label><br><select id="paciente" class="swal2-select">${pacienteOptions}</select><br>` +
                `<label for="statusConsulta">Status:</label><br><select id="statusConsulta" class="swal2-select">
                    <option value="1" ${consultaExistente.statusConsulta.id === 1 ? 'selected' : ''}>Agendada</option>
                    <option value="2" ${consultaExistente.statusConsulta.id === 2 ? 'selected' : ''}>Concluída</option>
                    <option value="3" ${consultaExistente.statusConsulta.id === 3 ? 'selected' : ''}>Cancelada</option>
                </select><br>`,
            focusConfirm: false,
            preConfirm: () => ({
                datahoraConsulta: document.getElementById('datahoraConsulta').value || consultaExistente.datahoraConsulta,
                descricao: document.getElementById('descricao').value || consultaExistente.descricao,
                duracaoConsulta: document.getElementById('duracaoConsulta').value || consultaExistente.duracaoConsulta,
                especificacaoMedica: { id: document.getElementById('especificacaoMedica').value || consultaExistente.especificacaoMedica.id },
                medico: { id: document.getElementById('medico').value || consultaExistente.medico.id },
                paciente: { id: document.getElementById('paciente').value || consultaExistente.paciente.id },
                statusConsulta: { id: parseInt(document.getElementById('statusConsulta').value) || consultaExistente.statusConsulta.id }
            })
        });

        if (consultaAtualizada) {
            console.log("Dados da consulta a serem enviados:", consultaAtualizada); // Adicionado para verificar o objeto de dados

            try {
                // Envia a requisição PUT para atualizar a consulta
                const resposta = await fetch(`http://localhost:8080/consultas/${idConsulta}`, {
                    method: 'PUT',
                    body: JSON.stringify(consultaAtualizada),
                    headers: {
                        "Content-type": "application/json; charset=UTF-8",
                        "Accept": "application/json"
                    }
                });

                if (resposta.ok) {
                    Swal.fire('Alterada!', 'A consulta foi atualizada com sucesso.', 'success');
                    await buscarConsultas(); // Atualiza a lista de consultas após a alteração
                } else {
                    const erro = await resposta.text();
                    Swal.fire('Erro!', `Ocorreu um erro ao alterar a consulta: ${erro}`, 'error');
                }
            } catch (error) {
                console.error('Erro ao alterar consulta:', error);
                Swal.fire('Erro!', 'Erro ao alterar a consulta.', 'error');
            }
        }
    } catch (error) {
        console.error('Erro ao buscar consultas:', error);
        Swal.fire('Erro!', 'Erro ao buscar as consultas.', 'error');
    }
}

// Inicialização da página
(async function initialize() {
    console.log("Iniciando página de agendamentos...");
    await buscarPacientesEMedicos();
    await buscarConsultas();

    // Atualiza as consultas a cada 30 segundos
    setInterval(async () => {
        await buscarConsultas(); // Atualiza a listagem de consultas
    }, 30000); // Intervalo de 30000 milissegundos (30 segundos)
})();

// Eventos de mudança nos selects
document.getElementById('dia').addEventListener('change', updateAvailableHours);
document.getElementById('hora').addEventListener('change', () => {
    updateAvailableDoctors();
    updateAvailablePatients();
});
document.getElementById('medico').addEventListener('change', updateAvailablePatients);

document.getElementById('agendar').addEventListener('click', agendarConsulta);


async function BaixarExcelGeral() {
    try {
        const resposta = await fetch(`http://localhost:8080/consultas/export/csv`, {
            method: 'GET',
            headers: {
                "Accept": "text/csv" 
            }
        });

        if (!resposta.ok) {
            throw new Error(`Erro ao baixar o arquivo: ${resposta.statusText}`);
        }

  
        const blob = await resposta.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'consultas.csv'; 
        document.body.appendChild(a);
        a.click();
        a.remove();

    
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao baixar o arquivo:', error);
    }
}



async function baixarConsultaExcel(consultaId) {
    try {
       
        const consultas = await buscarConsultas();
        const consulta = consultas.find(c => c.id === consultaId);

        if (!consulta) {
            throw new Error("Consulta não encontrada");
        }

 
        const dadosExcel = [{
            Paciente: `${consulta.paciente.nome} ${consulta.paciente.sobrenome}`,
            "Data e Hora": formatarData(consulta.datahoraConsulta),
            Médico: `${consulta.medico.nome} ${consulta.medico.sobrenome}`,
            Especialização: consulta.especificacaoMedica.area,
            Status: consulta.statusConsulta.nomeStatus,
            Descrição: consulta.descricao
        }];

     
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dadosExcel); 
        XLSX.utils.book_append_sheet(wb, ws, "Consulta"); 

        
        XLSX.writeFile(wb, `consulta_${consultaId}.xlsx`);
    } catch (error) {
        console.error("Erro ao baixar consulta em Excel:", error);
    }
}function getConsultasAgendadas() {
    return consultas.filter(consulta => consulta.statusConsulta.nomeStatus === 'Agendada');
}


async function excluirUltimaConsulta() {
    const consultasAgendadas = getConsultasAgendadas(); 

    if (consultasAgendadas.length > 0) {
        const ultimaConsulta = consultasAgendadas[consultasAgendadas.length - 1]; 

   
        Swal.fire({
            title: 'Tem certeza?',
            text: `Deseja excluir a última consulta agendada de ${ultimaConsulta.paciente.nome}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    
                    const resposta = await fetch(`http://localhost:8080/consultas/${ultimaConsulta.id}`, {
                        method: 'DELETE',
                        headers: {
                            "Content-type": "application/json; charset=UTF-8",
                            "Accept": "application/json"
                        }
                    });

                    if (resposta.ok) {
                        
                        consultas = consultas.filter(consulta => consulta.id !== ultimaConsulta.id);

                       
                        Swal.fire({
                            icon: 'success',
                            title: 'Consulta Excluída',
                            html: `<h3>Última consulta agendada excluída com sucesso!</h3>`,
                            confirmButtonText: 'Ok'
                        });

  
                        atualizarListagemConsultas();
                    } else {
                        throw new Error('Erro ao excluir a consulta no backend');
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro na Exclusão',
                        text: `Erro ao excluir a última consulta agendada: ${error.message}`
                    });
                }
            }
        });
    } else {
        Swal.fire({
            icon: 'info',
            title: 'Nenhuma Consulta Agendada',
            text: 'Não há consultas agendadas para excluir.'
        });
    }
}

async function excluirPrimeiraConsulta() {
    const consultasAgendadas = getConsultasAgendadas(); 

    if (consultasAgendadas.length > 0) {
        const primeiraConsulta = consultasAgendadas[0]; 
        
        Swal.fire({
            title: 'Tem certeza?',
            text: `Deseja excluir a primeira consulta agendada de ${primeiraConsulta.paciente.nome}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
               
                    const consultaId = Number(primeiraConsulta.id); 
                    console.log(consultaId)
                    const resposta = await fetch(`http://localhost:8080/consultas/${consultaId}`, {
                        method: 'DELETE',
                        headers: {
                            "Content-type": "application/json; charset=UTF-8",
                            "Accept": "application/json"
                        }
                    });

                    if (resposta.ok) {
                        
                        consultas = consultas.filter(consulta => consulta.id !== primeiraConsulta.id);

                        
                        Swal.fire({
                            icon: 'success',
                            title: 'Consulta Excluída',
                            html: `<h3>Primeira consulta agendada excluída com sucesso!</h3>`,
                            confirmButtonText: 'Ok'
                        });

                        
                        atualizarListagemConsultas();
                    } else {
                        throw new Error('Erro ao excluir a consulta no backend');
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro na Exclusão',
                        text: `Erro ao excluir a primeira consulta agendada: ${error.message}`
                    });
                }
            }
        });
    } else {
        Swal.fire({
            icon: 'info',
            title: 'Nenhuma Consulta Agendada',
            text: 'Não há consultas agendadas para excluir.'
        });
    }
}

function atualizarListagemConsultas() {
    buscarConsultas(); // Atualiza a lista de consultas na tela
} 


function AnaliseConsultasx(consultaId) {
    window.location.href = `FeedbackConsulta.html?consultaId=${consultaId}`;
}
