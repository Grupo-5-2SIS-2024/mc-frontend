// Inputs Especiais
    const inputIcon = document.querySelector(".input__icon");
    const inputIcon2 = document.querySelector(".input__icon2");
    const inputPassword = document.getElementById("password");
    const inputConfirmedPassword = document.getElementById("confirmedPassword");

    const inputFile = document.querySelector("#picture__input");
    const pictureImage = document.querySelector(".picture__image");
    const pictureImageTxt = "Choose an image";
    pictureImage.innerHTML = pictureImageTxt;

    // Toggle password visibility for password field
    if (inputIcon && inputPassword) {
        inputIcon.addEventListener("click", () => {
            inputIcon.classList.toggle("ri-eye-off-line");
            inputIcon.classList.toggle("ri-eye-line");
            inputPassword.type = inputPassword.type === "password" ? "text" : "password";
        });
    }

    // Toggle password visibility for confirmed password field
    if (inputIcon2 && inputConfirmedPassword) {
        inputIcon2.addEventListener("click", () => {
            inputIcon2.classList.toggle("ri-eye-off-line");
            inputIcon2.classList.toggle("ri-eye-line");
            inputConfirmedPassword.type = inputConfirmedPassword.type === "password" ? "text" : "password";
        });
    }

    let selectedImage = null;

    // Handle image file selection and preview
    if (inputFile && pictureImage) {
        inputFile.addEventListener("change", function (e) {
            const file = e.target.files[0];

            if (file) {
                const reader = new FileReader();

                reader.addEventListener("load", function (e) {
                    const img = document.createElement("img");
                    img.src = e.target.result;
                    img.classList.add("picture__img");

                    pictureImage.innerHTML = "";
                    pictureImage.appendChild(img);

                    // Store the selected image
                    selectedImage = e.target.result;
                });

                reader.readAsDataURL(file);
            } else {
                pictureImage.innerHTML = pictureImageTxt;
                selectedImage = null;
            }
        });
    }

    // Função para validar o cadastro do colaborador

    function validarCadastro() {
        const nome = document.getElementById('nome').value.trim();
        const sobrenome = document.getElementById('sobrenome').value.trim();
        const email = document.getElementById('email').value.trim();
        const telefone = document.getElementById('telefone').value.trim();
        const cpf = document.getElementById('cpf').value.trim();
        const especificacao = document.getElementById('especificacao').value.trim();
        const dataNascimento = document.getElementById('dataNascimento').value;
        const carteirinha = document.getElementById('carteirinha').value.trim();
        const password = document.getElementById('password').value;
        const confirmedPassword = document.getElementById('confirmedPassword').value;
        const nivelAcesso = document.getElementById('nivelAcesso').value.trim();

        // Expressões regulares para validações
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const telefoneRegex = /^\d{10,}$/; // Mínimo de 10 dígitos
        const cpfRegex = /^\d{11}$/; // CPF tem 11 dígitos
        const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/; // Senha: mínimo 8 caracteres, pelo menos uma letra maiúscula, uma letra minúscula e um número

        // Validar cada campo
        const errors = [];

        // Função auxiliar para adicionar erro
        const addError = (fieldId, errorId, message) => {
            const field = document.getElementById(fieldId);
            const errorElement = document.getElementById(errorId);
            if (field && errorElement) {
                field.classList.add('error');
                errorElement.textContent = message;
            }
            errors.push(message);
        };

        // Função auxiliar para remover erro
        const removeError = (fieldId, errorId) => {
            const field = document.getElementById(fieldId);
            const errorElement = document.getElementById(errorId);
            if (field && errorElement) {
                field.classList.remove('error');
                errorElement.textContent = "";
            }
        };

        // Validações
        if (!nome) {
            addError('nome', 'error-nome', "Nome é obrigatório.");
        } else {
            removeError('nome', 'error-nome');
        }

        if (!sobrenome) {
            addError('sobrenome', 'error-sobrenome', "Sobrenome é obrigatório.");
        } else {
            removeError('sobrenome', 'error-sobrenome');
        }

        if (!emailRegex.test(email)) {
            addError('email', 'error-email', "E-mail inválido.");
        } else {
            removeError('email', 'error-email');
        }

        if (!telefoneRegex.test(telefone)) {
            addError('telefone', 'error-telefone', "Telefone inválido. Deve conter no mínimo 10 dígitos.");
        } else {
            removeError('telefone', 'error-telefone');
        }

        if (!cpfRegex.test(cpf)) {
            addError('cpf', 'error-cpf', "CPF inválido. Deve conter 11 dígitos.");
        } else {
            removeError('cpf', 'error-cpf');
        }

        if (!especificacao) {
            addError('especificacao', 'error-especificacao', "Especificação é obrigatória.");
        } else {
            removeError('especificacao', 'error-especificacao');
        }

        if (!dataNascimento) {
            addError('dataNascimento', 'error-dataNascimento', "Data de nascimento é obrigatória.");
        } else {
            removeError('dataNascimento', 'error-dataNascimento');
        }

        if (!carteirinha) {
            addError('carteirinha', 'error-carteirinha', "Carteirinha é obrigatória.");
        } else {
            removeError('carteirinha', 'error-carteirinha');
        }

        if (!passwordRegex.test(password)) {
            addError('password', 'error-password', "Senha deve conter no mínimo 8 caracteres, uma letra maiúscula, uma letra minúscula e um número.");
        } else {
            removeError('password', 'error-password');
        }

        if (password !== confirmedPassword) {
            addError('confirmedPassword', 'error-confirmedPassword', "As senhas não coincidem.");
        } else {
            removeError('confirmedPassword', 'error-confirmedPassword');
        }

        if (!nivelAcesso) {
            addError('nivelAcesso', 'error-nivelAcesso', "Nível de acesso é obrigatório.");
        } else {
            removeError('nivelAcesso', 'error-nivelAcesso');
        }

        // Exibir os erros se houverem
        if (errors.length > 0) {
            const errorMessageElement = document.querySelector('.error-message');
            if (errorMessageElement) {
                errorMessageElement.innerHTML = errors.join("<br>");
            }
            return false;
        } else {
            // Limpar mensagens de erro gerais
            const errorMessageElement = document.querySelector('.error-message');
            if (errorMessageElement) {
                errorMessageElement.innerHTML = "";
            }
            return true;
        }
    }

    // Função para buscar os valores do colaborador

    async function buscarValores(id) {
        const nomeInput = document.getElementById("nome");
        const sobrenomeInput = document.getElementById("sobrenome");
        const emailInput = document.getElementById("email");
        const telefoneInput = document.getElementById("telefone");
        const cpfInput = document.getElementById("cpf");
        const dataNascimentoInput = document.getElementById("dataNascimento");
        const especificacaoInput = document.getElementById("especificacao");
        const carteirinhaInput = document.getElementById("carteirinha");
        const senhaInput = document.getElementById("password");
        const nivelAcessoInput = document.getElementById("nivelAcesso");
        const pictureImage = document.querySelector(".picture__image");

      
            const response = await fetch(`http://localhost:8080/medicos/${id}`);
            if (!response.ok) {
                throw new Error(`Erro ao buscar dados: ${response.statusText}`);
            }
            const json = await response.json();

            if (json) {
                // Preencher os campos com os valores recebidos
                if (nomeInput) nomeInput.value = json.nome || '';
                if (sobrenomeInput) sobrenomeInput.value = json.sobrenome || '';
                if (emailInput) emailInput.value = json.email || '';
                if (telefoneInput) telefoneInput.value = json.telefone || '';
                if (cpfInput) cpfInput.value = json.cpf || '';
                if (dataNascimentoInput) dataNascimentoInput.value = json.dataNascimento || '';
                if (carteirinhaInput) carteirinhaInput.value = json.carterinha || '';
                if (senhaInput) senhaInput.value = json.senha || '';
                if (nivelAcessoInput) nivelAcessoInput.value = json.permissao.nome || '';

                // Carregar especificações e definir o valor
                await carregarEspecificacoes();
                if (especificacaoInput && json.especificacaoMedica && json.especificacaoMedica.id) {
                    especificacaoInput.value = json.especificacaoMedica.id;
                }

                // Exibir a imagem
                if (pictureImage) {
                    if (json.foto) {
                        const img = document.createElement("img");
                        img.src = json.foto;
                        img.classList.add("picture__img");
                        pictureImage.innerHTML = "";
                        pictureImage.appendChild(img);
                        selectedImage = json.foto; // Atualizar selectedImage com a foto existente
                    } else {
                        pictureImage.innerHTML = pictureImageTxt;
                        selectedImage = null;
                    }
                }
            }
    }

    // Função assíncrona para carregar especificações

    async function carregarEspecificacoes() {
        try {
            const response = await fetch("http://localhost:8080/especificacoes");
            if (!response.ok) {
                throw new Error(`Erro ao carregar especificações: ${response.statusText}`);
            }
            const especificacoes = await response.json();
            const especificacaoSelect = document.getElementById("especificacao");

            if (especificacaoSelect) {
                // Limpar o campo antes de adicionar as novas opções
                especificacaoSelect.innerHTML = '<option value=""></option>';

                especificacoes.forEach(especificacao => {
                    const option = document.createElement("option");
                    option.value = especificacao.id; // Usar o ID como valor
                    option.textContent = especificacao.area; // Exibir o nome da área no campo
                    especificacaoSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Erro ao carregar especificações:", error);
            alert("Erro ao carregar especificações. Tente novamente mais tarde.");
        }
    }

    // Função para obter o ID da URL

    function getIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    // Função para atualizar o colaborador

    async function atualizarColaborador() {
        const id = getIdFromURL();
        const idColaboradorLogado = sessionStorage.getItem('ID_MEDICO');
    
        if (!id) {
            alert("ID do colaborador não encontrado.");
            return;
        }
    
        if (validarCadastro()) {
            const nomeDigitado = document.getElementById("nome").value.trim();
            const sobrenomeDigitado = document.getElementById("sobrenome").value.trim();
            const emailDigitado = document.getElementById("email").value.trim();
            const telefoneDigitado = document.getElementById("telefone").value.trim();
            const cpfDigitado = document.getElementById("cpf").value.trim();
            const dataNascimentoDigitada = document.getElementById("dataNascimento").value;
            const especificacaoDigitada = document.getElementById("especificacao").value;
            const carteirinhaDigitada = document.getElementById("carteirinha").value.trim();
            const senhaDigitada = document.getElementById("password").value;
            const nivelAcessoEscolhido = document.getElementById("nivelAcesso").value.trim();
    
            const nivelAcessoMap = {
                "Admin": 1,
                "Supervisor": 2,
                "Médico": 3
            };
          
            const nivelAcessoId = nivelAcessoMap[nivelAcessoEscolhido];
          
            if (!nivelAcessoId) {
                alert("Opções inválidas selecionadas.");
                return;
            }
    
            const dadosColaborador = {
                "nome": nomeDigitado,
                "sobrenome": sobrenomeDigitado,
                "email": emailDigitado,
                "telefone": telefoneDigitado,
                "cpf": cpfDigitado,
                "dataNascimento": dataNascimentoDigitada,
                "especificacaoMedica": {
                    "id": especificacaoDigitada
                },
                "carterinha": carteirinhaDigitada,
                "senha": senhaDigitada,
                "permissao": {
                    "id": nivelAcessoId
                },
                "foto": selectedImage
            };
    
            try {
                const respostaAtualizacao = await fetch(`http://localhost:8080/medicos/${id}`, {
                    method: "PUT",
                    body: JSON.stringify(dadosColaborador),
                    headers: { "Content-Type": "application/json; charset=UTF-8" }
                });
    
                if (respostaAtualizacao.ok) {
                    // Apenas armazene a foto no sessionStorage se o colaborador que está sendo atualizado for o mesmo que está logado
                     if (id === idColaboradorLogado) {
                         sessionStorage.setItem('FOTO', selectedImage);
                         const userAvatar = document.getElementById("user_avatar");
                         if (userAvatar) {
                             userAvatar.src = selectedImage;
                         }
                     }
    
                    Swal.fire({
                        icon: 'success',
                        title: 'Atualização realizada com sucesso!',
                        text: 'Redirecionando para a área do colaborador...',
                        showConfirmButton: false,
                        timer: 1500
                    }).then(() => {
                        window.location.href = "listagemColaborador.html";
                    });
                } else {
                    const errorResponse = await respostaAtualizacao.json();
                    const errorMsg = errorResponse.message || "Ocorreu um erro ao atualizar.";
                    alert(errorMsg);
                }
            } catch (error) {
                console.error("Erro ao tentar atualizar:", error);
                alert("Ocorreu um erro ao tentar atualizar: " + error.message);
            }
        }
    }

    window.onload = function () {
        const id = getIdFromURL();
        if (id) {
            buscarValores(id);
        } else {
            console.error('ID do médico não encontrado na URL.');
        }
        carregarEspecificacoes();
    };
