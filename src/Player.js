import * as THREE from 'three';
import { Block } from './Block.js';

export class Player {
    constructor(camera) {
        this.camera = camera;
        this.position = new THREE.Vector3(0, 35, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        // Player properties
        this.height = 1.8;
        this.eyeHeight = 1.6;
        this.radius = 0.3;
        
        // Movement properties
        this.walkSpeed = 5.0;
        this.runSpeed = 8.0;
        this.jumpSpeed = 8.0;
        this.gravity = -25.0;
        
        // State
        this.onGround = false;
        this.isRunning = false;
        this.isSneaking = false;
        
        // Input state
        this.inputVector = new THREE.Vector2(0, 0);
        this.isJumping = false;
        
        // Camera rotation
        this.pitch = 0; // Up/down rotation
        this.yaw = 0;   // Left/right rotation
        
        // Mouse sensitivity
        this.mouseSensitivity = 0.002;
        
        // Update camera position
        this.updateCameraPosition();
        
        console.log('Player initialized');
    }
    
    update(deltaTime, world) {
        // Apply input to movement
        this.handleMovement(deltaTime);
        
        // Apply physics
        this.applyPhysics(deltaTime, world);
        
        // Update camera
        this.updateCameraPosition();
    }
    
    handleMovement(deltaTime) {
        // Calculate movement direction based on camera rotation
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0; // Remove vertical component
        forward.normalize();
        
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
        right.normalize();
        
        // Calculate movement vector
        const movement = new THREE.Vector3();
        movement.addScaledVector(forward, this.inputVector.y);
        movement.addScaledVector(right, this.inputVector.x);
        
        if (movement.length() > 0) {
            movement.normalize();
            
            // Apply speed
            const speed = this.isRunning ? this.runSpeed : this.walkSpeed;
            if (this.isSneaking) {
                movement.multiplyScalar(speed * 0.3); // Slower when sneaking
            } else {
                movement.multiplyScalar(speed);
            }
            
            // Apply movement to velocity (horizontal only)
            this.velocity.x = movement.x;
            this.velocity.z = movement.z;
        } else {
            // No input, stop horizontal movement
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
        
        // Handle jumping
        if (this.isJumping && this.onGround) {
            this.velocity.y = this.jumpSpeed;
            this.onGround = false;
            this.isJumping = false;
        }
    }
    
    applyPhysics(deltaTime, world) {
        // Apply gravity
        if (!this.onGround) {
            this.velocity.y += this.gravity * deltaTime;
        }
        
        // Calculate next position
        const nextPosition = this.position.clone();
        nextPosition.addScaledVector(this.velocity, deltaTime);
        
        // Collision detection and resolution
        this.handleCollisions(nextPosition, world);
        
        // Update position
        this.position.copy(nextPosition);
    }
    
    handleCollisions(nextPosition, world) {
        const currentPos = this.position.clone();
        
        // Check Y collision (vertical)
        this.onGround = false;
        
        // Check collision below player
        const feetY = Math.floor(nextPosition.y);
        const headY = Math.floor(nextPosition.y + this.height);
        
        // Check blocks around player's position
        const minX = Math.floor(nextPosition.x - this.radius);
        const maxX = Math.floor(nextPosition.x + this.radius);
        const minZ = Math.floor(nextPosition.z - this.radius);
        const maxZ = Math.floor(nextPosition.z + this.radius);
        
        // Vertical collision (Y-axis)
        if (this.velocity.y <= 0) {
            // Falling or on ground - check below
            for (let x = minX; x <= maxX; x++) {
                for (let z = minZ; z <= maxZ; z++) {
                    if (world.isBlockSolid(x, feetY, z)) {
                        nextPosition.y = feetY + 1;
                        this.velocity.y = 0;
                        this.onGround = true;
                        break;
                    }
                }
                if (this.onGround) break;
            }
        } else {
            // Rising - check above
            for (let x = minX; x <= maxX; x++) {
                for (let z = minZ; z <= maxZ; z++) {
                    if (world.isBlockSolid(x, headY, z)) {
                        nextPosition.y = headY - this.height;
                        this.velocity.y = 0;
                        break;
                    }
                }
            }
        }
        
        // Horizontal collision (X and Z axes)
        const playerY = Math.floor(nextPosition.y);
        const playerYTop = Math.floor(nextPosition.y + this.height - 0.1);
        
        // X-axis collision
        if (this.velocity.x !== 0) {
            const checkX = this.velocity.x > 0 ? 
                Math.floor(nextPosition.x + this.radius) : 
                Math.floor(nextPosition.x - this.radius);
            
            let collisionX = false;
            for (let y = playerY; y <= playerYTop; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    if (world.isBlockSolid(checkX, y, z)) {
                        collisionX = true;
                        break;
                    }
                }
                if (collisionX) break;
            }
            
            if (collisionX) {
                nextPosition.x = currentPos.x;
                this.velocity.x = 0;
            }
        }
        
        // Z-axis collision
        if (this.velocity.z !== 0) {
            const checkZ = this.velocity.z > 0 ? 
                Math.floor(nextPosition.z + this.radius) : 
                Math.floor(nextPosition.z - this.radius);
            
            let collisionZ = false;
            for (let y = playerY; y <= playerYTop; y++) {
                for (let x = minX; x <= maxX; x++) {
                    if (world.isBlockSolid(x, y, checkZ)) {
                        collisionZ = true;
                        break;
                    }
                }
                if (collisionZ) break;
            }
            
            if (collisionZ) {
                nextPosition.z = currentPos.z;
                this.velocity.z = 0;
            }
        }
    }
    
    updateCameraPosition() {
        // Set camera position to player position + eye height
        this.camera.position.set(
            this.position.x,
            this.position.y + this.eyeHeight,
            this.position.z
        );
        
        // Apply camera rotation
        this.camera.rotation.x = this.pitch;
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.z = 0;
    }
    
    // Input handling methods
    setInputVector(x, y) {
        this.inputVector.set(x, y);
    }
    
    setJumping(jumping) {
        this.isJumping = jumping;
    }
    
    setRunning(running) {
        this.isRunning = running;
    }
    
    setSneaking(sneaking) {
        this.isSneaking = sneaking;
    }
    
    handleMouseMovement(deltaX, deltaY) {
        // Update yaw (left/right rotation)
        this.yaw -= deltaX * this.mouseSensitivity;
        
        // Update pitch (up/down rotation)
        this.pitch -= deltaY * this.mouseSensitivity;
        
        // Clamp pitch to prevent over-rotation
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    }
}