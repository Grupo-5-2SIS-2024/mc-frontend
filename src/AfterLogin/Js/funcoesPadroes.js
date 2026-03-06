document.getElementById('open_btn').addEventListener('click', function () {
    const sidebar = document.getElementById('sidebar');
    const main = document.querySelector('main');

    sidebar.classList.toggle('open-sidebar');
    main.classList.toggle('expanded');
});

const hamburgerMenu = document.getElementById("hamburger-menu");
const menuOverlay = document.getElementById("menu-overlay");

hamburgerMenu.addEventListener("click", () => {
    menuOverlay.classList.toggle("open");
});

// Fechar o menu ao clicar fora
document.addEventListener("click", (e) => {
    if (
        menuOverlay.classList.contains("open") &&
        !menuOverlay.contains(e.target) &&
        !hamburgerMenu.contains(e.target)
    ) {
        menuOverlay.classList.remove("open");
    }
});

// Função para formatar campos com máscara (ex: CEP, CPF, telefone)
function formatar(mascara, documento) {
    const i = documento.value.length;
    const saida = mascara.substring(0, 1);
    const texto = mascara.substring(i);
    
    if (texto.substring(0, 1) !== saida && texto.substring(0, 1) !== '#') {
        documento.value += texto.substring(0, 1);
    }
}
