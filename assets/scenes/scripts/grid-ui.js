// scripts/grid-ui.js
class GridUI {
    constructor(gridSystem) {
        this.gridSystem = gridSystem;
        this.setupEventListeners();
        this.gridSystem.updateUI(); // Обновляем UI после создания
    }

    setupEventListeners() {

        // Слайдеры
        const heightSlider = document.getElementById('heightSlider');
        const sizeSlider = document.getElementById('sizeSlider');
        const brushSlider = document.getElementById('brushSlider');

        if (heightSlider) {
            heightSlider.addEventListener('input', (e) => {
                this.gridSystem.setHeight(parseFloat(e.target.value));
            });
        }

        if (sizeSlider) {
            sizeSlider.addEventListener('input', (e) => {
                this.gridSystem.setSize(parseInt(e.target.value));
            });
        }

        if (brushSlider) {
            brushSlider.addEventListener('input', (e) => {
                this.gridSystem.setBrushSize(parseInt(e.target.value));
            });
        }

        // Кнопки цвета
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = parseInt(btn.getAttribute('data-color'));
                const type = btn.getAttribute('data-type');

                if (type === "erase") {
                    // Для серой кнопки - режим стирания
                    this.gridSystem.currentColor = 0x888888;
                    this.gridSystem.currentType = "erase";
                } else {
                    this.gridSystem.setColor(color, type);
                }

                document.querySelectorAll('.color-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            });
        });

        // Кнопки управления
        const toggleGridBtn = document.getElementById('toggle-grid');
        const paintModeBtn = document.getElementById('paint-mode');
        const clearPaintBtn = document.getElementById('clear-paint');
        const exportGridBtn = document.getElementById('export-grid');
        const importGridBtn = document.getElementById('import-grid');

        if (toggleGridBtn) {
            toggleGridBtn.addEventListener('click', () => {
                const isVisible = this.gridSystem.toggleVisibility();
                toggleGridBtn.textContent = isVisible ? 'Сетка ВКЛ' : 'Сетка ВЫКЛ';
            });
        }

        if (paintModeBtn) {
            paintModeBtn.addEventListener('click', () => {
                const isPaintMode = this.gridSystem.togglePaintMode();
                paintModeBtn.textContent = isPaintMode ? 'Режим: Покраска' : 'Режим: Просмотр';
            });
        }

        if (clearPaintBtn) {
            clearPaintBtn.addEventListener('click', () => {
                this.gridSystem.clearAllPaint();
            });
        }

        if (exportGridBtn) {
            exportGridBtn.addEventListener('click', () => {
                this.gridSystem.exportGrid();
            });
        }

        if (importGridBtn) {
            importGridBtn.addEventListener('click', () => {
                this.importGridFile();
            });
        }

    }

    importGridFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importData = JSON.parse(event.target.result);
                    this.gridSystem.importGrid(importData);
                    alert('Сетка успешно загружена!');
                } catch (error) {
                    console.error('Import error:', error);
                    alert('Ошибка загрузки файла: ' + error.message);
                }
            };
            reader.onerror = () => {
                alert('Ошибка чтения файла');
            };
            reader.readAsText(file);
        };
        input.click();
    }
}