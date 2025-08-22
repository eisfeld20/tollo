export class UI {
    constructor(game) {
        this.game = game;
        
        // UI elements
        this.fpsElement = document.getElementById('fps');
        this.positionElement = document.getElementById('position');
        this.chunksElement = document.getElementById('chunks');
        
        // Update interval
        this.updateInterval = 100; // Update every 100ms
        this.lastUpdate = 0;
        
        console.log('UI initialized');
    }
    
    update() {
        const now = performance.now();
        
        if (now - this.lastUpdate >= this.updateInterval) {
            this.updateFPS();
            this.updatePosition();
            this.updateChunks();
            
            this.lastUpdate = now;
        }
    }
    
    updateFPS() {
        if (this.fpsElement) {
            this.fpsElement.textContent = this.game.stats.fps.toString();
        }
    }
    
    updatePosition() {
        if (this.positionElement) {
            const pos = this.game.player.position;
            this.positionElement.textContent = 
                `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
        }
    }
    
    updateChunks() {
        if (this.chunksElement) {
            this.chunksElement.textContent = this.game.world.getChunkCount().toString();
        }
    }
    
    showMessage(message, duration = 3000) {
        // Create temporary message element
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-size: 18px;
            z-index: 1000;
            pointer-events: none;
        `;
        messageElement.textContent = message;
        
        document.body.appendChild(messageElement);
        
        // Remove after duration
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, duration);
    }
}