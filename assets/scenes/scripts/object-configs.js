// scripts/object-configs.js
class ObjectConfigs {
    constructor() {
        this.objectTypes = {
            "tree": {
                name: "Дерево",
                file: "../models/tree.gltf",  // ← ../models/
                width: 2,
                depth: 2,
                height: 4,
                scale: 1.0,
                color: 0x00ff00,
                heightOffset: 0,
                rotation: 0
            },
            "rock": {
                name: "Камень",
                file: "../models/rock.gltf",  // ← ../models/
                width: 1,
                depth: 1,
                height: 1,
                scale: 1.0,
                color: 0x888888,
                heightOffset: 0,
                rotation: 0
            },
            "Ric": {
                name: "Дом",
                file: "../models/house.gltf",  // ← ../models/
                width: 4,
                depth: 4,
                height: 3,
                scale: 1.0,
                color: 0xffaa00,
                heightOffset: 0,
                rotation: 0
            },
            "character": {
                name: "Персонаж",
                file: "../models/Morty.gltf",  // ← из scripts/ в models/
                width: 1,
                depth: 1,
                height: 2,
                scale: 1.0,
                color: 0x0000ff,
                heightOffset: 1,
                rotation: 180,

                spriteFrames: {
                    up: [
                        "../../images/morty/up_1.png",  // ← ИСПРАВЛЕНО!
                        "../../images/morty/up_2.png",
                        "../../images/morty/up_3.png",
                        "../../images/morty/up_4.png"
                    ],
                    down: [
                        "../../images/morty/down_1.png",  // ← ИСПРАВЛЕНО!
                        "../../images/morty/down_2.png",
                        "../../images/morty/down_3.png",
                        "../../images/morty/down_4.png"
                    ],
                    left: [
                        "../../images/morty/side_1.png",  // ← ИСПРАВЛЕНО!
                        "../../images/morty/side_2.png",
                        "../../images/morty/side_3.png",
                        "../../images/morty/side_4.png"
                    ],
                    right: [
                        "../../images/morty/right_3.png",  // ← ИСПРАВЛЕНО!
                        "../../images/morty/right_3.png",
                        "../../images/morty/right_3.png",
                        "../../images/morty/right_3.png"
                    ]
                },
                currentDirection: "down",
                currentFrame: 0,
                frameDuration: 200,
                lastFrameTime: 0,

                // ⭐ НОВЫЕ ПОЛЯ ДЛЯ МАРШРУТОВ
                onevec: [],    // Первые шаги (выполняются один раз)
                allvec: []     // Циклический маршрут (повторяется)

            },
            "portal": {
                name: "Портал",
                file: "../models/Portal.gltf",  // ← ../models/Portal.gltf
                width: 1,
                depth: 1,
                height: 3,
                scale: 1.0,
                color: 0x00ffff,
                rotation: 180,
                heightOffset: 1
            }
        };
    }

    getObjectType(type) {
        const config = this.objectTypes[type] ? { ...this.objectTypes[type] } : null;

        // ⭐ ДОБАВЛЯЕМ ПУСТЫЕ МАССИВЫ ДЛЯ МАРШРУТОВ ЕСЛИ ИХ НЕТ
        if (config && type === "character") {
            config.onevec = config.onevec || [];
            config.allvec = config.allvec || [];
        }

        return config;
    }

    getAllObjectTypes() {
        return { ...this.objectTypes };
    }

    createCustomConfig(file, name = "Пользовательская модель") {
        return {
            name: name,
            file: file,
            width: 2,
            depth: 2,
            height: 2,
            scale: 1.0,
            color: 0xffffff,
            rotation: 0,
            heightOffset: 0,
            isCustom: true
        };
    }
}