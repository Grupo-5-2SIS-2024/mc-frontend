async function buscarCep() {
    var cepInput = document.getElementById("cep"); // Acessa o campo do CEP pelo ID
    var cep = cepInput.value.replace(/\D/g, ''); // Remove qualquer caractere não numérico

    // Verifica se o CEP tem 8 dígitos
    if (cep.length === 8) {
        var url = `https://viacep.com.br/ws/${cep}/json/`;

        try {
            var resposta = await fetch(url);
            if (resposta.ok) {
                var respostaJson = await resposta.json();

                // Verifica se o retorno da API não contém erro
                if (!respostaJson.erro) {
                    console.log('DADOS RECEBIDOS', respostaJson);

                    // Preenche os campos com os dados retornados
                    document.getElementById("rua").value = respostaJson.logradouro || '';
                    document.getElementById("bairro").value = respostaJson.bairro || '';
                }
            }
        } catch (erro) {
            console.log("Erro ao buscar o CEP:", erro);
        }
    }
}
