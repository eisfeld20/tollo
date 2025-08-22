import * as THREE from 'three';
import { Block, BlockType } from './Block.js';

export class Chunk {
    constructor(x, z, size = 16) {
        this.x = x;
        this.z = z;
        this.size = size;
        this.height = 128;
        
        // 3D array to store blocks [x][y][z]
        this.blocks = [];
        for (let x = 0; x < this.size; x++) {
            this.blocks[x] = [];
            for (let y = 0; y < this.height; y++) {
                this.blocks[x][y] = [];
                for (let z = 0; z < this.size; z++) {
                    this.blocks[x][y][z] = null;
                }
            }
        }
        
        this.mesh = null;
        this.needsUpdate = true;
    }
    
    setBlock(x, y, z, block) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
            return;
        }
        
        this.blocks[x][y][z] = block;
        this.needsUpdate = true;
    }
    
    getBlock(x, y, z) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.height || z < 0 || z >= this.size) {
            return null;
        }
        
        return this.blocks[x][y][z];
    }
    
    buildMesh() {
        // Dispose of existing mesh
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(material => material.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
        }
        
        // Create geometry using BufferGeometry for better performance
        const positions = [];
        const normals = [];
        const colors = [];
        const indices = [];
        let vertexCount = 0;
        
        // Iterate through all blocks in chunk
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let z = 0; z < this.size; z++) {
                    const block = this.blocks[x][y][z];
                    if (!block || block.type === BlockType.AIR) continue;
                    
                    // Check each face to see if it should be rendered
                    const worldX = this.x * this.size + x;
                    const worldZ = this.z * this.size + z;
                    
                    this.addBlockFaces(
                        worldX, y, worldZ, block,
                        positions, normals, colors, indices, vertexCount
                    );
                    
                    vertexCount = positions.length / 3;
                }
            }
        }
        
        if (positions.length === 0) {
            this.mesh = null;
            return;
        }
        
        // Create geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);
        
        // Create material
        const material = new THREE.MeshLambertMaterial({
            vertexColors: true,
            side: THREE.FrontSide
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        this.needsUpdate = false;
    }
    
    addBlockFaces(worldX, worldY, worldZ, block, positions, normals, colors, indices, startVertex) {
        const x = worldX;
        const y = worldY;
        const z = worldZ;
        
        // Define faces: [normal, vertices relative to block position]
        const faces = [
            // Right face (+X)
            {
                normal: [1, 0, 0],
                vertices: [
                    [1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]
                ],
                check: [x + 1, y, z]
            },
            // Left face (-X)
            {
                normal: [-1, 0, 0],
                vertices: [
                    [0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]
                ],
                check: [x - 1, y, z]
            },
            // Top face (+Y)
            {
                normal: [0, 1, 0],
                vertices: [
                    [0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]
                ],
                check: [x, y + 1, z],
                face: 'top'
            },
            // Bottom face (-Y)
            {
                normal: [0, -1, 0],
                vertices: [
                    [0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]
                ],
                check: [x, y - 1, z],
                face: 'bottom'
            },
            // Front face (+Z)
            {
                normal: [0, 0, 1],
                vertices: [
                    [0, 0, 1], [0, 1, 1], [1, 1, 1], [1, 0, 1]
                ],
                check: [x, y, z + 1]
            },
            // Back face (-Z)
            {
                normal: [0, 0, -1],
                vertices: [
                    [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]
                ],
                check: [x, y, z - 1]
            }
        ];
        
        faces.forEach(faceData => {
            // Check if this face should be rendered (not adjacent to solid block)
            if (!this.shouldRenderFace(faceData.check[0], faceData.check[1], faceData.check[2])) {
                return;
            }
            
            // Get color for this face
            const color = new THREE.Color(Block.getBlockColor(block.type, faceData.face));
            
            // Add vertices
            const faceStartVertex = positions.length / 3;
            faceData.vertices.forEach(vertex => {
                positions.push(x + vertex[0], y + vertex[1], z + vertex[2]);
                normals.push(...faceData.normal);
                colors.push(color.r, color.g, color.b);
            });
            
            // Add indices for two triangles (quad)
            indices.push(
                faceStartVertex, faceStartVertex + 1, faceStartVertex + 2,
                faceStartVertex, faceStartVertex + 2, faceStartVertex + 3
            );
        });
    }
    
    shouldRenderFace(x, y, z) {
        // Check if there's a solid block at the given world coordinates
        // If there is, don't render this face (it's hidden)
        
        // For now, render all faces (simple implementation)
        // In a full implementation, you'd check adjacent chunks too
        if (y < 0 || y >= this.height) return true;
        
        // Convert world coordinates to local coordinates
        const localX = x - (this.x * this.size);
        const localZ = z - (this.z * this.size);
        
        // If coordinates are outside this chunk, assume air (render face)
        if (localX < 0 || localX >= this.size || localZ < 0 || localZ >= this.size) {
            return true;
        }
        
        const adjacentBlock = this.blocks[localX][y][localZ];
        return !adjacentBlock || adjacentBlock.type === BlockType.AIR;
    }
    
    dispose() {
        if (this.mesh) {
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(material => material.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
        }
        
        // Dispose of all blocks
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let z = 0; z < this.size; z++) {
                    if (this.blocks[x][y][z]) {
                        this.blocks[x][y][z].destroy();
                    }
                }
            }
        }
        
        this.blocks = null;
        this.mesh = null;
    }
}