import * as THREE from 'three';
import { World } from './World.js';
import { Player } from './Player.js';
import { InputHandler } from './InputHandler.js';
import { UI } from './UI.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.isRunning = false;
        this.isPaused = false;
        
        // Initialize Three.js
        this.initRenderer();
        this.initScene();
        this.initCamera();
        this.initLighting();
        
        // Initialize game systems
        this.world = new World();
        this.world.setScene(this.scene); // Connect world to scene
        this.player = new Player(this.camera);
        this.inputHandler = new InputHandler(this);
        this.ui = new UI(this);
        
        // Performance monitoring
        this.stats = {
            fps: 0,
            frameCount: 0,
            lastTime: performance.now()
        };
        
        // Start the game
        this.start();
    }
    
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setClearColor(0x87CEEB); // Sky blue
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    }
    
    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near plane
            1000 // Far plane
        );
        
        this.camera.position.set(0, 32, 0);
    }
    
    initLighting() {
        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.sunLight.position.set(50, 100, 50);
        this.sunLight.castShadow = true;
        
        // Configure shadows
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.1;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.camera.left = -100;
        this.sunLight.shadow.camera.right = 100;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        
        this.scene.add(this.sunLight);
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.animate();
        
        console.log('Tollo Minecraft Clone started!');
    }
    
    pause() {
        this.isPaused = true;
        this.inputHandler.setPointerLock(false);
    }
    
    resume() {
        this.isPaused = false;
    }
    
    animate() {
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.animate());
        
        if (this.isPaused) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.stats.lastTime;
        
        // Update game systems
        this.update(deltaTime / 1000); // Convert to seconds
        this.render();
        
        // Update stats
        this.updateStats(currentTime);
        this.stats.lastTime = currentTime;
    }
    
    update(deltaTime) {
        // Update player
        this.player.update(deltaTime, this.world);
        
        // Update world (chunk loading/unloading)
        this.world.update(this.player.position);
        
        // Update UI
        this.ui.update();
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    updateStats(currentTime) {
        this.stats.frameCount++;
        
        if (currentTime - this.stats.lastTime >= 1000) {
            this.stats.fps = this.stats.frameCount;
            this.stats.frameCount = 0;
        }
    }
    
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    // Block interaction methods
    placeBlock(position, blockType) {
        return this.world.setBlock(position.x, position.y, position.z, blockType);
    }
    
    breakBlock(position) {
        return this.world.setBlock(position.x, position.y, position.z, null);
    }
    
    getBlockAt(position) {
        return this.world.getBlock(position.x, position.y, position.z);
    }
    
    // Raycast for block interaction
    raycastBlocks() {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        // Set raycaster range
        raycaster.near = 0.1;
        raycaster.far = 10;
        
        // Get all chunk meshes from the scene
        const chunkMeshes = [];
        this.scene.traverse((child) => {
            if (child.isMesh && child.material && child.material.vertexColors) {
                chunkMeshes.push(child);
            }
        });
        
        if (chunkMeshes.length === 0) return null;
        
        // Check for intersections with chunk meshes
        const intersects = raycaster.intersectObjects(chunkMeshes, false);
        
        if (intersects.length > 0) {
            const intersect = intersects[0];
            const point = intersect.point;
            const normal = intersect.face.normal;
            
            // Calculate block position from intersection point
            const blockPos = {
                x: Math.floor(point.x),
                y: Math.floor(point.y),
                z: Math.floor(point.z)
            };
            
            // Adjust for negative coordinates
            if (point.x < 0) blockPos.x -= 1;
            if (point.y < 0) blockPos.y -= 1;
            if (point.z < 0) blockPos.z -= 1;
            
            return {
                position: blockPos,
                normal: normal,
                distance: intersect.distance,
                point: point
            };
        }
        
        return null;
    }
}