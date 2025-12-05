// scripts/object-placer.js
class ObjectPlacer {
    constructor(scene, gridSystem, camera, renderer) {
        this.scene = scene;
        this.gridSystem = gridSystem;
        this.camera = camera;
        this.renderer = renderer;

        this.objectConfigs = new ObjectConfigs();
        this.objectManager = new ObjectManager(scene, gridSystem);
        this.objectUIExport = new ObjectUIExport(this, this.objectManager, this.objectConfigs);

        this.placementMode = false;
        this.currentObjectConfig = null;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.init();
        this.startAnimation();
    }

    init() {
        this.setupEventListeners();
        this.objectUIExport.createUI();
        this.selectObjectType("tree"); // или другой объект по умолчанию
    }

    // ------------------- ОСНОВНЫЕ МЕТОДЫ -------------------
    setupEventListeners() {
        this.renderer.domElement.addEventListener('mousedown', (event) => {
            if (!this.placementMode) return;

            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);

            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.gridSystem.gridHeight);
            const intersectionPoint = new THREE.Vector3();
            const intersects = this.raycaster.ray.intersectPlane(plane, intersectionPoint);

            if (intersects) {
                const cell = this.gridSystem.getCellFromWorldPos(intersectionPoint.x, intersectionPoint.z);

                if (event.button === 0) {
                    this.placeObject(cell.x, cell.z);
                } else if (event.button === 2) {
                    this.removeObjectAt(cell.x, cell.z);
                }
            }
        });

        this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    selectObjectType(type) {
        const config = this.objectConfigs.getObjectType(type);
        if (config) {
            this.currentObjectConfig = config;
            this.objectUIExport.updateSlidersForConfig(config);
        }
    }

    async placeObject(cellX, cellZ, importRotation = null) {
        if (!this.currentObjectConfig) return;

        try {
            await this.objectManager.placeObject(this.currentObjectConfig, cellX, cellZ, importRotation);
            this.objectUIExport.updateObjectList();
        } catch (error) {
            alert(error.message);
        }
    }

    removeObjectAt(cellX, cellZ) {
        const removedObj = this.objectManager.removeObjectAt(cellX, cellZ);
        if (removedObj) {
            this.objectUIExport.updateObjectList();
        }
    }

    togglePlacementMode() {
        this.placementMode = !this.placementMode;
        const btn = document.getElementById('toggle-placement');
        if (btn) {
            btn.textContent = this.placementMode ? 'Режим размещения: ВКЛ' : 'Режим размещения: ВЫКЛ';
            btn.style.background = this.placementMode ? '#4CAF50' : '#2196F3';
        }
        return this.placementMode;
    }

    clearAllObjects() {
        this.objectManager.clearAllObjects();
        this.objectUIExport.updateObjectList();
    }

    exportObjects() {
        return this.objectUIExport.exportObjects();
    }

    importObjects(data) {
        return this.objectUIExport.importObjects(data);
    }

    // ------------------- АНИМАЦИЯ -------------------
    startAnimation() {
        const clock = new THREE.Clock();

        const animate = () => {
            requestAnimationFrame(animate);
            const deltaTime = clock.getDelta();

            // Обновляем только объекты (порталы и другие)
            this.objectManager.update(deltaTime);
        };
        animate();
    }
}
