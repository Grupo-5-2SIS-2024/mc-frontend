async function buscarHoje() {
    console.log("passei por aqui");
    var idUser = 1

    try {
    const resposta = await fetch(`http://localhost:8080/consultas/listarConsultasMedicoID/${idUser}`);
        if (!resposta.ok) {
            throw new Error(`HTTP error! Status: ${resposta.status}`);
        }
        const respostaDados = await resposta.json();
console.log(respostaDados);

const cards = document.getElementById("listaAgendaH");
cards.innerHTML = respostaDados.body.map((item) => {
    return ` 
            <div class="listaAgendaH">
                <span class="horarioH">${formatarData(item.datahoraConsulta)}</span>
                <span>-</span>
                <span class="pacienteH">${item.paciente.nome} ${item.paciente.sobrenome}</span>
            </div>`;
        }).join('');
    } catch (error) {
        console.error('Failed to fetch:', error);
    }
}
buscarHoje()

async function buscarSemana() {
    console.log("passei por aqui");
    var idUser = 1

    try {
    const resposta = await fetch(`http://localhost:8080/consultas/listarConsultasMedicoID/${idUser}`);
        if (!resposta.ok) {
            throw new Error(`HTTP error! Status: ${resposta.status}`);
        }
        const respostaDados = await resposta.json();
console.log(respostaDados);

const cards = document.getElementById("listaAgendaS");
cards.innerHTML = respostaDados.body.map((item) => {
    return ` 
            <div class="listaAgendaS">
                <span class="horarioS">${formatarData(item.datahoraConsulta)}</span>
                <span>-</span>
                <span class="pacienteS">${item.paciente.nome} ${item.paciente.sobrenome}</span>
            </div>`;
        }).join('');
    } catch (error) {
        console.error('Failed to fetch:', error);
    }
}
buscarSemana()

function formatarData(dataISO){
    const data = new Date(dataISO)
    const dia = String(data.getDate()).padStart(2,'0');
    const mes =String(data.getMonth() + 1). padStart(2,'0');
    const ano = data.getFullYear();
    
    const  horas = String(data.getHours()).padStart(2,'0')
    const minutos = String(data.getMinutes()).padStart(2,'0')
    const segundos = String(data.getSeconds()).padStart(2,'0')
    
    return `${horas}:${minutos}`
    
    
    }








// async function buscar() {
//     console.log("passei por aqui");
//     var idUser = 1

//     try {
//     const resposta = await fetch(`http://localhost:8080/consultas/listarConsultasMedicoID/${idUser}`);
//         if (!resposta.ok) {
//             throw new Error(`HTTP error! Status: ${resposta.status}`);
//         }
//         const respostaDados = await resposta.json();
// console.log(respostaDados);

// const cards = document.getElementById("listaAgendaS");
// cards.innerHTML = respostaDados.body.map((item) => {
//     return ` 
//             <div class="listaAgendaH">
//                 <span class="horarioH">${item.datahoraConsulta}</span>
//                 <span class="pacienteH">${item.paciente.nome} ${item.paciente.sobrenome}</span>
//             </div>`;
//         }).join('');
//     } catch (error) {
//         console.error('Failed to fetch:', error);
//     }
// }
// buscar()