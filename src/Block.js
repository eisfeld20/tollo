import * as THREE from 'three';

export const BlockType = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5,
    WATER: 6,
    SAND: 7
};

export const BlockData = {
    [BlockType.AIR]: {
        name: 'Air',
        solid: false,
        transparent: true,
        color: 0x000000
    },
    [BlockType.GRASS]: {
        name: 'Grass',
        solid: true,
        transparent: false,
        color: 0x7CB342,
        sideColor: 0x8BC34A,
        bottomColor: 0x8D6E63
    },
    [BlockType.DIRT]: {
        name: 'Dirt',
        solid: true,
        transparent: false,
        color: 0x8D6E63
    },
    [BlockType.STONE]: {
        name: 'Stone',
        solid: true,
        transparent: false,
        color: 0x757575
    },
    [BlockType.WOOD]: {
        name: 'Wood',
        solid: true,
        transparent: false,
        color: 0x8D6E63,
        topColor: 0x6D4C41,
        bottomColor: 0x6D4C41
    },
    [BlockType.LEAVES]: {
        name: 'Leaves',
        solid: true,
        transparent: false,
        color: 0x4CAF50
    },
    [BlockType.WATER]: {
        name: 'Water',
        solid: false,
        transparent: true,
        color: 0x2196F3
    },
    [BlockType.SAND]: {
        name: 'Sand',
        solid: true,
        transparent: false,
        color: 0xF4E99B
    }
};

export class Block {
    constructor(type, x, y, z) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.z = z;
        this.data = BlockData[type];
        this.mesh = null;
    }
    
    static getBlockName(type) {
        return BlockData[type]?.name || 'Unknown';
    }
    
    static isBlockSolid(type) {
        return BlockData[type]?.solid || false;
    }
    
    static isBlockTransparent(type) {
        return BlockData[type]?.transparent || false;
    }
    
    static getBlockColor(type, face = 'main') {
        const data = BlockData[type];
        if (!data) return 0x000000;
        
        switch (face) {
            case 'top':
                return data.topColor || data.color;
            case 'bottom':
                return data.bottomColor || data.color;
            case 'side':
                return data.sideColor || data.color;
            default:
                return data.color;
        }
    }
    
    createMesh() {
        if (this.type === BlockType.AIR) return null;
        
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Create materials for different faces
        const materials = this.createMaterials();
        
        this.mesh = new THREE.Mesh(geometry, materials);
        this.mesh.position.set(this.x + 0.5, this.y + 0.5, this.z + 0.5);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Store block position in userData for raycasting
        this.mesh.userData.blockPosition = { x: this.x, y: this.y, z: this.z };
        this.mesh.userData.blockType = this.type;
        
        return this.mesh;
    }
    
    createMaterials() {
        const data = this.data;
        
        if (this.type === BlockType.GRASS) {
            // Grass block has different colors for top, sides, and bottom
            return [
                new THREE.MeshLambertMaterial({ color: data.sideColor }), // Right
                new THREE.MeshLambertMaterial({ color: data.sideColor }), // Left
                new THREE.MeshLambertMaterial({ color: data.color }),     // Top
                new THREE.MeshLambertMaterial({ color: data.bottomColor }), // Bottom
                new THREE.MeshLambertMaterial({ color: data.sideColor }), // Front
                new THREE.MeshLambertMaterial({ color: data.sideColor })  // Back
            ];
        } else if (this.type === BlockType.WOOD) {
            // Wood has different colors for top/bottom (rings) and sides (bark)
            return [
                new THREE.MeshLambertMaterial({ color: data.color }),     // Right
                new THREE.MeshLambertMaterial({ color: data.color }),     // Left
                new THREE.MeshLambertMaterial({ color: data.topColor }),  // Top
                new THREE.MeshLambertMaterial({ color: data.bottomColor }), // Bottom
                new THREE.MeshLambertMaterial({ color: data.color }),     // Front
                new THREE.MeshLambertMaterial({ color: data.color })      // Back
            ];
        } else {
            // Standard block with same material on all faces
            const material = new THREE.MeshLambertMaterial({ 
                color: data.color,
                transparent: data.transparent,
                opacity: data.transparent ? 0.8 : 1.0
            });
            
            return material;
        }
    }
    
    destroy() {
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(material => material.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            this.mesh = null;
        }
    }
}