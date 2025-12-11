// Helper para melhorar a experiência de seleção de data no Safari/MacBook
// Adiciona um seletor de ano customizado quando necessário

(function() {
    'use strict';

    // Detecta se é Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                     /Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);

    function initDatePickerHelper() {
        const dateInputs = document.querySelectorAll('input[type="date"][id="dataNascimento"]');
        
        dateInputs.forEach(input => {
            // Verifica se já tem um helper adicionado
            if (input.dataset.yearHelperAdded) return;
            input.dataset.yearHelperAdded = 'true';
            
            // Encontra o container .input que já existe
            const inputContainer = input.closest('.input');
            if (!inputContainer) return;
            
            // Garante que o container tenha position relative
            const containerStyle = window.getComputedStyle(inputContainer);
            if (containerStyle.position === 'static') {
                inputContainer.style.position = 'relative';
            }
            
            // Adiciona um botão de seletor de ano ao lado do campo
            const yearSelector = document.createElement('button');
            yearSelector.type = 'button';
            yearSelector.innerHTML = '📅';
            yearSelector.className = 'year-selector-btn';
            yearSelector.style.cssText = `
                position: absolute;
                right: 0.75rem;
                top: 50%;
                transform: translateY(-50%);
                background: transparent;
                border: none;
                cursor: pointer;
                font-size: 1.1rem;
                padding: 0.25rem;
                z-index: 10;
                opacity: 0.7;
                transition: opacity 0.2s;
            `;
            yearSelector.title = 'Clique para selecionar o ano diretamente';
            
            yearSelector.addEventListener('mouseenter', function() {
                this.style.opacity = '1';
            });
            
            yearSelector.addEventListener('mouseleave', function() {
                this.style.opacity = '0.7';
            });
            
            inputContainer.appendChild(yearSelector);
            
            // Quando clicar no botão, abre um modal simples para selecionar ano
            yearSelector.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openYearSelector(input);
            });
        });
    }

    function openYearSelector(input) {
        // Cria um overlay modal
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Cria o modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        `;
        
        const currentValue = input.value;
        const currentYear = currentValue ? new Date(currentValue).getFullYear() : new Date().getFullYear();
        const minYear = 1900;
        const maxYear = new Date().getFullYear();
        
        // Título
        const title = document.createElement('h3');
        title.textContent = 'Selecione o Ano';
        title.style.cssText = 'margin: 0 0 1rem 0; text-align: center;';
        modal.appendChild(title);
        
        // Input para digitar o ano diretamente
        const yearInput = document.createElement('input');
        yearInput.type = 'number';
        yearInput.value = currentYear;
        yearInput.min = minYear;
        yearInput.max = maxYear;
        yearInput.style.cssText = `
            width: 100%;
            padding: 0.75rem;
            font-size: 1.2rem;
            border: 2px solid #2196F3;
            border-radius: 0.25rem;
            text-align: center;
            margin-bottom: 1rem;
        `;
        modal.appendChild(yearInput);
        
        // Botões de ação
        const buttonsDiv = document.createElement('div');
        buttonsDiv.style.cssText = 'display: flex; gap: 1rem; justify-content: center;';
        
        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Aplicar';
        applyBtn.style.cssText = `
            padding: 0.75rem 2rem;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 0.25rem;
            cursor: pointer;
            font-size: 1rem;
        `;
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.style.cssText = `
            padding: 0.75rem 2rem;
            background: #ccc;
            color: black;
            border: none;
            border-radius: 0.25rem;
            cursor: pointer;
            font-size: 1rem;
        `;
        
        applyBtn.addEventListener('click', function() {
            const selectedYear = parseInt(yearInput.value);
            if (selectedYear >= minYear && selectedYear <= maxYear) {
                // Se já tem uma data, mantém mês e dia, só muda o ano
                if (currentValue) {
                    const date = new Date(currentValue);
                    date.setFullYear(selectedYear);
                    const newDate = date.toISOString().split('T')[0];
                    input.value = newDate;
                } else {
                    // Se não tem data, define como 1º de janeiro do ano selecionado
                    input.value = selectedYear + '-01-01';
                }
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            document.body.removeChild(overlay);
        });
        
        cancelBtn.addEventListener('click', function() {
            document.body.removeChild(overlay);
        });
        
        // Fecha ao clicar fora
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
        
        // Enter no input aplica
        yearInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyBtn.click();
            }
        });
        
        buttonsDiv.appendChild(applyBtn);
        buttonsDiv.appendChild(cancelBtn);
        modal.appendChild(buttonsDiv);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Foca no input
        yearInput.focus();
        yearInput.select();
    }

    // Inicializa quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDatePickerHelper);
    } else {
        initDatePickerHelper();
    }
})();

