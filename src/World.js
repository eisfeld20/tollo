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
        
        // Biome settings
        this.biomes = {
            PLAINS: { id: 0, name: 'Plains', temperature: 0.7, humidity: 0.4 },
            FOREST: { id: 1, name: 'Forest', temperature: 0.6, humidity: 0.8 },
            DESERT: { id: 2, name: 'Desert', temperature: 0.9, humidity: 0.1 },
            MOUNTAINS: { id: 3, name: 'Mountains', temperature: 0.3, humidity: 0.5 },
            OCEAN: { id: 4, name: 'Ocean', temperature: 0.5, humidity: 1.0 }
        };
        
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
                const biome = this.getBiome(worldX, worldZ);
                const height = this.generateHeight(worldX, worldZ, biome);
                
                // Place blocks from bottom to height
                this.generateTerrain(worldX, worldZ, height, biome, chunk, x, z);
                
                // Add trees occasionally based on biome
                if (height > this.seaLevel && this.shouldGenerateTree(biome, worldX, worldZ)) {
                    this.generateTree(worldX, height + 1, worldZ, biome);
                }
            }
        }
        
        // Build chunk mesh
        chunk.buildMesh(this);
        
        // Add chunk to scene
        if (this.scene) {
            this.scene.add(chunk.mesh);
        }
        
        this.chunks.set(chunkKey, chunk);
        console.log(`Generated chunk ${chunkKey}`);
    }
    
    getBiome(x, z) {
        // Use noise to determine biome
        const temperatureScale = 0.003;
        const humidityScale = 0.005;
        
        const temperature = (this.noiseGenerator.noise2D(x * temperatureScale, z * temperatureScale) + 1) / 2;
        const humidity = (this.noiseGenerator.noise2D(x * humidityScale + 1000, z * humidityScale + 1000) + 1) / 2;
        
        // Determine biome based on temperature and humidity
        if (temperature > 0.8 && humidity < 0.3) {
            return this.biomes.DESERT;
        } else if (temperature < 0.4) {
            return this.biomes.MOUNTAINS;
        } else if (humidity > 0.7 && temperature > 0.5) {
            return this.biomes.FOREST;
        } else {
            return this.biomes.PLAINS;
        }
    }
    
    generateHeight(x, z, biome) {
        // Use multiple octaves of noise for realistic terrain
        const scale1 = 0.01;
        const scale2 = 0.05;
        const scale3 = 0.1;
        
        const noise1 = this.noiseGenerator.noise2D(x * scale1, z * scale1) * 30;
        const noise2 = this.noiseGenerator.noise2D(x * scale2, z * scale2) * 15;
        const noise3 = this.noiseGenerator.noise2D(x * scale3, z * scale3) * 5;
        
        let height = this.seaLevel + noise1 + noise2 + noise3;
        
        // Modify height based on biome
        switch (biome.id) {
            case this.biomes.MOUNTAINS.id:
                height += 20; // Mountains are higher
                break;
            case this.biomes.DESERT.id:
                height -= 5; // Deserts are slightly lower
                break;
            case this.biomes.OCEAN.id:
                height = this.seaLevel - 10; // Ocean floor
                break;
        }
        
        return Math.floor(Math.max(this.minHeight, Math.min(this.maxHeight, height)));
    }
    
    generateTerrain(worldX, worldZ, height, biome, chunk, x, z) {
        for (let y = 0; y <= height; y++) {
            let blockType;
            
            // Generate blocks based on biome and height
            if (biome.id === this.biomes.DESERT.id) {
                // Desert biome
                if (y === height && height > this.seaLevel) {
                    blockType = BlockType.SAND;
                } else if (y >= height - 5 && height > this.seaLevel) {
                    blockType = BlockType.SAND;
                } else {
                    blockType = BlockType.STONE;
                }
            } else if (biome.id === this.biomes.MOUNTAINS.id) {
                // Mountain biome
                if (y === height && height > this.seaLevel + 20) {
                    blockType = BlockType.STONE; // Rocky peaks
                } else if (y === height && height > this.seaLevel) {
                    blockType = BlockType.GRASS;
                } else if (y >= height - 2 && height > this.seaLevel) {
                    blockType = BlockType.DIRT;
                } else {
                    blockType = BlockType.STONE;
                }
            } else {
                // Plains and Forest biomes
                if (y === height && height > this.seaLevel) {
                    blockType = BlockType.GRASS;
                } else if (y >= height - 3 && height > this.seaLevel) {
                    blockType = BlockType.DIRT;
                } else if (y >= height - 8) {
                    blockType = BlockType.STONE;
                } else {
                    blockType = BlockType.STONE;
                }
            }
            
            this.setBlockInChunk(chunk, x, y, z, blockType);
        }
    }
    
    shouldGenerateTree(biome, x, z) {
        // Tree generation chance based on biome
        let chance = 0;
        
        switch (biome.id) {
            case this.biomes.FOREST.id:
                chance = 0.08; // 8% chance in forests
                break;
            case this.biomes.PLAINS.id:
                chance = 0.01; // 1% chance in plains
                break;
            case this.biomes.MOUNTAINS.id:
                chance = 0.005; // 0.5% chance in mountains
                break;
            case this.biomes.DESERT.id:
            default:
                chance = 0; // No trees in desert
                break;
        }
        
        return Math.random() < chance;
    }
    
    generateTree(x, y, z, biome = null) {
        const treeHeight = 4 + Math.floor(Math.random() * 3);
        
        // Different tree types based on biome
        let woodType = BlockType.WOOD;
        let leavesType = BlockType.LEAVES;
        
        if (biome && biome.id === this.biomes.MOUNTAINS.id) {
            // Shorter, sparser trees in mountains
            if (Math.random() < 0.3) return; // 30% chance trees don't grow fully
        }
        
        // Generate trunk
        for (let i = 0; i < treeHeight; i++) {
            this.setBlock(x, y + i, z, woodType);
        }
        
        // Generate leaves
        const leavesY = y + treeHeight - 1;
        const leavesSize = biome && biome.id === this.biomes.FOREST.id ? 3 : 2;
        
        for (let dx = -leavesSize; dx <= leavesSize; dx++) {
            for (let dz = -leavesSize; dz <= leavesSize; dz++) {
                for (let dy = 0; dy <= 2; dy++) {
                    if (dx === 0 && dz === 0 && dy === 0) continue; // Skip center (trunk)
                    
                    const distance = Math.abs(dx) + Math.abs(dz) + Math.abs(dy);
                    const maxDistance = biome && biome.id === this.biomes.FOREST.id ? 4 : 3;
                    
                    if (distance <= maxDistance && Math.random() < 0.8) {
                        this.setBlock(x + dx, leavesY + dy, z + dz, leavesType);
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
        chunk.buildMesh(this);
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
    
    clear() {
        // Unload all chunks
        const chunkKeys = Array.from(this.chunks.keys());
        chunkKeys.forEach(chunkKey => {
            this.unloadChunk(chunkKey);
        });
        
        // Clear blocks map
        this.blocks.clear();
        
        console.log('World cleared');
    }
}