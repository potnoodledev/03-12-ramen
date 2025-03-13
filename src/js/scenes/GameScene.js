import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        
        // Game state
        this.gameState = {
            PULLING_DOUGH: 0,
            ROTATING_DOUGH: 1,
            MOVING_TO_FINISH: 2
        };
        
        this.currentState = this.gameState.PULLING_DOUGH;
        this.rolledDoughCount = 0;
        this.rotationProgress = 0;
        this.maxRotationProgress = 100;
        this.rotationSpeed = 0.5;
        this.lastPointerAngle = 0;
        
        // Gesture sensitivity settings
        this.pullSensitivity = 1.5;    // Higher = more responsive to downward gestures
        this.rotateSensitivity = 0.7;  // Higher = faster rotation progress
        this.moveSensitivity = 1.5;    // Higher = more responsive to rightward gestures
        
        // State names for debugging
        this.stateNames = [
            'PULLING_DOUGH',
            'ROTATING_DOUGH',
            'MOVING_TO_FINISH'
        ];
    }

    create() {
        console.log('GameScene started');
        this.createBackground();
        this.createDough();
        this.createProgressBar();
        this.createCounterDisplay();
        this.createDebugInfo();
        this.createHelperButton();
        this.createGestureIndicator();
        this.setupInput();
        
        // Add initial instruction text
        const width = this.cameras.main.width;
        this.instructionText = this.add.text(width / 2, this.doughCenterY + 150, 'Drag DOWN anywhere to pull dough!', {
            font: '24px Arial',
            fill: '#000000'
        }).setOrigin(0.5);
        
        // Add subtitle instruction
        this.subtitleText = this.add.text(width / 2, this.doughCenterY + 180, '(You can drag anywhere on screen)', {
            font: '18px Arial',
            fill: '#555555'
        }).setOrigin(0.5);
    }

    createBackground() {
        // Simple background
        this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0xf8f8f8)
            .setOrigin(0, 0);
    }

    createDough() {
        const centerX = this.cameras.main.width / 2;
        
        // Create dough sprite
        this.dough = this.add.sprite(centerX, -50, 'dough');
        
        // Check if the texture exists and log information
        if (this.textures.exists('dough')) {
            console.log('Dough texture loaded successfully');
            const frame = this.textures.getFrame('dough');
            console.log('Dough texture dimensions:', frame.width, 'x', frame.height);
        } else {
            console.error('Dough texture not found!');
            // Create a fallback circle if texture is missing
            this.dough = this.add.circle(centerX, -50, 80, 0xf5e6c8);
            this.dough.setStrokeStyle(4, 0xe6d2a8);
        }
        
        this.dough.setScale(1);
        
        // Initial position - half visible at top
        this.dough.y = -this.dough.displayHeight / 2 + 50;
        
        // Set initial dough state
        this.doughStartY = this.dough.y;
        this.doughCenterY = this.cameras.main.height / 3;
        this.doughEndX = this.cameras.main.width + this.dough.displayWidth / 2;
        
        // Add a visual indicator for the center position (for debugging)
        this.centerLine = this.add.graphics();
        this.centerLine.lineStyle(2, 0xff0000, 0.5);
        this.centerLine.lineBetween(0, this.doughCenterY, this.cameras.main.width, this.doughCenterY);
        
        console.log('Dough created at position:', this.dough.x, this.dough.y);
        console.log('Dough center Y position:', this.doughCenterY);
    }

    createProgressBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Progress bar container
        if (this.textures.exists('progressBarBg')) {
            this.progressBarContainer = this.add.sprite(width / 2, height - 50, 'progressBarBg');
            this.progressBarContainer.setDisplaySize(300, 40);
            
            // Progress bar fill - starts with width 0
            this.progressBarFill = this.add.sprite(width / 2 - 150, height - 50, 'progressBarFill');
            this.progressBarFill.setOrigin(0, 0.5);
            this.progressBarFill.setDisplaySize(0, 40);
        } else {
            console.error('Progress bar textures not found!');
            // Create fallback graphics
            this.progressBarContainer = this.add.rectangle(width / 2, height - 50, 300, 40, 0xdddddd);
            this.progressBarContainer.setStrokeStyle(2, 0xbbbbbb);
            
            this.progressBarFill = this.add.rectangle(width / 2 - 150, height - 50, 0, 40, 0xf8d568);
            this.progressBarFill.setOrigin(0, 0.5);
            this.progressBarFill.setStrokeStyle(2, 0xe8c558);
        }
        
        // Progress text
        this.progressText = this.add.text(width / 2, height - 50, '0%', {
            font: '18px Arial',
            fill: '#000000'
        }).setOrigin(0.5);
    }

    createCounterDisplay() {
        const width = this.cameras.main.width;
        
        // Counter background
        this.counterBg = this.add.graphics();
        this.counterBg.fillStyle(0xffffff, 0.8);
        this.counterBg.fillRoundedRect(width - 150, 20, 130, 60, 10);
        this.counterBg.lineStyle(2, 0xcccccc, 1);
        this.counterBg.strokeRoundedRect(width - 150, 20, 130, 60, 10);
        
        // Counter text
        this.counterTitle = this.add.text(width - 85, 35, 'Rolled Dough:', {
            font: '16px Arial',
            fill: '#000000'
        }).setOrigin(0.5);
        
        this.counterValue = this.add.text(width - 85, 60, this.rolledDoughCount.toString(), {
            font: '24px Arial',
            fill: '#000000',
            fontWeight: 'bold'
        }).setOrigin(0.5);
    }
    
    createDebugInfo() {
        // Debug panel background
        this.debugBg = this.add.graphics();
        this.debugBg.fillStyle(0x000000, 0.7);
        this.debugBg.fillRoundedRect(10, 10, 250, 120, 10);
        
        // Debug text
        this.debugTitle = this.add.text(20, 20, 'DEBUG INFO', {
            font: '16px Arial',
            fill: '#ffffff',
            fontWeight: 'bold'
        });
        
        this.stateText = this.add.text(20, 45, `State: ${this.stateNames[this.currentState]}`, {
            font: '14px Arial',
            fill: '#ffffff'
        });
        
        this.positionText = this.add.text(20, 70, `Dough Position: X:${Math.round(this.dough.x)}, Y:${Math.round(this.dough.y)}`, {
            font: '14px Arial',
            fill: '#ffffff'
        });
        
        this.progressDebugText = this.add.text(20, 95, `Progress: ${this.rotationProgress.toFixed(1)}/${this.maxRotationProgress}`, {
            font: '14px Arial',
            fill: '#ffffff'
        });
    }

    createHelperButton() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create a help button
        this.helpButton = this.add.rectangle(width - 80, 80, 120, 50, 0x4a6fa5);
        this.helpButton.setStrokeStyle(3, 0x3a5f95);
        
        this.helpText = this.add.text(width - 80, 80, 'SKIP STEP', {
            font: '18px Arial',
            fill: '#ffffff',
            fontWeight: 'bold'
        }).setOrigin(0.5);
        
        // Make the button interactive
        this.helpButton.setInteractive({ useHandCursor: true });
        
        // Add click event
        this.helpButton.on('pointerdown', () => {
            // Skip to the next state based on current state
            switch (this.currentState) {
                case this.gameState.PULLING_DOUGH:
                    // Move the dough to the center position
                    this.dough.y = this.doughCenterY;
                    this.currentState = this.gameState.ROTATING_DOUGH;
                    console.log('State changed to ROTATING_DOUGH via help button');
                    
                    // Update instruction text
                    if (this.instructionText) {
                        this.instructionText.setText('Make CIRCULAR motions to rotate dough!');
                    }
                    if (this.subtitleText) {
                        this.subtitleText.setText('(Rotate anywhere on screen)');
                    }
                    break;
                    
                case this.gameState.ROTATING_DOUGH:
                    // Complete the rotation
                    this.rotationProgress = this.maxRotationProgress;
                    this.updateProgressBar();
                    this.currentState = this.gameState.MOVING_TO_FINISH;
                    console.log('State changed to MOVING_TO_FINISH via help button');
                    
                    // Update instruction text
                    if (this.instructionText) {
                        this.instructionText.setText('Drag RIGHT to finish the dough!');
                    }
                    if (this.subtitleText) {
                        this.subtitleText.setText('(Swipe right anywhere on screen)');
                    }
                    break;
                    
                case this.gameState.MOVING_TO_FINISH:
                    // Complete the dough
                    this.dough.x = this.doughEndX;
                    this.rolledDoughCount++;
                    console.log('Dough completed via help button! Count:', this.rolledDoughCount);
                    this.updateCounter();
                    this.resetDough();
                    break;
            }
        });
        
        // Add hover effects
        this.helpButton.on('pointerover', () => {
            this.helpButton.fillColor = 0x5a7fb5;
        });
        
        this.helpButton.on('pointerout', () => {
            this.helpButton.fillColor = 0x4a6fa5;
        });
    }

    createGestureIndicator() {
        // Create a graphics object for gesture visualization
        this.gestureGraphics = this.add.graphics();
        
        // Create a trail effect for gestures
        this.gestureTrail = [];
        this.maxTrailPoints = 10;
    }

    setupInput() {
        // Make the entire game area interactive
        this.inputZone = this.add.zone(0, 0, this.cameras.main.width, this.cameras.main.height)
            .setOrigin(0, 0)
            .setInteractive();
        
        // Handle pointer down
        this.input.on('pointerdown', (pointer) => {
            console.log('Pointer down at:', pointer.x, pointer.y);
            this.isDragging = true;
            this.lastPointerPosition = { x: pointer.x, y: pointer.y };
            
            if (this.currentState === this.gameState.ROTATING_DOUGH) {
                this.lastPointerAngle = this.getPointerAngle(pointer);
                console.log('Initial pointer angle:', this.lastPointerAngle.toFixed(2));
            }
        });
        
        // Handle pointer move (drag)
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown && this.isDragging) {
                this.handlePointerMove(pointer);
                this.lastPointerPosition = { x: pointer.x, y: pointer.y };
            }
        });
        
        // Handle pointer up
        this.input.on('pointerup', () => {
            console.log('Pointer up');
            this.isDragging = false;
        });
    }

    handlePointerMove(pointer) {
        // Add point to gesture trail
        this.addGesturePoint(pointer.x, pointer.y);
        
        switch (this.currentState) {
            case this.gameState.PULLING_DOUGH:
                this.handlePullingDough(pointer);
                break;
                
            case this.gameState.ROTATING_DOUGH:
                this.handleRotatingDough(pointer);
                break;
                
            case this.gameState.MOVING_TO_FINISH:
                this.handleMovingToFinish(pointer);
                break;
        }
        
        // Update debug info
        this.updateDebugInfo();
    }

    handlePullingDough(pointer) {
        // Check for downward movement
        if (this.lastPointerPosition && pointer.y > this.lastPointerPosition.y) {
            // Calculate how much to move the dough based on pointer movement
            const dragDistance = pointer.y - this.lastPointerPosition.y;
            
            // Move the dough down proportionally to the drag with sensitivity applied
            this.dough.y += dragDistance * this.pullSensitivity;
            
            // Clamp the dough position between start and center
            this.dough.y = Phaser.Math.Clamp(this.dough.y, this.doughStartY, this.doughCenterY);
            
            // Check if dough reached center position
            if (this.dough.y >= this.doughCenterY) {
                this.dough.y = this.doughCenterY;
                this.currentState = this.gameState.ROTATING_DOUGH;
                console.log('State changed to ROTATING_DOUGH');
                
                // Update instruction text
                const width = this.cameras.main.width;
                if (!this.instructionText) {
                    this.instructionText = this.add.text(width / 2, this.doughCenterY + 150, 'Make CIRCULAR motions to rotate dough!', {
                        font: '24px Arial',
                        fill: '#000000'
                    }).setOrigin(0.5);
                } else {
                    this.instructionText.setText('Make CIRCULAR motions to rotate dough!');
                }
                
                // Update subtitle
                if (!this.subtitleText) {
                    this.subtitleText = this.add.text(width / 2, this.doughCenterY + 180, '(Rotate anywhere on screen)', {
                        font: '18px Arial',
                        fill: '#555555'
                    }).setOrigin(0.5);
                } else {
                    this.subtitleText.setText('(Rotate anywhere on screen)');
                }
            }
        }
    }

    handleRotatingDough(pointer) {
        // Calculate rotation based on circular motion anywhere on screen
        const currentAngle = Math.atan2(
            pointer.y - this.cameras.main.height / 2,
            pointer.x - this.cameras.main.width / 2
        ) * (180 / Math.PI);
        
        const angleDiff = this.getAngleDifference(this.lastPointerAngle, currentAngle);
        
        // Update rotation progress based on angle difference with sensitivity applied
        if (Math.abs(angleDiff) < 30) { // Prevent large jumps
            this.rotationProgress += Math.abs(angleDiff) * this.rotationSpeed * this.rotateSensitivity;
            
            // Rotate the dough sprite
            this.dough.rotation += angleDiff * 0.01;
            
            // Increase dough size slightly with rotation
            const progressPercent = this.rotationProgress / this.maxRotationProgress;
            const newScale = 1 + progressPercent * 0.5;
            this.dough.setScale(newScale);
            
            // Update progress bar
            this.updateProgressBar();
            
            // Check if rotation is complete
            if (this.rotationProgress >= this.maxRotationProgress) {
                this.rotationProgress = this.maxRotationProgress;
                this.currentState = this.gameState.MOVING_TO_FINISH;
                console.log('State changed to MOVING_TO_FINISH');
                
                // Update instruction text
                if (this.instructionText) {
                    this.instructionText.setText('Drag RIGHT to finish the dough!');
                }
                
                // Update subtitle
                if (this.subtitleText) {
                    this.subtitleText.setText('(Swipe right anywhere on screen)');
                }
            }
        }
        
        this.lastPointerAngle = currentAngle;
    }

    handleMovingToFinish(pointer) {
        // Check for rightward movement
        if (this.lastPointerPosition && pointer.x > this.lastPointerPosition.x) {
            // Calculate how much to move the dough based on pointer movement
            const dragDistance = pointer.x - this.lastPointerPosition.x;
            
            // Move the dough right proportionally to the drag with sensitivity applied
            this.dough.x += dragDistance * this.moveSensitivity;
            
            // Check if dough reached the end position
            if (this.dough.x >= this.doughEndX) {
                // Increment counter and reset game state
                this.rolledDoughCount++;
                console.log('Dough completed! Count:', this.rolledDoughCount);
                this.updateCounter();
                this.resetDough();
            }
        }
    }

    getPointerAngle(pointer) {
        // Calculate angle between pointer and dough center
        const dx = pointer.x - this.dough.x;
        const dy = pointer.y - this.dough.y;
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }

    getAngleDifference(angle1, angle2) {
        // Calculate the smallest difference between two angles
        let diff = angle2 - angle1;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        return diff;
    }

    updateProgressBar() {
        const progressPercent = (this.rotationProgress / this.maxRotationProgress) * 100;
        const barWidth = (progressPercent / 100) * 300;
        
        // Update progress bar fill
        this.progressBarFill.setDisplaySize(barWidth, 40);
        
        // Update progress text
        this.progressText.setText(`${Math.floor(progressPercent)}%`);
    }

    updateCounter() {
        this.counterValue.setText(this.rolledDoughCount.toString());
    }
    
    updateDebugInfo() {
        this.stateText.setText(`State: ${this.stateNames[this.currentState]}`);
        this.positionText.setText(`Dough Position: X:${Math.round(this.dough.x)}, Y:${Math.round(this.dough.y)}`);
        this.progressDebugText.setText(`Progress: ${this.rotationProgress.toFixed(1)}/${this.maxRotationProgress}`);
    }

    resetDough() {
        // Reset dough position and state
        this.dough.x = this.cameras.main.width / 2;
        this.dough.y = this.doughStartY;
        this.dough.rotation = 0;
        this.dough.setScale(1);
        
        // Reset game state
        this.currentState = this.gameState.PULLING_DOUGH;
        this.rotationProgress = 0;
        console.log('State reset to PULLING_DOUGH');
        
        // Reset progress bar
        this.updateProgressBar();
        
        // Reset instruction text
        if (this.instructionText) {
            this.instructionText.setText('Drag DOWN anywhere to pull dough!');
        }
        
        // Reset subtitle
        if (this.subtitleText) {
            this.subtitleText.setText('(You can drag anywhere on screen)');
        }
    }

    addGesturePoint(x, y) {
        // Add new point to the trail
        this.gestureTrail.push({ x, y, alpha: 1 });
        
        // Remove oldest point if we exceed the maximum
        if (this.gestureTrail.length > this.maxTrailPoints) {
            this.gestureTrail.shift();
        }
        
        // Draw the gesture trail
        this.drawGestureTrail();
    }
    
    drawGestureTrail() {
        // Clear previous graphics
        this.gestureGraphics.clear();
        
        // Get color based on current state
        let color;
        switch (this.currentState) {
            case this.gameState.PULLING_DOUGH:
                color = 0x00ff00; // Green for pulling
                break;
            case this.gameState.ROTATING_DOUGH:
                color = 0x0000ff; // Blue for rotating
                break;
            case this.gameState.MOVING_TO_FINISH:
                color = 0xff0000; // Red for finishing
                break;
        }
        
        // Draw trail points
        for (let i = 0; i < this.gestureTrail.length; i++) {
            const point = this.gestureTrail[i];
            const alpha = i / this.gestureTrail.length; // Fade out older points
            
            this.gestureGraphics.fillStyle(color, alpha);
            this.gestureGraphics.fillCircle(point.x, point.y, 8);
        }
        
        // Connect points with lines
        if (this.gestureTrail.length > 1) {
            this.gestureGraphics.lineStyle(4, color, 0.5);
            this.gestureGraphics.beginPath();
            this.gestureGraphics.moveTo(this.gestureTrail[0].x, this.gestureTrail[0].y);
            
            for (let i = 1; i < this.gestureTrail.length; i++) {
                this.gestureGraphics.lineTo(this.gestureTrail[i].x, this.gestureTrail[i].y);
            }
            
            this.gestureGraphics.strokePath();
        }
    }

    update() {
        // Fade out gesture trail over time
        if (this.gestureTrail.length > 0 && !this.isDragging) {
            for (let i = 0; i < this.gestureTrail.length; i++) {
                this.gestureTrail[i].alpha -= 0.05;
            }
            
            // Remove fully faded points
            this.gestureTrail = this.gestureTrail.filter(point => point.alpha > 0);
            
            // Redraw trail
            this.drawGestureTrail();
        }
        
        // Debug logging for dough position and state
        if (this.currentState === this.gameState.PULLING_DOUGH) {
            // Log the distance between dough and center position
            const distanceToCenter = this.doughCenterY - this.dough.y;
            if (distanceToCenter > 0 && distanceToCenter < 10) {
                console.log('Dough is close to center:', distanceToCenter);
                console.log('Current Y:', this.dough.y, 'Center Y:', this.doughCenterY);
            }
        }
        
        // Update debug info
        this.updateDebugInfo();
    }
} 