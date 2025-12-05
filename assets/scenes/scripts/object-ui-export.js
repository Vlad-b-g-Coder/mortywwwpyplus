// scripts/object-ui-export.js
class ObjectUIExport {
    constructor(objectPlacer, objectManager, objectConfigs) {
        this.objectPlacer = objectPlacer;
        this.objectManager = objectManager;
        this.objectConfigs = objectConfigs;
    }

    createUI() {
        const objectControls = document.createElement('div');
        objectControls.id = 'object-controls';
        objectControls.innerHTML = this.getUIHTML();
        document.body.appendChild(objectControls);
        this.setupUIListeners();
    }

    getUIHTML() {
        return `
            <div>🏗️ РАЗМЕЩЕНИЕ ОБЪЕКТОВ:</div>
            
            <div class="object-types">
                <div class="object-type-btn active" data-type="tree">🌳 Дерево</div>
                <div class="object-type-btn" data-type="rock">🪨 Камень</div>
                <div class="object-type-btn" data-type="house">🏠 Дом</div>
                <div class="object-type-btn" data-type="character">🧍 Персонаж</div>
                <div class="object-type-btn" data-type="portal">🌀 Портал</div>
            </div>

            <div class="slider-container">
                <span class="slider-label">Ширина (клетки): <span class="value" id="objWidthValue">2</span></span>
                <input type="range" id="objWidthSlider" min="1" max="10" step="1" value="2">
            </div>

            <div class="slider-container">
                <span class="slider-label">Глубина (клетки): <span class="value" id="objDepthValue">2</span></span>
                <input type="range" id="objDepthSlider" min="1" max="10" step="1" value="2">
            </div>

            <div class="slider-container">
                <span class="slider-label">Масштаб: <span class="value" id="objScaleValue">1.0</span></span>
                <input type="range" id="objScaleSlider" min="0.1" max="3" step="0.1" value="1.0">
            </div>

            <div class="slider-container">
                <span class="slider-label">Поворот (градусы): <span class="value" id="objRotationValue">0</span></span>
                <input type="range" id="objRotationSlider" min="0" max="360" step="1" value="0">
            </div>

            <div style="margin: 10px 0; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 3px;">
                <div style="font-size: 9px; color: #ccc;">Загрузить свой GLTF:</div>
                <input type="file" id="customModel" accept=".gltf,.glb" style="width: 100%; margin: 5px 0; font-size: 9px;">
                <button class="control-btn" id="use-custom-model" style="width: 100%;">Использовать модель</button>
            </div>

            <button class="control-btn" id="toggle-placement">Режим размещения: ВЫКЛ</button>
            <button class="control-btn" id="clear-objects">Очистить объекты</button>
            <button class="control-btn" id="export-objects">Экспорт объектов</button>
            <button class="control-btn" id="import-objects">Импорт объектов</button>

            <div class="object-list" id="objectList">
                <div style="font-size:10px; color:#ccc; margin-top:10px;">Размещенные объекты:</div>
                <div style="font-size:9px; color:#888; margin:5px 0;">Нет объектов</div>
            </div>

            <div class="export-info">
                ЛКМ - разместить объект<br>
                ПКМ - удалить объект<br>
                Портал: поворот 180° + выше на 1 клетку
            </div>
        `;
    }

    setupUIListeners() {
        this.setupObjectTypeListeners();
        this.setupSliderListeners();
        this.setupButtonListeners();
    }

    setupObjectTypeListeners() {
        document.querySelectorAll('.object-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                this.objectPlacer.selectObjectType(type);

                document.querySelectorAll('.object-type-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            });
        });
    }

    setupSliderListeners() {
        const sliders = [
            { id: 'objWidthSlider', property: 'width', valueId: 'objWidthValue' },
            { id: 'objDepthSlider', property: 'depth', valueId: 'objDepthValue' },
            { id: 'objScaleSlider', property: 'scale', valueId: 'objScaleValue' },
            { id: 'objRotationSlider', property: 'rotation', valueId: 'objRotationValue' }
        ];

        sliders.forEach(slider => {
            document.getElementById(slider.id).addEventListener('input', (e) => {
                if (this.objectPlacer.currentObjectConfig) {
                    const value = slider.property === 'scale' ?
                        parseFloat(e.target.value) : parseInt(e.target.value);

                    this.objectPlacer.currentObjectConfig[slider.property] = value;
                    document.getElementById(slider.valueId).textContent = e.target.value;
                }
            });
        });
    }

    setupButtonListeners() {
        document.getElementById('use-custom-model').addEventListener('click', () => {
            this.loadCustomModel();
        });

        document.getElementById('toggle-placement').addEventListener('click', () => {
            this.objectPlacer.togglePlacementMode();
        });

        document.getElementById('clear-objects').addEventListener('click', () => {
            this.objectManager.clearAllObjects();
            this.updateObjectList();
        });

        document.getElementById('export-objects').addEventListener('click', () => {
            this.exportObjects();
        });

        document.getElementById('import-objects').addEventListener('click', () => {
            this.importObjectsFromFile();
        });
    }

    loadCustomModel() {
        const fileInput = document.getElementById('customModel');
        const file = fileInput.files[0];

        if (!file) {
            alert('Пожалуйста, выберите GLTF файл');
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        const customConfig = this.objectConfigs.createCustomConfig(objectUrl);

        this.objectPlacer.currentObjectConfig = customConfig;
        this.updateSlidersForConfig(customConfig);

        alert('Модель загружена! Теперь можете размещать её на сцене.');
    }

    updateSlidersForConfig(config) {
        document.getElementById('objWidthSlider').value = config.width;
        document.getElementById('objDepthSlider').value = config.depth;
        document.getElementById('objScaleSlider').value = config.scale;
        document.getElementById('objRotationSlider').value = config.rotation;

        document.getElementById('objWidthValue').textContent = config.width;
        document.getElementById('objDepthValue').textContent = config.depth;
        document.getElementById('objScaleValue').textContent = config.scale;
        document.getElementById('objRotationValue').textContent = config.rotation;
    }

    updateObjectList() {
        const objectList = document.getElementById('objectList');
        if (!objectList) return;

        const objectsArray = this.objectManager.getAllObjects();

        let html = '<div style="font-size:10px; color:#ccc; margin-top:10px;">Размещенные объекты:</div>';

        if (objectsArray.length === 0) {
            html += '<div style="font-size:9px; color:#888; margin:5px 0;">Нет объектов</div>';
        } else {
            objectsArray.forEach((obj, index) => {
                const typeLabel = obj.isFallback ? `${obj.type} ⚠️` : obj.type;
                const heightInfo = obj.heightOffset > 0 ? ` +${obj.heightOffset}кл` : '';

                html += `
                    <div style="font-size:9px; margin:2px 0; padding:2px; background:rgba(255,255,255,0.1); border-radius:2px;">
                        ${index + 1}. ${typeLabel} (${obj.cellX},${obj.cellZ}) 
                        [${obj.width}x${obj.depth}] 
                        ${obj.rotation}°${heightInfo}
                    </div>
                `;
            });
        }

        objectList.innerHTML = html;
    }

    exportObjects() {
        const exportData = {
            version: "1.3",
            gridSize: this.objectPlacer.gridSystem.gridSize,
            cellSize: this.objectPlacer.gridSystem.cellSize,
            gridHeight: this.objectPlacer.gridSystem.gridHeight,
            objects: this.objectManager.getAllObjects().map(obj => ({
                type: obj.type,
                cellX: obj.cellX,
                cellZ: obj.cellZ,
                width: obj.width,
                depth: obj.depth,
                height: obj.height,
                scale: obj.scale,
                rotation: obj.rotation,
                color: obj.color,
                file: obj.isCustom ? "custom" : obj.file,
                heightOffset: obj.heightOffset || 0
            }))
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'scene_objects.json';
        link.click();

        console.log('Экспортировано объектов:', exportData.objects.length);
        return exportData;
    }

    importObjectsFromFile() {
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
                    this.importObjects(importData);
                    alert(`Объекты успешно загружены! Загружено: ${importData.objects?.length || 0} объектов`);
                } catch (error) {
                    console.error('Import error:', error);
                    alert('Ошибка загрузки файла: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    async importObjects(importData) {
        this.objectManager.clearAllObjects();

        if (importData.objects && Array.isArray(importData.objects)) {
            for (const objData of importData.objects) {
                let config;

                if (objData.file === "custom") {
                    // Для кастомных объектов создаем базовый конфиг
                    config = this.objectConfigs.createCustomConfig("", objData.type);
                } else {
                    config = this.objectConfigs.getObjectType(this.getTypeFromName(objData.type)) ||
                        this.objectConfigs.createCustomConfig(objData.file, objData.type);
                }

                // Обновляем конфиг импортированными данными
                Object.assign(config, {
                    width: objData.width || 1,
                    depth: objData.depth || 1,
                    height: objData.height || 1,
                    scale: objData.scale || 1.0,
                    rotation: objData.rotation || 0,
                    color: objData.color || 0xffffff,
                    heightOffset: objData.heightOffset || 0
                });

                await this.objectManager.placeObject(config, objData.cellX, objData.cellZ, objData.rotation);
            }

            this.updateObjectList();
        }
    }

    getTypeFromName(name) {
        const types = this.objectConfigs.getAllObjectTypes();
        for (let type in types) {
            if (types[type].name === name) {
                return type;
            }
        }
        return null;
    }
}