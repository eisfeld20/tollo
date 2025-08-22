import * as THREE from 'three';
import { Block, BlockType } from './Block.js';
import { Chunk } from './Chunk.js';
import { NoiseGenerator } from './NoiseGenerator.js';

export class World {
    constructor() {
        this.chunks = new Map(); // Map of chunk coordinates to Chunk objects
        this.blocks = new Map(); // Map of block coordinates to Block objects
        this.scene = null; // Will be set by Game class
        
        this.chunkSize = 16;
        this.chunkHeight = 128;
        this.renderDistance = 8; // Chunks to render around player
        
        this.noiseGenerator = new NoiseGenerator();
        
        // Terrain generation settings
        this.seaLevel = 32;
        this.maxHeight = 80;
        this.minHeight = 5;
        
        console.log('World initialized');
    }
    
    setScene(scene) {
        this.scene = scene;
    }
    
    update(playerPosition) {
        // Update chunks based on player position
        this.updateChunks(playerPosition);
    }
    
    updateChunks(playerPosition) {
        const playerChunkX = Math.floor(playerPosition.x / this.chunkSize);
        const playerChunkZ = Math.floor(playerPosition.z / this.chunkSize);
        
        // Generate chunks around player
        for (let x = playerChunkX - this.renderDistance; x <= playerChunkX + this.renderDistance; x++) {
            for (let z = playerChunkZ - this.renderDistance; z <= playerChunkZ + this.renderDistance; z++) {
                const chunkKey = `${x},${z}`;
                
                if (!this.chunks.has(chunkKey)) {
                    this.generateChunk(x, z);
                }
            }
        }
        
        // Unload distant chunks
        const chunksToRemove = [];
        for (let [chunkKey, chunk] of this.chunks) {
            const [x, z] = chunkKey.split(',').map(Number);
            const distance = Math.max(Math.abs(x - playerChunkX), Math.abs(z - playerChunkZ));
            
            if (distance > this.renderDistance + 2) {
                chunksToRemove.push(chunkKey);
            }
        }
        
        chunksToRemove.forEach(chunkKey => {
            this.unloadChunk(chunkKey);
        });
    }
    
    generateChunk(chunkX, chunkZ) {
        const chunk = new Chunk(chunkX, chunkZ, this.chunkSize);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Generate terrain for this chunk
        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const worldX = chunkX * this.chunkSize + x;
                const worldZ = chunkZ * this.chunkSize + z;
                
                // Generate height using noise
                const height = this.generateHeight(worldX, worldZ);
                
                // Place blocks from bottom to height
                for (let y = 0; y <= height; y++) {
                    let blockType;
                    
                    if (y === height && height > this.seaLevel) {
                        blockType = BlockType.GRASS;
                    } else if (y >= height - 3 && height > this.seaLevel) {
                        blockType = BlockType.DIRT;
                    } else if (y >= height - 8) {
                        blockType = BlockType.STONE;
                    } else {
                        blockType = BlockType.STONE;
                    }
                    
                    this.setBlockInChunk(chunk, x, y, z, blockType);
                }
                
                // Add trees occasionally
                if (height > this.seaLevel && Math.random() < 0.02) {
                    this.generateTree(worldX, height + 1, worldZ);
                }
            }
        }
        
        // Build chunk mesh
        chunk.buildMesh();
        
        // Add chunk to scene
        if (this.scene) {
            this.scene.add(chunk.mesh);
        }
        
        this.chunks.set(chunkKey, chunk);
        console.log(`Generated chunk ${chunkKey}`);
    }
    
    generateHeight(x, z) {
        // Use multiple octaves of noise for realistic terrain
        const scale1 = 0.01;
        const scale2 = 0.05;
        const scale3 = 0.1;
        
        const noise1 = this.noiseGenerator.noise2D(x * scale1, z * scale1) * 30;
        const noise2 = this.noiseGenerator.noise2D(x * scale2, z * scale2) * 15;
        const noise3 = this.noiseGenerator.noise2D(x * scale3, z * scale3) * 5;
        
        const height = this.seaLevel + noise1 + noise2 + noise3;
        
        return Math.floor(Math.max(this.minHeight, Math.min(this.maxHeight, height)));
    }
    
    generateTree(x, y, z) {
        const treeHeight = 4 + Math.floor(Math.random() * 3);
        
        // Generate trunk
        for (let i = 0; i < treeHeight; i++) {
            this.setBlock(x, y + i, z, BlockType.WOOD);
        }
        
        // Generate leaves
        const leavesY = y + treeHeight - 1;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                for (let dy = 0; dy <= 2; dy++) {
                    if (dx === 0 && dz === 0 && dy === 0) continue; // Skip center (trunk)
                    
                    const distance = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
                    if (distance <= 3 && Math.random() < 0.8) {
                        this.setBlock(x + dx, leavesY + dy, z + dz, BlockType.LEAVES);
                    }
                }
            }
        }
    }
    
    setBlockInChunk(chunk, x, y, z, blockType) {
        if (y < 0 || y >= this.chunkHeight) return;
        
        const block = new Block(blockType, x, y, z);
        chunk.setBlock(x, y, z, block);
    }
    
    unloadChunk(chunkKey) {
        const chunk = this.chunks.get(chunkKey);
        if (chunk) {
            // Remove from scene
            if (this.scene && chunk.mesh) {
                this.scene.remove(chunk.mesh);
            }
            
            // Dispose of chunk resources
            chunk.dispose();
            
            // Remove from chunks map
            this.chunks.delete(chunkKey);
            
            console.log(`Unloaded chunk ${chunkKey}`);
        }
    }
    
    getBlock(x, y, z) {
        if (y < 0 || y >= this.chunkHeight) return null;
        
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        const chunk = this.chunks.get(chunkKey);
        if (!chunk) return null;
        
        const localX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const localZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;
        
        return chunk.getBlock(localX, y, localZ);
    }
    
    setBlock(x, y, z, blockType) {
        if (y < 0 || y >= this.chunkHeight) return false;
        
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        const chunk = this.chunks.get(chunkKey);
        if (!chunk) return false;
        
        const localX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const localZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;
        
        // Remove existing block
        const existingBlock = chunk.getBlock(localX, y, localZ);
        if (existingBlock) {
            existingBlock.destroy();
        }
        
        // Set new block
        if (blockType !== null && blockType !== BlockType.AIR) {
            const block = new Block(blockType, x, y, z);
            chunk.setBlock(localX, y, localZ, block);
        } else {
            chunk.setBlock(localX, y, localZ, null);
        }
        
        // Rebuild chunk mesh
        chunk.buildMesh();
        if (this.scene) {
            if (chunk.mesh) {
                this.scene.remove(chunk.mesh);
            }
            if (chunk.mesh) {
                this.scene.add(chunk.mesh);
            }
        }
        
        return true;
    }
    
    isBlockSolid(x, y, z) {
        const block = this.getBlock(x, y, z);
        return block ? Block.isBlockSolid(block.type) : false;
    }
    
    getChunkCount() {
        return this.chunks.size;
    }
}