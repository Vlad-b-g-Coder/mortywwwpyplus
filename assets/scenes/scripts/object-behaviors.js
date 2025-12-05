class ObjectBehaviors {
    constructor(scene, gridSystem) {
        this.scene = scene;
        this.gridSystem = gridSystem;
        this.textureLoader = new THREE.TextureLoader();
        this.gltfLoader = new THREE.GLTFLoader();

        // ⭐ СОЗДАЕМ ОТДЕЛЬНЫЙ ЭКЗЕМПЛЯР ДЛЯ ХОДЬБЫ
        this.characterWalk = new CharacterWalk(gridSystem);

        this.behaviors = {
            'portal': this.portalBehavior.bind(this),
            'character': this.characterBehavior.bind(this),
            'default': this.defaultBehavior.bind(this)
        };

        // Кэш для загруженных текстур
        this.textureCache = new Map();
    }

    // ------------------- ПОВЕДЕНИЕ ПЕРСОНАЖА -------------------
    characterBehavior(object, deltaTime, config = {}) {
        if (!object.characterState) {
            this.initializeCharacterState(object, config);
        }

        if (!object.model) {
            this.initializeCharacter(object, config);
            return;
        }

        // ⭐ ИСПОЛЬЗУЕМ ОТДЕЛЬНЫЙ КЛАСС ДЛЯ ХОДЬБЫ
        this.characterWalk.updateCharacter(object, deltaTime);

        // ⭐ ОБНОВЛЕНИЕ АНИМАЦИИ (остается здесь)
        this.updateCharacterAnimation(object, deltaTime);
    }

    // ⭐ УПРОЩЕННАЯ ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ
    initializeCharacterState(object, config) {
        object.characterState = {
            isMoving: false,
            currentDirection: object.config?.currentDirection || "down",
            currentFrame: object.config?.currentFrame || 0,
            frameDuration: object.config?.frameDuration || 200,
            lastFrameTime: Date.now(),
            moveCooldown: 0,
            targetCell: null,
            moveProgress: 0,
            moveSpeed: config.speed || 3.0,
            cellX: object.cellX || 0,
            cellZ: object.cellZ || 0,
            routeState: {
                onevecIndex: 0,
                allvecIndex: 0,
                isExecutingOnevec: true,
                waitingForInput: false
            }
        };
    }

    // ------------------- ОСНОВНЫЕ МЕТОДЫ -------------------
    initializeCharacter(object, config) {
        console.log('🎮 Инициализация персонажа Morty');

        if (object.file && object.file.endsWith('.gltf')) {
            this.loadGLTFCharacter(object);
        } else {
            this.createSpriteCharacter(object, config);
        }
    }

    // ⭐ СПЕЦИАЛЬНЫЙ МЕТОД ДЛЯ GLTF MORTY
    loadGLTFCharacter(object) {
        this.gltfLoader.load(object.file, (gltf) => {
            object.model = gltf.scene;

            console.log('🔍 GLTF структура:', {
                children: object.model.children.length,
                materials: this.getMaterialsCount(object.model)
            });

            // ⭐ ПОВОРОТ НА 180 ГРАДУСОВ
            object.model.rotation.y = Math.PI;

            object.model.scale.set(
                object.scale || 1.0,
                object.scale || 1.0,
                object.scale || 1.0
            );

            // ⭐ ПОДЪЕМ НАД СЕТКОЙ
            const worldPos = this.gridSystem.getWorldPosFromCell(object.cellX, object.cellZ);
            const heightOffset = object.heightOffset || 1.0;

            object.model.position.set(
                worldPos.x,
                this.gridSystem.gridHeight + heightOffset,
                worldPos.z
            );

            this.scene.add(object.model);
            console.log('✅ GLTF Morty загружен');

            // ⭐ ПРЕДВАРИТЕЛЬНАЯ ЗАГРУЗКА ВСЕХ ТЕКСТУР
            this.preloadAllTextures(object, () => {
                console.log('✅ Все текстуры предзагружены');
                this.loadCharacterTexture(object);
            });

        }, undefined, (error) => {
            console.error('❌ Ошибка загрузки GLTF:', error);
            this.createSpriteCharacter(object, {});
        });
    }

    createSpriteCharacter(object, config) {
        const geometry = new THREE.PlaneGeometry(1.0, 2.0);
        const material = new THREE.MeshBasicMaterial({
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide
        });

        object.model = new THREE.Mesh(geometry, material);

        // ⭐ ПОДЪЕМ НАД СЕТКОЙ
        const worldPos = this.gridSystem.getWorldPosFromCell(object.cellX, object.cellZ);
        const heightOffset = object.heightOffset || 1.0;

        object.model.position.set(
            worldPos.x,
            this.gridSystem.gridHeight + heightOffset,
            worldPos.z
        );

        // ⭐ ПОВОРОТ НА 180 ГРАДУСОВ
        object.model.rotation.y = Math.PI;

        this.scene.add(object.model);
        console.log('✅ Спрайтовый персонаж создан над сеткой');

        // Загружаем первую текстуру
        this.loadCharacterTexture(object);
    }

    // ⭐ ПРЕДВАРИТЕЛЬНАЯ ЗАГРУЗКА ВСЕХ ТЕКСТУР
    preloadAllTextures(object, callback) {
        const totalFrames = 16; // 4 направления × 4 кадра
        let loadedCount = 0;

        const checkComplete = () => {
            loadedCount++;
            if (loadedCount === totalFrames) {
                console.log('🎉 Все текстуры загружены в кэш');
                callback();
            }
        };

        // Загружаем все текстуры всех направлений
        Object.keys(object.config.spriteFrames).forEach(direction => {
            object.config.spriteFrames[direction].forEach((texturePath, frameIndex) => {
                const cacheKey = `${direction}_${frameIndex}`;

                if (this.textureCache.has(cacheKey)) {
                    checkComplete();
                    return;
                }

                this.textureLoader.load(texturePath, (texture) => {
                    // ⭐ ВАЖНЫЕ НАСТРОЙКИ ДЛЯ GLTF
                    texture.flipY = false;
                    texture.encoding = THREE.sRGBEncoding;
                    texture.wrapS = THREE.ClampToEdgeWrapping;
                    texture.wrapT = THREE.ClampToEdgeWrapping;

                    this.textureCache.set(cacheKey, texture);
                    console.log(`✅ Текстура закэширована: ${cacheKey}`);
                    checkComplete();
                }, undefined, (error) => {
                    console.error(`❌ Ошибка загрузки текстуры ${texturePath}:`, error);
                    checkComplete();
                });
            });
        });
    }

    // ⭐ ОБНОВЛЕННЫЙ МЕТОД ЗАГРУЗКИ ТЕКСТУРЫ
    loadCharacterTexture(object) {
        if (!object.config || !object.model || !object.characterState) return;

        const state = object.characterState;
        const renderDirection = state.renderDirection || state.currentDirection;

        if (!object.config.spriteFrames || !object.config.spriteFrames[renderDirection]) return;

        const directionFrames = object.config.spriteFrames[renderDirection];
        const texturePath = directionFrames[state.currentFrame];
        const cacheKey = `${renderDirection}_${state.currentFrame}`;

        let texture;
        if (this.textureCache.has(cacheKey)) {
            texture = this.textureCache.get(cacheKey);
            this.applyTexture(object, texture);
        } else {
            this.textureLoader.load(texturePath, (loadedTexture) => {
                loadedTexture.flipY = false;
                loadedTexture.encoding = THREE.sRGBEncoding;
                this.textureCache.set(cacheKey, loadedTexture);
                this.applyTexture(object, loadedTexture);
            });
        }
    }

    // ⭐ ПРИМЕНЕНИЕ ТЕКСТУРЫ
    applyTexture(object, texture) {
        if (!object.model) return;

        if (object.file && object.file.endsWith('.gltf')) {
            this.applyTextureToGLTF(object, texture);
        } else {
            this.applyTextureToSprite(object, texture);
        }
    }

    // ⭐ ПРИМЕНЕНИЕ ТЕКСТУРЫ К SPRITE
    applyTextureToSprite(object, texture) {
        if (object.model.material) {
            object.model.material.map = texture;
            object.model.material.needsUpdate = true;
        }
    }

    // ⭐ ПРИМЕНЕНИЕ ТЕКСТУРЫ К GLTF
    applyTextureToGLTF(object, texture) {
        if (!object.model) return;

        object.model.traverse((child) => {
            if (child.isMesh && child.material) {
                const newMaterial = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    alphaTest: 0.1,
                    side: THREE.DoubleSide
                });

                if (!child.userData.originalMaterial) {
                    child.userData.originalMaterial = child.material;
                }

                child.material = newMaterial;
                child.material.needsUpdate = true;
            }
        });

        this.forceModelUpdate(object.model);
    }

    // ⭐ ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ МОДЕЛИ
    forceModelUpdate(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                // Обновляем геометрию
                if (child.geometry) {
                    child.geometry.attributes.position.needsUpdate = true;
                    if (child.geometry.attributes.uv) {
                        child.geometry.attributes.uv.needsUpdate = true;
                    }
                    child.geometry.computeBoundingSphere();
                    child.geometry.computeBoundingBox();
                }

                // Обновляем матрицы
                child.updateMatrix();
                child.updateMatrixWorld(true);
            }
        });
    }

    // ------------------- АНИМАЦИЯ -------------------
    updateCharacterAnimation(object, deltaTime) {
        if (!object.characterState || !object.model) return;

        const state = object.characterState;
        const currentTime = Date.now();

        if (currentTime - state.lastFrameTime > state.frameDuration) {
            const oldFrame = state.currentFrame;
            state.currentFrame = (state.currentFrame + 1) % 4;
            state.lastFrameTime = currentTime;

            this.loadCharacterTexture(object);
        }
    }

    // ------------------- ПОВЕДЕНИЕ ПОРТАЛА -------------------
    portalBehavior(object, deltaTime, config = {}) {
        if (!object.model) return;

        const cfg = {
            offset: new THREE.Vector3(0.3, 0.4, -0.4),
            tilt: new THREE.Euler(0, 0, 0),
            axisDir: new THREE.Vector3(0, 0.5, 1),
            speed: 0.5,
            clockwise: true,
            ...config
        };

        if (!object._pivot) {
            const pivot = new THREE.Object3D();
            const parent = object.model.parent;
            parent.add(pivot);

            const worldPos = new THREE.Vector3();
            object.model.getWorldPosition(worldPos);
            pivot.position.copy(worldPos.clone().add(cfg.offset));
            pivot.rotation.copy(cfg.tilt);
            pivot.add(object.model);
            object.model.position.copy(cfg.offset.clone().negate());

            object._pivot = pivot;

            const axisHelper = new THREE.ArrowHelper(
                cfg.axisDir.clone().normalize(),
                new THREE.Vector3(0, 0, 0),
                3,
                0xff0000
            );
            pivot.add(axisHelper);
            object._axisHelper = axisHelper;
        }

        const pivot = object._pivot;
        const dir = cfg.clockwise ? -1 : 1;
        pivot.rotateOnAxis(cfg.axisDir.clone().normalize(), dir * cfg.speed * deltaTime);

        const scale = 1.0 + Math.sin(Date.now() * 0.003) * 0.04;
        object.model.scale.set(scale, scale, scale);
    }

    // ------------------- ПОВЕДЕНИЕ ПО УМОЛЧАНИЮ -------------------
    defaultBehavior(object, deltaTime) {
        // Базовое поведение
    }

    // ------------------- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ -------------------
    getMaterialsCount(model) {
        let count = 0;
        model.traverse((child) => {
            if (child.material) count++;
        });
        return count;
    }

    // ------------------- ОБЩИЕ МЕТОДЫ -------------------
    getBehavior(objectType) {
        return this.behaviors[objectType] || this.behaviors['default'];
    }

    updateObjects(objects, deltaTime) {
        objects.forEach(obj => {
            const behavior = this.getBehavior(this.getObjectType(obj.type));
            behavior(obj, deltaTime);
        });
    }

    getObjectType(typeName) {
        const lowerName = typeName.toLowerCase();

        if (lowerName.includes('портал') || lowerName.includes('portal')) {
            return 'portal';
        }
        if (lowerName.includes('персонаж') || lowerName.includes('character') || lowerName.includes('morty')) {
            return 'character';
        }
        return 'default';
    }
}