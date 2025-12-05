// ⭐ ОТДЕЛЬНЫЙ КЛАСС ДЛЯ УПРАВЛЕНИЯ ХОДЬБОЙ ПЕРСОНАЖА
class CharacterWalk {
    constructor(gridSystem) {
        this.gridSystem = gridSystem;

        // ⭐ УПРАВЛЕНИЕ СТРЕЛКАМИ
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };

        this.setupKeyboardControls();
        this.debugMode = true;
        this.portalCooldown = false;

    }

    // ⭐ НАСТРОЙКА УПРАВЛЕНИЯ КЛАВИАТУРОЙ
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            if (this.keys.hasOwnProperty(event.code)) {
                this.keys[event.code] = true;
                event.preventDefault();

                if (this.debugMode) {
                    console.log(`🎮 НАЖАТА КЛАВИША: ${event.code}`);
                }
            }
        });

        document.addEventListener('keyup', (event) => {
            if (this.keys.hasOwnProperty(event.code)) {
                this.keys[event.code] = false;
                event.preventDefault();
            }
        });
    }

    // ⭐ ОБНОВЛЕНИЕ ПЕРСОНАЖА
    updateCharacter(object, deltaTime) {
        if (!object.characterState) {
            this.initializeCharacterState(object);
        }

        // ⭐ ОБРАБОТКА УПРАВЛЕНИЯ СТРЕЛКАМИ
        this.handleKeyboardInput(object);

        // ⭐ ОБРАБОТКА АВТОМАТИЧЕСКИХ МАРШРУТОВ
        this.handleRouteMovement(object, deltaTime);

        // ⭐ ОБНОВЛЕНИЕ ДВИЖЕНИЯ
        this.updateCharacterMovement(object, deltaTime);
    }

    // ⭐ ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ ПЕРСОНАЖА
    initializeCharacterState(object) {
        object.characterState = {
            isMoving: false,
            currentDirection: object.config?.currentDirection || "down",
            currentFrame: object.config?.currentFrame || 0,
            frameDuration: object.config?.frameDuration || 200,
            lastFrameTime: Date.now(),
            moveCooldown: 0,
            targetCell: null,
            moveProgress: 0,
            moveSpeed: object.config?.moveSpeed || 3.0,
            cellX: object.cellX || 0,
            cellZ: object.cellZ || 0,

            // ⭐ СОСТОЯНИЕ МАРШРУТОВ
            routeState: {
                onevecIndex: 0,
                allvecIndex: 0,
                isExecutingOnevec: true,
                waitingForInput: false
            }
        };

        // ⭐ ДИАГНОСТИКА НАЧАЛЬНОЙ ПОЗИЦИИ
        if (this.debugMode) {
            console.log(`📍 ПЕРСОНАЖ ИНИЦИАЛИЗИРОВАН: (${object.characterState.cellX}, ${object.characterState.cellZ})`);
            const isValidStart = this.canMoveToCell(object.characterState.cellX, object.characterState.cellZ);
            console.log(`   🏁 Начальная позиция: ${isValidStart ? '✅ НА ЗЕЛЕНОЙ КЛЕТКЕ' : '❌ НЕ НА ЗЕЛЕНОЙ КЛЕТКЕ'}`);
        }
    }

    // ⭐ ОБРАБОТКА ВВОДА С КЛАВИАТУРЫ
    handleKeyboardInput(object) {
        if (!object.characterState || object.characterState.isMoving) return;

        const state = object.characterState;
        let direction = null;
        let targetX = state.cellX;
        let targetZ = state.cellZ;

        // Проверяем нажатые клавиши
        if (this.keys.ArrowUp) {
            direction = "up";
            targetZ -= 1;
        } else if (this.keys.ArrowDown) {
            direction = "down";
            targetZ += 1;
        } else if (this.keys.ArrowLeft) {
            direction = "left";
            targetX -= 1;
        } else if (this.keys.ArrowRight) {
            direction = "right";
            targetX += 1;
        }

        if (direction) {
            // ⭐ ПРОВЕРЯЕМ МОЖНО ЛИ ИДТИ В ЭТУ КЛЕТКУ
            if (this.canMoveToCell(targetX, targetZ)) {
                if (this.debugMode) {
                    console.log(`🎯 ДВИЖЕНИЕ РАЗРЕШЕНО: ${direction} -> (${targetX}, ${targetZ})`);
                }

                this.startMovement(object, direction, targetX, targetZ);
                state.routeState.waitingForInput = true;
            } else {
                if (this.debugMode) {
                    console.log(`🚫 ДВИЖЕНИЕ ЗАПРЕЩЕНО: ${direction} -> (${targetX}, ${targetZ})`);
                    this.debugCellInfo(targetX, targetZ);
                }
            }
        }
    }

    // ⭐ НАЧАЛО ДВИЖЕНИЯ
    startMovement(object, direction, targetX, targetZ) {
        const state = object.characterState;

        state.targetCell = { x: targetX, z: targetZ };
        state.isMoving = true;
        state.moveProgress = 0;
        state.currentDirection = direction;
        state.currentFrame = 0;
        state.lastFrameTime = Date.now();
    }

    // ⭐ ОБРАБОТКА АВТОМАТИЧЕСКИХ МАРШРУТОВ
    handleRouteMovement(object, deltaTime) {
        const state = object.characterState;
        const routeState = state.routeState;

        if (state.isMoving || routeState.waitingForInput) return;

        const onevec = object.config?.onevec || [];
        const allvec = object.config?.allvec || [];
        let nextDirection = null;

        // 1. Сначала выполняем onevec
        if (routeState.isExecutingOnevec && onevec.length > 0) {
            if (routeState.onevecIndex < onevec.length) {
                nextDirection = onevec[routeState.onevecIndex];
                routeState.onevecIndex++;
            } else {
                routeState.isExecutingOnevec = false;
                routeState.allvecIndex = 0;
            }
        }

        // 2. Затем выполняем allvec
        if (!routeState.isExecutingOnevec && allvec.length > 0) {
            if (routeState.allvecIndex < allvec.length) {
                nextDirection = allvec[routeState.allvecIndex];
                routeState.allvecIndex++;
                if (routeState.allvecIndex >= allvec.length) {
                    routeState.allvecIndex = 0;
                }
            }
        }

        if (nextDirection) {
            this.executeRouteStep(object, nextDirection);
        }
    }

    // ⭐ ВЫПОЛНЕНИЕ ШАГА МАРШРУТА
    executeRouteStep(object, direction) {
        const state = object.characterState;

        const directionMap = {
            'up': { dx: 0, dz: -1 },
            'down': { dx: 0, dz: 1 },
            'left': { dx: -1, dz: 0 },
            'right': { dx: 1, dz: 0 }
        };

        const move = directionMap[direction];
        if (!move) return;

        const targetX = state.cellX + move.dx;
        const targetZ = state.cellZ + move.dz;

        if (this.canMoveToCell(targetX, targetZ)) {
            this.startMovement(object, direction, targetX, targetZ);
        } else {
            if (this.debugMode) {
                console.log(`⚠️ Авто-движение отменено: клетка (${targetX}, ${targetZ}) недоступна`);
            }
        }
    }

    // ⭐ ОБНОВЛЕНИЕ ДВИЖЕНИЯ
    updateCharacterMovement(object, deltaTime) {
        if (!object.characterState) return;

        const state = object.characterState;

        if (state.isMoving && state.targetCell) {
            this.updateMovementProgress(object, deltaTime);
        }

        if (state.moveCooldown > 0) {
            state.moveCooldown -= deltaTime;
        }
    }

    updateMovementProgress(object, deltaTime) {
        const state = object.characterState;
        state.moveProgress += state.moveSpeed * deltaTime;

        if (state.moveProgress >= 1) {
            this.completeMovement(object);
        } else {
            this.interpolatePosition(object);
        }
    }

    interpolatePosition(object) {
        const state = object.characterState;
        const startPos = this.gridSystem.getWorldPosFromCell(state.cellX, state.cellZ);
        const endPos = this.gridSystem.getWorldPosFromCell(state.targetCell.x, state.targetCell.z);

        object.model.position.x = startPos.x + (endPos.x - startPos.x) * state.moveProgress;
        object.model.position.z = startPos.z + (endPos.z - startPos.z) * state.moveProgress;
        object.model.position.y = this.gridSystem.gridHeight + (object.heightOffset || 1.0);
    }

    completeMovement(object) {
        const state = object.characterState;
        state.cellX = state.targetCell.x;
        state.cellZ = state.targetCell.z;

        const finalPos = this.gridSystem.getWorldPosFromCell(state.cellX, state.cellZ);
        object.model.position.set(
            finalPos.x,
            this.gridSystem.gridHeight + (object.heightOffset || 1.0),
            finalPos.z
        );

        state.isMoving = false;
        state.moveCooldown = 0.3;

        if (this.debugMode) {
            const isValid = this.canMoveToCell(state.cellX, state.cellZ);
            console.log(`✅ Достигнута клетка: (${state.cellX}, ${state.cellZ}) - ${isValid ? '🟩 ЗЕЛЕНАЯ' : '🚫 НЕЗЕЛЕНАЯ'}`);
        }

        // ⭐ ПРОВЕРЯЕМ ПОРТАЛ ПРИ ДОСТИЖЕНИИ КЛЕТКИ
        this.checkForPortal(object, state.cellX, state.cellZ);
    }

    // ⭐ ПРОВЕРКА КРАСНОЙ КЛЕТКИ (ПОРТАЛА)
    checkForPortal(object, x, z) {
        if (this.portalCooldown) return;

        const cell = this.getCell(x, z);
        if (!cell) return;

        // ⭐ ЕСЛИ КЛЕТКА КРАСНАЯ - АКТИВИРУЕМ ПОРТАЛ
        if (cell.isRed === true) {
            console.log(`🚪 АКТИВИРОВАН ПОРТАЛ на клетке: (${x}, ${z})`);

            // Защита от многократного срабатывания
            this.portalCooldown = true;
            setTimeout(() => {
                this.portalCooldown = false;
            }, 2000);

            // ⭐ ЗАПУСКАЕМ ПЕРЕХОД НА НОВУЮ СЦЕНУ
            this.activatePortalTransition();
        }
    }

    // ⭐ АКТИВАЦИЯ ПЕРЕХОДА ПОРТАЛА
    // ⭐ ЗАМЕНИТЬ МЕТОД activatePortalTransition:
    activatePortalTransition() {
        console.log('🎮 Запуск портального перехода...');

        // ⭐ ДИАГНОСТИКА - найдем правильные элементы
        console.log('🔍 Поиск элементов для перехода:');

        // Попробуем разные возможные селекторы
        const possibleSelectors = [
            '.white-screen',
            '#screenContent',
            '.screen-content',
            '#game-container',
            '.game-container',
            'body',
            'html'
        ];

        let whiteScreen = null;
        let screenContent = null;

        for (const selector of possibleSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`   ✅ Найден элемент: ${selector}`);
                if (selector.includes('white') || selector === 'body' || selector === 'html') {
                    whiteScreen = element;
                }
                if (selector.includes('screen') || selector.includes('content') || selector === 'body' || selector === 'html') {
                    screenContent = element;
                }
            } else {
                console.log(`   ❌ Не найден: ${selector}`);
            }
        }

        // Если не нашли - используем body как fallback
        if (!whiteScreen) {
            whiteScreen = document.body;
            console.log('   ⚠️ Используем document.body как whiteScreen');
        }
        if (!screenContent) {
            screenContent = document.body;
            console.log('   ⚠️ Используем document.body как screenContent');
        }

        // Создаём чёрный оверлей
        const blackOverlay = document.createElement('div');
        blackOverlay.style.position = 'fixed'; // ⭐ ИЗМЕНИТЬ НА fixed
        blackOverlay.style.left = '0';
        blackOverlay.style.top = '0';
        blackOverlay.style.width = '100vw';
        blackOverlay.style.height = '100vh';
        blackOverlay.style.backgroundColor = '#000';
        blackOverlay.style.opacity = '0';
        blackOverlay.style.transition = 'opacity 0.7s ease';
        blackOverlay.style.zIndex = '9999';
        blackOverlay.style.pointerEvents = 'none'; // ⭐ ЧТОБЫ НЕ МЕШАЛ

        // Добавляем напрямую в body
        document.body.appendChild(blackOverlay);

        // Запускаем затемнение
        requestAnimationFrame(() => {
            blackOverlay.style.opacity = '1';
        });

        // После затемнения загружаем новую сцену
        setTimeout(() => {
            // ⭐ ПРОСТО ПЕРЕЗАГРУЖАЕМ СТРАНИЦУ ДЛЯ ТЕСТА
            window.location.href = 'battle/battle.html';

            // ИЛИ если хотите iframe:
            // this.loadSceneInIframe(blackOverlay);
        }, 700);
    }

// ⭐ ДОБАВИТЬ НОВЫЙ МЕТОД (ОПЦИОНАЛЬНО):



    // ------------------- ПРОВЕРКИ КЛЕТОК -------------------
    canMoveToCell(x, z) {
        // 1. Проверка границ
        if (!this.isWithinBounds(x, z)) {
            return false;
        }

        // 2. Проверка что клетка существует
        const cell = this.getCell(x, z);
        if (!cell) {
            return false;
        }

        // 3. ⭐ РАЗРЕШАЕМ ХОДИТЬ ПО КРАСНЫМ КЛЕТКАМ (ПОРТАЛАМ)
        if (cell.isRed === true) {
            return true;
        }

        // 4. Проверка что клетка зеленая и проходимая
        if (cell.isGreen !== true || cell.isWalkable === false) {
            return false;
        }

        return true;
    }

    // ⭐ ОБНОВЛЕННАЯ ДИАГНОСТИКА КЛЕТКИ
    debugCellInfo(x, z) {
        console.log(`   🔍 ИНФОРМАЦИЯ О КЛЕТКЕ (${x}, ${z}):`);

        const inBounds = this.isWithinBounds(x, z);
        console.log(`      📏 В границах: ${inBounds ? '✅ ДА' : '❌ НЕТ'}`);

        if (!inBounds) return;

        const cell = this.getCell(x, z);
        if (!cell) {
            console.log(`      🚫 Клетка не существует`);
            return;
        }

        console.log(`      🎨 Цвет: ${this.getCellColorName(cell)}`);
        console.log(`      🚶 Проходима: ${cell.isWalkable !== false ? '✅ ДА' : '❌ НЕТ'}`);
        console.log(`      🟩 Зеленая: ${cell.isGreen ? '✅ ДА' : '❌ НЕТ'}`);
        console.log(`      🟥 Красная (портал): ${cell.isRed ? '✅ ДА - ТЕЛЕПОРТ' : '❌ НЕТ'}`);

        const colorProps = Object.keys(cell).filter(key => key.startsWith('is'));
        console.log(`      📊 Свойства:`, colorProps.map(prop => `${prop}: ${cell[prop]}`).join(', '));
    }

    isWithinBounds(x, z) {
        if (x < 0 || x >= this.gridSystem.gridSize) return false;
        if (z < 0 || z >= this.gridSystem.gridSize) return false;
        return true;
    }

    getCell(x, z) {
        try {
            if (!this.gridSystem.getCell) {
                console.warn('⚠️ gridSystem.getCell не существует');
                return null;
            }
            return this.gridSystem.getCell(x, z);
        } catch (error) {
            console.error(`❌ Ошибка получения клетки (${x}, ${z}):`, error);
            return null;
        }
    }

    debugCellInfo(x, z) {
        console.log(`   🔍 ИНФОРМАЦИЯ О КЛЕТКЕ (${x}, ${z}):`);

        const inBounds = this.isWithinBounds(x, z);
        console.log(`      📏 В границах: ${inBounds ? '✅ ДА' : '❌ НЕТ'}`);

        if (!inBounds) return;

        const cell = this.getCell(x, z);
        if (!cell) {
            console.log(`      🚫 Клетка не существует`);
            return;
        }

        console.log(`      🎨 Цвет: ${this.getCellColorName(cell)}`);
        console.log(`      🚶 Проходима: ${cell.isWalkable !== false ? '✅ ДА' : '❌ НЕТ'}`);
        console.log(`      🟩 Зеленая: ${cell.isGreen ? '✅ ДА' : '❌ НЕТ'}`);

        const colorProps = Object.keys(cell).filter(key => key.startsWith('is'));
        console.log(`      📊 Свойства:`, colorProps.map(prop => `${prop}: ${cell[prop]}`).join(', '));
    }

    getCellColorName(cell) {
        if (!cell) return 'НЕТ КЛЕТКИ';
        if (cell.isGreen) return '🟩 ЗЕЛЕНАЯ';
        if (cell.isRed) return '🟥 КРАСНАЯ';
        if (cell.isBlue) return '🟦 СИНЯЯ';
        if (cell.isYellow) return '🟨 ЖЕЛТАЯ';
        if (cell.isPurple) return '🟪 ФИОЛЕТОВАЯ';
        return '⚪ ДРУГАЯ';
    }
}