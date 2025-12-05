// scripts/object-manager.js
class ObjectManager {
    constructor(scene, gridSystem) {
        this.scene = scene;
        this.gridSystem = gridSystem;
        this.loader = new THREE.GLTFLoader();
        this.objects = new Map();
        this.behaviors = new ObjectBehaviors(scene, gridSystem);
        this.clock = new THREE.Clock(); // ← И ЭТУ ДЛЯ АНИМАЦИИ
    }

// В object-manager.js
    async placeObject(config, cellX, cellZ, customRotation = null) {

        if (!this.isAreaFree(cellX, cellZ, config.width, config.depth)) {
            throw new Error('Область занята другим объектом!');
        }

        const worldPos = this.gridSystem.getWorldPosFromCell(cellX, cellZ);
        const objectId = `obj_${Date.now()}`;

        try {
            const gltf = await this.loadModel(config.file);
            const model = gltf.scene;

            // НАСТРОЙКА МОДЕЛИ MORTY
            model.scale.set(config.scale, config.scale, config.scale);

            // Позиционируем
            const heightOffset = config.heightOffset || 0;
            const finalHeight = this.gridSystem.gridHeight + (heightOffset * this.gridSystem.cellSize);

            model.position.set(
                worldPos.x,
                finalHeight,
                worldPos.z
            );

            // Поворот
            const rotationDegrees = customRotation !== null ? customRotation : config.rotation;
            model.rotation.y = rotationDegrees * Math.PI / 180;

            const objectData = {
                id: objectId,
                type: config.name,
                cellX: cellX,
                cellZ: cellZ,
                width: config.width,
                depth: config.depth,
                height: config.height,
                scale: config.scale,
                rotation: rotationDegrees,
                color: config.color,
                file: config.file,
                heightOffset: heightOffset,
                model: model,
                isCustom: config.isCustom || false,
                config: config
            };

            this.objects.set(objectId, objectData);
            this.scene.add(model);

            // ЗАГРУЖАЕМ ПЕРВУЮ ТЕКСТУРУ АНИМАЦИИ
            setTimeout(() => {
                if (this.behaviors && this.behaviors.loadCharacterTexture) {
                    this.behaviors.loadCharacterTexture(objectData);
                }
            }, 500);

            console.log('🎉 Персонаж Morty размещен успешно!');
            return objectData;

        } catch (error) {
            console.error('💥 Ошибка при размещении Morty:', error);
            console.log('🔄 Создаем улучшенную 3D модель...');
            return this.createQualityCharacter(config, cellX, cellZ, objectId, customRotation);
        }
    }



    createCharacterModel(config, cellX, cellZ, objectId, customRotation = null) {
        const worldPos = this.gridSystem.getWorldPosFromCell(cellX, cellZ);

        // СОЗДАЕМ КАЧЕСТВЕННОГО 3D ПЕРСОНАЖА
        const group = new THREE.Group();

        // ОСНОВНОЕ ТЕЛО - плоскость для текстуры (всегда смотрит на камеру)
        const bodyGeometry = new THREE.PlaneGeometry(0.8, 1.6);
        const bodyMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.8; // Центрируем по высоте

        // ТЕНЬ ПОД НОГАМИ
        const shadowGeometry = new THREE.CircleGeometry(0.5, 8);
        const shadowMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.4
        });
        const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
        shadow.rotation.x = -Math.PI / 2; // Лежит на земле
        shadow.position.y = 0.01; // Чуть выше земли

        // ОБВОДКА ДЛЯ ЛУЧШЕЙ ВИДИМОСТИ
        const outlineGeometry = new THREE.PlaneGeometry(0.82, 1.62);
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
        outline.position.y = 0.8;

        group.add(outline);
        group.add(body);
        group.add(shadow);

        // ПОЗИЦИОНИРУЕМ
        const heightOffset = config.heightOffset || 0;
        const finalHeight = this.gridSystem.gridHeight + (heightOffset * this.gridSystem.cellSize);

        group.position.set(
            worldPos.x,
            finalHeight,
            worldPos.z
        );

        // Начальный поворот
        group.rotation.y = (customRotation !== null ? customRotation : config.rotation) * Math.PI / 180;

        this.scene.add(group);

        const objectData = {
            id: objectId,
            type: config.name,
            cellX: cellX,
            cellZ: cellZ,
            width: config.width,
            depth: config.depth,
            height: config.height,
            scale: config.scale,
            rotation: customRotation !== null ? customRotation : config.rotation,
            color: config.color,
            file: config.file,
            heightOffset: heightOffset,
            model: group,
            body: body, // Для смены текстур
            shadow: shadow,
            outline: outline,
            config: config
        };

        this.objects.set(objectId, objectData);

        // СРАЗУ ЗАГРУЖАЕМ ПЕРВУЮ ТЕКСТУРУ
        setTimeout(() => {
            if (this.behaviors && this.behaviors.loadCharacterTexture) {
                this.behaviors.loadCharacterTexture(objectData);
            }
        }, 100);

        console.log('✅ Создан качественный 3D персонаж с анимацией');
        return objectData;
    }


    async loadModel(url) {
        console.log('🔄 Пытаюсь загрузить модель по пути:', url);

        return new Promise((resolve, reject) => {
            this.loader.load(
                url,
                (gltf) => {
                    console.log('✅ Модель успешно загружена:', url);
                    console.log('📦 Содержимое модели:', gltf);
                    resolve(gltf);
                },
                (progress) => {
                    console.log('📥 Прогресс загрузки:', progress);
                },
                (error) => {
                    console.error('❌ Ошибка загрузки модели:', url);
                    console.error('💥 Детали ошибки:', error);
                    reject(error);
                }
            );
        });
    }

    setupModel(model, config, worldPos, customRotation = null) {
        // Высота размещения с учетом смещения
        const heightOffset = config.heightOffset || 0;
        const finalHeight = this.gridSystem.gridHeight + (heightOffset * this.gridSystem.cellSize);

        model.position.set(
            worldPos.x,
            finalHeight,
            worldPos.z
        );

        model.scale.set(config.scale, config.scale, config.scale);

        const rotationDegrees = customRotation !== null ? customRotation : config.rotation;
        model.rotation.y = rotationDegrees * Math.PI / 180;
    }

    createFallbackObject(config, cellX, cellZ, objectId, customRotation = null) {
        const worldPos = this.gridSystem.getWorldPosFromCell(cellX, cellZ);

        const geometry = new THREE.BoxGeometry(
            config.width * this.gridSystem.cellSize * 0.8,
            config.height,
            config.depth * this.gridSystem.cellSize * 0.8
        );

        const material = new THREE.MeshPhongMaterial({
            color: config.color,
            transparent: true,
            opacity: 0.7
        });

        const mesh = new THREE.Mesh(geometry, material);

        const heightOffset = config.heightOffset || 0;
        const finalHeight = this.gridSystem.gridHeight + (heightOffset * this.gridSystem.cellSize);

        mesh.position.set(
            worldPos.x,
            finalHeight + config.height / 2,
            worldPos.z
        );

        const rotationDegrees = customRotation !== null ? customRotation : config.rotation;
        mesh.rotation.y = rotationDegrees * Math.PI / 180;

        this.scene.add(mesh);

        const objectData = {
            id: objectId,
            type: config.name + " (заглушка)",
            cellX: cellX,
            cellZ: cellZ,
            width: config.width,
            depth: config.depth,
            height: config.height,
            scale: config.scale,
            rotation: rotationDegrees,
            color: config.color,
            file: config.file,
            heightOffset: heightOffset,
            model: mesh,
            isFallback: true,
            isCustom: config.isCustom || false
        };

        this.objects.set(objectId, objectData);
        return objectData;
    }

    removeObjectAt(cellX, cellZ) {
        for (let [id, obj] of this.objects.entries()) {
            if (cellX >= obj.cellX && cellX < obj.cellX + obj.width &&
                cellZ >= obj.cellZ && cellZ < obj.cellZ + obj.depth) {

                this.scene.remove(obj.model);

                if (obj.isCustom && obj.file.startsWith('blob:')) {
                    URL.revokeObjectURL(obj.file);
                }

                this.objects.delete(id);
                return obj;
            }
        }
        return null;
    }

    removeObjectById(objectId) {
        const obj = this.objects.get(objectId);
        if (obj) {
            this.scene.remove(obj.model);
            if (obj.isCustom && obj.file.startsWith('blob:')) {
                URL.revokeObjectURL(obj.file);
            }
            this.objects.delete(objectId);
            return obj;
        }
        return null;
    }

    clearAllObjects() {
        for (let obj of this.objects.values()) {
            this.scene.remove(obj.model);
            if (obj.isCustom && obj.file.startsWith('blob:')) {
                URL.revokeObjectURL(obj.file);
            }
        }
        this.objects.clear();
    }

    isAreaFree(startX, startZ, width, depth) {
        for (let x = startX; x < startX + width; x++) {
            for (let z = startZ; z < startZ + depth; z++) {
                if (x < 0 || x >= this.gridSystem.gridSize || z < 0 || z >= this.gridSystem.gridSize) {
                    return false;
                }

                for (let obj of this.objects.values()) {
                    if (x >= obj.cellX && x < obj.cellX + obj.width &&
                        z >= obj.cellZ && z < obj.cellZ + obj.depth) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    getObjectAt(cellX, cellZ) {
        for (let obj of this.objects.values()) {
            if (cellX >= obj.cellX && cellX < obj.cellX + obj.width &&
                cellZ >= obj.cellZ && cellZ < obj.cellZ + obj.depth) {
                return obj;
            }
        }
        return null;
    }

    getAllObjects() {
        return Array.from(this.objects.values());
    }

    getObjectsCount() {
        return this.objects.size;
    }

    update() {
        const deltaTime = this.clock.getDelta();
        this.behaviors.updateObjects(this.objects.values(), deltaTime);
    }
}