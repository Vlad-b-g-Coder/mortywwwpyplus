// scripts/grid-system.js
class GridSystem {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        this.grid = null;
        this.gridVisible = true;
        this.gridHeight = 0.1; // Установлена высота 0.1 по умолчанию
        this.gridSize = 20;
        this.cellSize = 1.0;
        this.opacity = 0.3;

        // Система покраски
        this.paintMode = true;
        this.currentColor = 0x00ff00;
        this.currentType = "walkable";
        this.brushSize = 1;
        this.paintedCells = new Map();
        this.cellHighlights = new Map();

        this.colors = {
            "walkable": 0x00ff00,
            "blocked": 0xff0000,
            "water": 0x0000ff,
            "danger": 0xffff00,
            "special": 0xff00ff
        };

        this.init();
    }
    getCell(x, z) {
        const cellKey = `${x},${z}`;
        const paintedCell = this.paintedCells.get(cellKey);

        if (paintedCell) {
            return {
                isGreen: paintedCell.type === "walkable",
                isRed: paintedCell.type === "blocked",
                isBlue: paintedCell.type === "water",
                isYellow: paintedCell.type === "danger",
                isPurple: paintedCell.type === "special",
                type: paintedCell.type,
                color: paintedCell.color,
                x: paintedCell.x,
                z: paintedCell.z
            };
        }

        // Если клетка не покрашена - считаем ее белой (непроходимой)
        return {
            isGreen: false,
            isRed: false,
            isBlue: false,
            isYellow: false,
            isPurple: false,
            type: "empty",
            color: 0x888888,
            x: x,
            z: z
        };
    }

    // ⭐ МЕТОД ДЛЯ ПРОВЕРКИ ДОСТУПНОСТИ КЛЕТКИ
    isCellWalkable(x, z) {
        const cell = this.getCell(x, z);
        return cell.isGreen; // Только зеленые клетки проходимы
    }

    // ⭐ МЕТОД ДЛЯ ПОЛУЧЕНИЯ ЦВЕТА КЛЕТКИ (для отладки)
    getCellColorInfo(x, z) {
        const cell = this.getCell(x, z);
        return {
            type: cell.type,
            isGreen: cell.isGreen,
            isWalkable: cell.isGreen
        };
    }
    init() {
        this.createGrid();
        this.setupRaycaster();
        this.updateUI();
    }

    createGrid() {
        if (this.grid) this.scene.remove(this.grid);

        const gridHelper = new THREE.GridHelper(this.gridSize, this.gridSize, 0x444444, 0x444444);
        gridHelper.position.y = this.gridHeight;
        gridHelper.material.opacity = this.opacity;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
        this.grid = gridHelper;
    }

    setupRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.renderer.domElement.addEventListener('mousedown', (event) => {
            if (!this.paintMode) return;

            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);

            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.gridHeight);
            const intersectionPoint = new THREE.Vector3();
            const intersects = this.raycaster.ray.intersectPlane(plane, intersectionPoint);

            if (intersects) {
                const cell = this.getCellFromWorldPos(intersectionPoint.x, intersectionPoint.z);

                if (event.button === 0) {
                    this.paintCells(cell.x, cell.z, this.currentColor, this.currentType);
                } else if (event.button === 2) {
                    this.eraseCells(cell.x, cell.z);
                }
            }
        });

        this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    paintCells(centerX, centerZ, color, type) {
        const halfBrush = Math.floor(this.brushSize / 2);

        for (let x = centerX - halfBrush; x <= centerX + halfBrush; x++) {
            for (let z = centerZ - halfBrush; z <= centerZ + halfBrush; z++) {
                if (x >= 0 && x < this.gridSize && z >= 0 && z < this.gridSize) {
                    this.paintCell(x, z, color, type);
                }
            }
        }
    }

    eraseCells(centerX, centerZ) {
        const halfBrush = Math.floor(this.brushSize / 2);

        for (let x = centerX - halfBrush; x <= centerX + halfBrush; x++) {
            for (let z = centerZ - halfBrush; z <= centerZ + halfBrush; z++) {
                if (x >= 0 && x < this.gridSize && z >= 0 && z < this.gridSize) {
                    this.eraseCell(x, z);
                }
            }
        }
    }

    paintCell(x, z, color, type) {
        const cellKey = `${x},${z}`;

        if (this.cellHighlights.has(cellKey)) {
            this.scene.remove(this.cellHighlights.get(cellKey));
            this.cellHighlights.delete(cellKey);
        }

        const worldPos = this.getWorldPosFromCell(x, z);
        const geometry = new THREE.PlaneGeometry(0.9, 0.9);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const highlight = new THREE.Mesh(geometry, material);
        highlight.rotation.x = -Math.PI / 2;
        highlight.position.set(worldPos.x, this.gridHeight + 0.01, worldPos.z);
        this.scene.add(highlight);

        this.paintedCells.set(cellKey, { x, z, color, type, worldX: worldPos.x, worldZ: worldPos.z });
        this.cellHighlights.set(cellKey, highlight);
    }

    eraseCell(x, z) {
        const cellKey = `${x},${z}`;

        if (this.cellHighlights.has(cellKey)) {
            this.scene.remove(this.cellHighlights.get(cellKey));
            this.cellHighlights.delete(cellKey);
        }

        this.paintedCells.delete(cellKey);
    }

    clearAllPaint() {
        for (let highlight of this.cellHighlights.values()) {
            this.scene.remove(highlight);
        }
        this.paintedCells.clear();
        this.cellHighlights.clear();
    }

    exportGrid() {
        const exportData = {
            gridSize: this.gridSize,
            cellSize: this.cellSize,
            gridHeight: this.gridHeight,
            cells: Array.from(this.paintedCells.values())
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'navigation_grid.json';
        link.click();

        return exportData;
    }

    importGrid(importData) {
        this.clearAllPaint();

        if (importData.gridSize) {
            this.gridSize = importData.gridSize;
            this.createGrid();
        }

        if (importData.gridHeight) {
            this.gridHeight = importData.gridHeight;
            if (this.grid) this.grid.position.y = this.gridHeight;
        }

        if (importData.cells) {
            importData.cells.forEach(cell => {
                this.paintCell(cell.x, cell.z, cell.color, cell.type);
            });
        }

        this.updateUI();
    }

    getCellFromWorldPos(x, z) {
        const gridX = Math.floor((x / this.cellSize) + this.gridSize/2);
        const gridZ = Math.floor((z / this.cellSize) + this.gridSize/2);
        return { x: gridX, z: gridZ };
    }

    getWorldPosFromCell(cellX, cellZ) {
        const worldX = (cellX - this.gridSize/2) * this.cellSize + this.cellSize/2;
        const worldZ = (cellZ - this.gridSize/2) * this.cellSize + this.cellSize/2;
        return { x: worldX, z: worldZ };
    }

    // Публичные методы для управления
    setHeight(height) {
        this.gridHeight = height;
        if (this.grid) this.grid.position.y = this.gridHeight;

        // Обновляем позиции всех раскрашенных ячеек
        for (let [cellKey, cellData] of this.paintedCells) {
            if (this.cellHighlights.has(cellKey)) {
                const highlight = this.cellHighlights.get(cellKey);
                highlight.position.y = this.gridHeight + 0.01;
            }
        }

        this.updateUI();
    }

    setSize(size) {
        this.gridSize = size;
        this.createGrid();
        this.updateUI();
    }

    setOpacity(opacity) {
        this.opacity = opacity;
        if (this.grid && this.grid.material) {
            this.grid.material.opacity = this.opacity;
        }
    }

    setColor(color, type) {
        this.currentColor = color;
        this.currentType = type;
    }

    setBrushSize(size) {
        this.brushSize = size;
        this.updateUI();
    }

    toggleVisibility() {
        this.gridVisible = !this.gridVisible;
        if (this.grid) this.grid.visible = this.gridVisible;
        return this.gridVisible;
    }

    togglePaintMode() {
        this.paintMode = !this.paintMode;
        return this.paintMode;
    }

    getGridInfo() {
        return {
            height: this.gridHeight,
            size: this.gridSize,
            opacity: this.opacity,
            brushSize: this.brushSize,
            paintedCells: this.paintedCells.size,
            paintMode: this.paintMode,
            visible: this.gridVisible
        };
    }

    updateUI() {
        // Обновляем UI элементы
        if (document.getElementById('heightValue')) {
            document.getElementById('heightValue').textContent = this.gridHeight.toFixed(1);
        }
        if (document.getElementById('sizeValue')) {
            document.getElementById('sizeValue').textContent = this.gridSize;
        }
        if (document.getElementById('brushSize')) {
            document.getElementById('brushSize').textContent = `${this.brushSize}x${this.brushSize}`;
        }
        if (document.getElementById('gridStatus')) {
            document.getElementById('gridStatus').textContent = this.gridVisible ? 'Активна' : 'Скрыта';
        }
        if (document.getElementById('paintMode')) {
            document.getElementById('paintMode').textContent = this.paintMode ? 'Покраска' : 'Просмотр';
        }
    }

    destroy() {
        if (this.grid) {
            this.scene.remove(this.grid);
        }
        this.clearAllPaint();
    }
}