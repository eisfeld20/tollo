import * as THREE from 'three';
import { Block } from './Block.js';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.maxParticles = 1000;
        
        // Create particle geometry (small cubes)
        this.particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        
        console.log('Particle system initialized');
    }
    
    createBlockBreakParticles(position, blockType) {
        const particleCount = 8 + Math.floor(Math.random() * 8); // 8-15 particles
        const blockColor = Block.getBlockColor(blockType);
        
        for (let i = 0; i < particleCount; i++) {
            this.createParticle(position, blockColor);
        }
    }
    
    createParticle(position, color) {
        // Remove oldest particles if we're at max capacity
        if (this.particles.length >= this.maxParticles) {
            this.removeParticle(0);
        }
        
        // Create particle material
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            transparent: true
        });
        
        // Create particle mesh
        const particle = new THREE.Mesh(this.particleGeometry, material);
        
        // Set initial position (center of block + small random offset)
        particle.position.set(
            position.x + 0.5 + (Math.random() - 0.5) * 0.8,
            position.y + 0.5 + (Math.random() - 0.5) * 0.8,
            position.z + 0.5 + (Math.random() - 0.5) * 0.8
        );
        
        // Set random velocity
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 8,  // Random X velocity
            Math.random() * 6 + 2,      // Upward Y velocity
            (Math.random() - 0.5) * 8   // Random Z velocity
        );
        
        // Set random rotation velocity
        const rotationVelocity = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );
        
        // Particle properties
        const particleData = {
            mesh: particle,
            velocity: velocity,
            rotationVelocity: rotationVelocity,
            life: 1.0,
            maxLife: 1.0 + Math.random() * 1.0, // 1-2 seconds
            gravity: -15,
            bounced: false
        };
        
        this.particles.push(particleData);
        this.scene.add(particle);
    }
    
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update life
            particle.life -= deltaTime;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.removeParticle(i);
                continue;
            }
            
            // Apply physics
            this.updateParticlePhysics(particle, deltaTime);
            
            // Update appearance based on life
            const lifeRatio = particle.life / particle.maxLife;
            particle.mesh.material.opacity = lifeRatio;
            
            // Scale down over time
            const scale = 0.5 + lifeRatio * 0.5; // Scale from 1.0 to 0.5
            particle.mesh.scale.setScalar(scale);
        }
    }
    
    updateParticlePhysics(particle, deltaTime) {
        // Apply gravity
        particle.velocity.y += particle.gravity * deltaTime;
        
        // Update position
        particle.mesh.position.addScaledVector(particle.velocity, deltaTime);
        
        // Simple ground collision (y = 0)
        if (particle.mesh.position.y <= 0.05 && particle.velocity.y < 0) {
            particle.mesh.position.y = 0.05;
            if (!particle.bounced) {
                particle.velocity.y = -particle.velocity.y * 0.4; // Bounce with energy loss
                particle.velocity.x *= 0.8; // Friction
                particle.velocity.z *= 0.8; // Friction
                particle.bounced = true;
            } else {
                particle.velocity.y = 0;
                particle.velocity.x *= 0.9; // Sliding friction
                particle.velocity.z *= 0.9; // Sliding friction
            }
        }
        
        // Update rotation
        particle.mesh.rotation.x += particle.rotationVelocity.x * deltaTime;
        particle.mesh.rotation.y += particle.rotationVelocity.y * deltaTime;
        particle.mesh.rotation.z += particle.rotationVelocity.z * deltaTime;
        
        // Slow down rotation over time
        particle.rotationVelocity.multiplyScalar(0.98);
    }
    
    removeParticle(index) {
        const particle = this.particles[index];
        
        // Remove from scene
        this.scene.remove(particle.mesh);
        
        // Dispose of material and geometry
        if (particle.mesh.material) {
            particle.mesh.material.dispose();
        }
        
        // Remove from array
        this.particles.splice(index, 1);
    }
    
    clear() {
        // Remove all particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.removeParticle(i);
        }
    }
    
    dispose() {
        this.clear();
        
        // Dispose of shared geometry
        if (this.particleGeometry) {
            this.particleGeometry.dispose();
        }
    }
}