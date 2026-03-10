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

                    // Limpa a mensagem de erro, se existir
                    var errorCep = document.getElementById("error-cep");
                    if (errorCep) {
                        errorCep.innerHTML = '';
                    }

                } else {
                    var errorCep = document.getElementById("error-cep");
                    if (errorCep) {
                        errorCep.innerHTML = 'CEP não encontrado.';
                    }
                }
            }
        } catch (erro) {
            console.log("Erro ao buscar o CEP:", erro);
            var errorCep = document.getElementById("error-cep");
            if (errorCep) {
                errorCep.innerHTML = 'Erro ao buscar o CEP.';
            }
        }
    } else {
        var errorCep = document.getElementById("error-cep");
        if (errorCep) {
            errorCep.innerHTML = 'CEP inválido. Deve conter 8 dígitos.';
        }
    }
}
