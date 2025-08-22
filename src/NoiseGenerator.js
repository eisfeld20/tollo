// Simple noise generator for terrain generation
// Based on improved Perlin noise algorithm

export class NoiseGenerator {
    constructor(seed = 12345) {
        this.seed = seed;
        this.permutation = this.generatePermutation();
    }
    
    generatePermutation() {
        // Create permutation table
        const p = [];
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }
        
        // Shuffle the array using seed
        let rng = this.seed;
        for (let i = 255; i > 0; i--) {
            rng = (rng * 16807) % 2147483647;
            const j = rng % (i + 1);
            [p[i], p[j]] = [p[j], p[i]];
        }
        
        // Extend the permutation table
        const extended = [];
        for (let i = 0; i < 512; i++) {
            extended[i] = p[i % 256];
        }
        
        return extended;
    }
    
    fade(t) {
        // Improved fade function: 6t^5 - 15t^4 + 10t^3
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    grad(hash, x, y) {
        // Convert hash to gradient vector
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    noise2D(x, y) {
        // Find unit square containing point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        // Get relative position within square
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        // Compute fade curves
        const u = this.fade(x);
        const v = this.fade(y);
        
        // Hash coordinates of 4 square corners
        const A = this.permutation[X] + Y;
        const AA = this.permutation[A];
        const AB = this.permutation[A + 1];
        const B = this.permutation[X + 1] + Y;
        const BA = this.permutation[B];
        const BB = this.permutation[B + 1];
        
        // Blend results from 4 corners
        return this.lerp(
            this.lerp(
                this.grad(this.permutation[AA], x, y),
                this.grad(this.permutation[BA], x - 1, y),
                u
            ),
            this.lerp(
                this.grad(this.permutation[AB], x, y - 1),
                this.grad(this.permutation[BB], x - 1, y - 1),
                u
            ),
            v
        );
    }
    
    // Fractal noise (multiple octaves)
    fractalNoise2D(x, y, octaves = 4, persistence = 0.5) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += this.noise2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return value / maxValue;
    }
}