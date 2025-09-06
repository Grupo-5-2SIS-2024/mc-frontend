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
      if (!menuOverlay.contains(e.target) && !hamburgerMenu.contains(e.target)) {
          menuOverlay.classList.remove("open");
      }
  });
  
