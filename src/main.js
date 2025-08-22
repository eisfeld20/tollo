import * as THREE from 'three';
import { Game } from './Game.js';

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const loadingElement = document.getElementById('loading');
    
    try {
        // Create and start the game
        const game = new Game(canvas);
        
        // Hide loading screen
        loadingElement.style.display = 'none';
        
        // Handle window resize
        window.addEventListener('resize', () => {
            game.handleResize();
        });
        
        // Handle visibility change (pause when tab is hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                game.pause();
            } else {
                game.resume();
            }
        });
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        loadingElement.textContent = 'Failed to load game. Please check console for errors.';
        loadingElement.style.color = 'red';
    }
});