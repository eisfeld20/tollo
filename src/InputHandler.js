export class InputHandler {
    constructor(game) {
        this.game = game;
        this.player = game.player;
        
        // Key state tracking
        this.keys = {
            w: false, a: false, s: false, d: false,
            space: false, shift: false,
            '1': false, '2': false, '3': false, '4': false, '5': false
        };
        
        // Mouse state
        this.mouseButtons = {
            left: false,
            right: false
        };
        
        // Pointer lock state
        this.isPointerLocked = false;
        
        // Selected block type
        this.selectedBlockType = 1; // Start with grass
        
        this.initEventListeners();
        
        console.log('Input handler initialized');
    }
    
    initEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (event) => this.handleKeyDown(event));
        document.addEventListener('keyup', (event) => this.handleKeyUp(event));
        
        // Mouse events
        document.addEventListener('mousedown', (event) => this.handleMouseDown(event));
        document.addEventListener('mouseup', (event) => this.handleMouseUp(event));
        document.addEventListener('mousemove', (event) => this.handleMouseMove(event));
        
        // Click to start (request pointer lock)
        document.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                this.requestPointerLock();
            }
        });
        
        // Pointer lock events
        document.addEventListener('pointerlockchange', () => this.handlePointerLockChange());
        document.addEventListener('pointerlockerror', () => this.handlePointerLockError());
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (event) => event.preventDefault());
        
        // Handle inventory selection
        this.initInventoryHandlers();
    }
    
    initInventoryHandlers() {
        // Keyboard number keys for block selection
        for (let i = 1; i <= 5; i++) {
            document.addEventListener('keydown', (event) => {
                if (event.code === `Digit${i}`) {
                    this.selectBlock(i);
                }
            });
        }
        
        // Mouse clicks on inventory slots
        const inventorySlots = document.querySelectorAll('.inventory-slot');
        inventorySlots.forEach((slot, index) => {
            slot.addEventListener('click', (event) => {
                event.stopPropagation();
                this.selectBlock(index + 1);
            });
        });
    }
    
    handleKeyDown(event) {
        const key = event.code.toLowerCase();
        
        switch (key) {
            case 'keyw':
                this.keys.w = true;
                break;
            case 'keya':
                this.keys.a = true;
                break;
            case 'keys':
                this.keys.s = true;
                break;
            case 'keyd':
                this.keys.d = true;
                break;
            case 'space':
                this.keys.space = true;
                event.preventDefault();
                break;
            case 'shiftleft':
            case 'shiftright':
                this.keys.shift = true;
                break;
            case 'escape':
                this.game.togglePause();
                break;
        }
        
        this.updatePlayerInput();
    }
    
    handleKeyUp(event) {
        const key = event.code.toLowerCase();
        
        switch (key) {
            case 'keyw':
                this.keys.w = false;
                break;
            case 'keya':
                this.keys.a = false;
                break;
            case 'keys':
                this.keys.s = false;
                break;
            case 'keyd':
                this.keys.d = false;
                break;
            case 'space':
                this.keys.space = false;
                break;
            case 'shiftleft':
            case 'shiftright':
                this.keys.shift = false;
                break;
        }
        
        this.updatePlayerInput();
    }
    
    handleMouseDown(event) {
        if (!this.isPointerLocked) return;
        
        switch (event.button) {
            case 0: // Left click - break block
                this.mouseButtons.left = true;
                this.handleBlockBreak();
                break;
            case 2: // Right click - place block
                this.mouseButtons.right = true;
                this.handleBlockPlace();
                break;
        }
    }
    
    handleMouseUp(event) {
        switch (event.button) {
            case 0:
                this.mouseButtons.left = false;
                break;
            case 2:
                this.mouseButtons.right = false;
                break;
        }
    }
    
    handleMouseMove(event) {
        if (!this.isPointerLocked) return;
        
        const deltaX = event.movementX;
        const deltaY = event.movementY;
        
        this.player.handleMouseMovement(deltaX, deltaY);
    }
    
    updatePlayerInput() {
        // Calculate input vector
        let x = 0, y = 0;
        
        if (this.keys.a) x -= 1; // Left
        if (this.keys.d) x += 1; // Right
        if (this.keys.w) y += 1; // Forward
        if (this.keys.s) y -= 1; // Backward
        
        this.player.setInputVector(x, y);
        this.player.setJumping(this.keys.space);
        this.player.setRunning(false); // Can add Ctrl key for running later
        this.player.setSneaking(this.keys.shift);
    }
    
    handleBlockBreak() {
        const raycast = this.game.raycastBlocks();
        if (raycast && raycast.distance <= 5) {
            const pos = raycast.position;
            this.game.breakBlock(pos);
            console.log(`Broke block at ${pos.x}, ${pos.y}, ${pos.z}`);
        }
    }
    
    handleBlockPlace() {
        const raycast = this.game.raycastBlocks();
        if (raycast && raycast.distance <= 5) {
            // Calculate position to place block (adjacent to clicked face)
            const pos = raycast.position;
            const normal = raycast.normal;
            
            const placePos = {
                x: pos.x + Math.round(normal.x),
                y: pos.y + Math.round(normal.y),
                z: pos.z + Math.round(normal.z)
            };
            
            // Don't place block where player is standing
            const playerPos = this.player.position;
            const playerBlock = {
                x: Math.floor(playerPos.x),
                y: Math.floor(playerPos.y),
                z: Math.floor(playerPos.z)
            };
            
            if (placePos.x === playerBlock.x && 
                (placePos.y === playerBlock.y || placePos.y === playerBlock.y + 1) && 
                placePos.z === playerBlock.z) {
                return; // Don't place block where player is
            }
            
            this.game.placeBlock(placePos, this.selectedBlockType);
            console.log(`Placed block type ${this.selectedBlockType} at ${placePos.x}, ${placePos.y}, ${placePos.z}`);
        }
    }
    
    selectBlock(slotNumber) {
        // Map slot numbers to block types
        const blockTypes = [null, 1, 2, 3, 4, 7]; // [null, grass, dirt, stone, wood, sand]
        
        if (slotNumber >= 1 && slotNumber <= 5) {
            this.selectedBlockType = blockTypes[slotNumber];
            
            // Update UI
            const slots = document.querySelectorAll('.inventory-slot');
            slots.forEach((slot, index) => {
                if (index === slotNumber - 1) {
                    slot.classList.add('active');
                } else {
                    slot.classList.remove('active');
                }
            });
            
            console.log(`Selected block type: ${this.selectedBlockType}`);
        }
    }
    
    requestPointerLock() {
        const canvas = this.game.canvas;
        
        if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
        } else if (canvas.mozRequestPointerLock) {
            canvas.mozRequestPointerLock();
        } else if (canvas.webkitRequestPointerLock) {
            canvas.webkitRequestPointerLock();
        }
    }
    
    handlePointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === this.game.canvas ||
                              document.mozPointerLockElement === this.game.canvas ||
                              document.webkitPointerLockElement === this.game.canvas;
        
        if (this.isPointerLocked) {
            console.log('Pointer locked');
            document.getElementById('instructions').style.display = 'none';
        } else {
            console.log('Pointer unlocked');
            document.getElementById('instructions').style.display = 'block';
        }
    }
    
    handlePointerLockError() {
        console.error('Pointer lock failed');
    }
    
    setPointerLock(locked) {
        if (locked && !this.isPointerLocked) {
            this.requestPointerLock();
        } else if (!locked && this.isPointerLocked) {
            document.exitPointerLock();
        }
    }
}