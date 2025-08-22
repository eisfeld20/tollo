import * as THREE from 'three';
import { World } from './World.js';
import { Player } from './Player.js';
import { InputHandler } from './InputHandler.js';
import { UI } from './UI.js';
import { ParticleSystem } from './ParticleSystem.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.isRunning = false;
        this.isPaused = false;
        this.isMenuOpen = false;
        
        // Initialize pause menu
        this.initPauseMenu();
        
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
        this.particleSystem = new ParticleSystem(this.scene);
        
        // Performance monitoring
        this.stats = {
            fps: 0,
            frameCount: 0,
            lastTime: performance.now()
        };
        
        // Day/night cycle
        this.dayNightCycle = {
            timeOfDay: 0, // 0 to 1 (0 = midnight, 0.5 = noon)
            dayLength: 120000, // 2 minutes in milliseconds
            startTime: performance.now()
        };
        
        // Game settings
        this.settings = {
            renderDistance: 8,
            mouseSensitivity: 1.0,
            dayLength: 2, // minutes
            enableShadows: true,
            enableParticles: true
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
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(this.ambientLight);
        
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
        
        // Moon light (for night time)
        this.moonLight = new THREE.DirectionalLight(0x6666ff, 0.2);
        this.moonLight.position.set(-50, 100, -50);
        this.moonLight.castShadow = false;
        this.scene.add(this.moonLight);
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.animate();
        
        console.log('Tollo Minecraft Clone started!');
    }
    
    initPauseMenu() {
        // Get menu elements
        this.pauseMenu = document.getElementById('pauseMenu');
        this.settingsMenu = document.getElementById('settingsMenu');
        
        const resumeButton = document.getElementById('resumeButton');
        const settingsButton = document.getElementById('settingsButton');
        const respawnButton = document.getElementById('respawnButton');
        const restartButton = document.getElementById('restartButton');
        const applySettingsButton = document.getElementById('applySettingsButton');
        const backToMenuButton = document.getElementById('backToMenuButton');
        
        // Add event listeners
        if (resumeButton) {
            resumeButton.addEventListener('click', () => this.togglePause());
        }
        
        if (settingsButton) {
            settingsButton.addEventListener('click', () => this.showSettings());
        }
        
        if (respawnButton) {
            respawnButton.addEventListener('click', () => this.respawnPlayer());
        }
        
        if (restartButton) {
            restartButton.addEventListener('click', () => this.restartGame());
        }
        
        if (applySettingsButton) {
            applySettingsButton.addEventListener('click', () => this.applySettings());
        }
        
        if (backToMenuButton) {
            backToMenuButton.addEventListener('click', () => this.showPauseMenu());
        }
        
        // Initialize settings UI
        this.initSettingsUI();
    }
    
    togglePause() {
        this.isMenuOpen = !this.isMenuOpen;
        
        if (this.isMenuOpen) {
            this.pauseMenu.style.display = 'block';
            this.inputHandler.setPointerLock(false);
            this.isPaused = true;
        } else {
            this.pauseMenu.style.display = 'none';
            this.isPaused = false;
            // Don't automatically re-lock pointer, let user click to lock
        }
    }
    
    respawnPlayer() {
        // Reset player position
        this.player.position.set(0, 35, 0);
        this.player.velocity.set(0, 0, 0);
        this.togglePause();
    }
    
    restartGame() {
        // Clear the world
        this.world.clear();
        
        // Reset player
        this.player.position.set(0, 35, 0);
        this.player.velocity.set(0, 0, 0);
        
        // Clear particles
        this.particleSystem.clear();
        
        // Close menu
        this.togglePause();
        
        console.log('Game restarted!');
    }
    
    showSettings() {
        this.pauseMenu.style.display = 'none';
        this.settingsMenu.style.display = 'block';
        this.updateSettingsUI();
    }
    
    showPauseMenu() {
        this.settingsMenu.style.display = 'none';
        this.pauseMenu.style.display = 'block';
    }
    
    initSettingsUI() {
        // Add event listeners for sliders to update display values
        const renderDistanceSlider = document.getElementById('renderDistance');
        const mouseSensitivitySlider = document.getElementById('mouseSensitivity');
        const dayLengthSlider = document.getElementById('dayLength');
        
        if (renderDistanceSlider) {
            renderDistanceSlider.addEventListener('input', (e) => {
                document.getElementById('renderDistanceValue').textContent = e.target.value;
            });
        }
        
        if (mouseSensitivitySlider) {
            mouseSensitivitySlider.addEventListener('input', (e) => {
                document.getElementById('mouseSensitivityValue').textContent = e.target.value;
            });
        }
        
        if (dayLengthSlider) {
            dayLengthSlider.addEventListener('input', (e) => {
                document.getElementById('dayLengthValue').textContent = e.target.value;
            });
        }
    }
    
    updateSettingsUI() {
        // Update UI elements with current settings
        const renderDistanceSlider = document.getElementById('renderDistance');
        const mouseSensitivitySlider = document.getElementById('mouseSensitivity');
        const dayLengthSlider = document.getElementById('dayLength');
        const enableShadowsCheckbox = document.getElementById('enableShadows');
        const enableParticlesCheckbox = document.getElementById('enableParticles');
        
        if (renderDistanceSlider) {
            renderDistanceSlider.value = this.settings.renderDistance;
            document.getElementById('renderDistanceValue').textContent = this.settings.renderDistance;
        }
        
        if (mouseSensitivitySlider) {
            const sensitivity = Math.round(this.settings.mouseSensitivity * 100);
            mouseSensitivitySlider.value = sensitivity;
            document.getElementById('mouseSensitivityValue').textContent = sensitivity;
        }
        
        if (dayLengthSlider) {
            dayLengthSlider.value = this.settings.dayLength;
            document.getElementById('dayLengthValue').textContent = this.settings.dayLength;
        }
        
        if (enableShadowsCheckbox) {
            enableShadowsCheckbox.checked = this.settings.enableShadows;
        }
        
        if (enableParticlesCheckbox) {
            enableParticlesCheckbox.checked = this.settings.enableParticles;
        }
    }
    
    applySettings() {
        // Read values from UI
        const renderDistanceSlider = document.getElementById('renderDistance');
        const mouseSensitivitySlider = document.getElementById('mouseSensitivity');
        const dayLengthSlider = document.getElementById('dayLength');
        const enableShadowsCheckbox = document.getElementById('enableShadows');
        const enableParticlesCheckbox = document.getElementById('enableParticles');
        
        // Update settings
        if (renderDistanceSlider) {
            this.settings.renderDistance = parseInt(renderDistanceSlider.value);
            this.world.renderDistance = this.settings.renderDistance;
        }
        
        if (mouseSensitivitySlider) {
            this.settings.mouseSensitivity = parseInt(mouseSensitivitySlider.value) / 100;
            this.player.mouseSensitivity = this.settings.mouseSensitivity * 0.002;
        }
        
        if (dayLengthSlider) {
            this.settings.dayLength = parseInt(dayLengthSlider.value);
            this.dayNightCycle.dayLength = this.settings.dayLength * 60000; // Convert to milliseconds
        }
        
        if (enableShadowsCheckbox) {
            this.settings.enableShadows = enableShadowsCheckbox.checked;
            this.renderer.shadowMap.enabled = this.settings.enableShadows;
            this.sunLight.castShadow = this.settings.enableShadows;
        }
        
        if (enableParticlesCheckbox) {
            this.settings.enableParticles = enableParticlesCheckbox.checked;
        }
        
        console.log('Settings applied:', this.settings);
        this.showPauseMenu();
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
        // Update day/night cycle
        this.updateDayNightCycle();
        
        // Update player
        this.player.update(deltaTime, this.world);
        
        // Update world (chunk loading/unloading)
        this.world.update(this.player.position);
        
        // Update particle system
        this.particleSystem.update(deltaTime);
        
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
    
    updateDayNightCycle() {
        const currentTime = performance.now();
        const elapsed = currentTime - this.dayNightCycle.startTime;
        
        // Calculate time of day (0 to 1)
        this.dayNightCycle.timeOfDay = (elapsed % this.dayNightCycle.dayLength) / this.dayNightCycle.dayLength;
        
        // Convert to angle (0 to 2*PI)
        const angle = this.dayNightCycle.timeOfDay * Math.PI * 2;
        
        // Calculate sun position (circular path)
        const radius = 150;
        const sunX = Math.cos(angle - Math.PI / 2) * radius;
        const sunY = Math.sin(angle - Math.PI / 2) * radius + 50;
        const sunZ = 50;
        
        // Update sun position
        this.sunLight.position.set(sunX, sunY, sunZ);
        
        // Calculate moon position (opposite to sun)
        const moonX = -sunX;
        const moonY = -sunY + 100;
        const moonZ = -sunZ;
        this.moonLight.position.set(moonX, moonY, moonZ);
        
        // Calculate light intensities based on sun height
        const sunHeight = Math.sin(angle - Math.PI / 2); // -1 to 1
        const dayIntensity = Math.max(0, sunHeight);
        const nightIntensity = Math.max(0, -sunHeight * 0.3);
        
        // Update light intensities
        this.sunLight.intensity = dayIntensity * 0.8;
        this.moonLight.intensity = nightIntensity * 0.3;
        this.ambientLight.intensity = 0.2 + dayIntensity * 0.3;
        
        // Update sky color based on time of day
        const skyColors = {
            day: new THREE.Color(0x87CEEB),    // Sky blue
            sunset: new THREE.Color(0xFF6B35), // Orange
            night: new THREE.Color(0x191970)   // Dark blue
        };
        
        let skyColor;
        if (sunHeight > 0.7) {
            // Day
            skyColor = skyColors.day;
        } else if (sunHeight > -0.2) {
            // Transition (sunset/sunrise)
            const t = (sunHeight + 0.2) / 0.9; // 0 to 1
            skyColor = new THREE.Color().lerpColors(skyColors.sunset, skyColors.day, t);
        } else {
            // Night
            skyColor = skyColors.night;
        }
        
        this.renderer.setClearColor(skyColor);
        if (this.scene.fog) {
            this.scene.fog.color = skyColor;
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
        const blockType = this.world.getBlock(position.x, position.y, position.z)?.type;
        const success = this.world.setBlock(position.x, position.y, position.z, null);
        
        if (success && blockType && this.settings.enableParticles) {
            // Create break particles
            this.particleSystem.createBlockBreakParticles(position, blockType);
        }
        
        return success;
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