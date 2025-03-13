import Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        
        // Game state
        this.gameState = {
            PULLING_DOUGH: 0,
            ROTATING_DOUGH: 1,
            CUTTING_NOODLES: 2,
            MOVING_TO_FINISH: 3
        };
        
        this.currentState = this.gameState.PULLING_DOUGH;
        this.rolledDoughCount = 0;
        this.rotationProgress = 0;
        this.maxRotationProgress = 100;
        this.rotationSpeed = 0.5;
        this.lastPointerAngle = 0;
        
        // Cutting noodles state variables
        this.cutsMade = 0;
        this.requiredCuts = 5;
        this.cutLines = [];
        this.cutSensitivity = 1.2;  // Higher = more responsive to vertical swipes
        this.doughSlices = [];      // Store the dough slices after cutting
        
        // Gesture sensitivity settings
        this.pullSensitivity = 1.5;    // Higher = more responsive to downward gestures
        this.rotateSensitivity = 0.7;  // Higher = faster rotation progress
        this.moveSensitivity = 1.5;    // Higher = more responsive to rightward gestures
        
        // State names for debugging
        this.stateNames = [
            'PULLING_DOUGH',
            'ROTATING_DOUGH',
            'CUTTING_NOODLES',
            'MOVING_TO_FINISH'
        ];
        
        // Track screen dimensions for responsive layout
        this.lastWidth = 0;
        this.lastHeight = 0;
    }

    create() {
        console.log('GameScene started');
        this.createBackground();
        this.createDough();
        this.createProgressBar();
        this.createCounterDisplay();
        this.createDebugInfo();
        this.createGestureIndicator();
        this.createCuttingGuide();
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
        
        // Create dough sprite or fallback to a circle
        if (this.textures.exists('dough')) {
            console.log('Dough texture loaded successfully');
            this.dough = this.add.sprite(centerX, -50, 'dough');
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
        
        // Calculate safe position for progress bar (higher up from bottom)
        // This ensures it's visible on iPhone 12 and other devices with notches/home indicators
        const safeBottomPadding = 80; // Increased padding from bottom
        const progressBarY = height - safeBottomPadding;
        
        // Progress bar container
        if (this.textures.exists('progressBarBg')) {
            this.progressBarContainer = this.add.sprite(width / 2, progressBarY, 'progressBarBg');
            this.progressBarContainer.setDisplaySize(300, 40);
            
            // Progress bar fill - starts with width 0
            this.progressBarFill = this.add.sprite(width / 2 - 150, progressBarY, 'progressBarFill');
            this.progressBarFill.setOrigin(0, 0.5);
            this.progressBarFill.setDisplaySize(0, 40);
        } else {
            console.error('Progress bar textures not found!');
            // Create fallback graphics
            this.progressBarContainer = this.add.rectangle(width / 2, progressBarY, 300, 40, 0xdddddd);
            this.progressBarContainer.setStrokeStyle(2, 0xbbbbbb);
            
            this.progressBarFill = this.add.rectangle(width / 2 - 150, progressBarY, 0, 40, 0xf8d568);
            this.progressBarFill.setOrigin(0, 0.5);
            this.progressBarFill.setStrokeStyle(2, 0xe8c558);
        }
        
        // Progress text
        this.progressText = this.add.text(width / 2, progressBarY, '0%', {
            font: '18px Arial',
            fill: '#000000'
        }).setOrigin(0.5);
        
        // Make progress bar responsive to screen size
        this.scale.on('resize', this.resizeProgressBar, this);
    }
    
    resizeProgressBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const safeBottomPadding = 80;
        const progressBarY = height - safeBottomPadding;
        
        // Update positions
        this.progressBarContainer.setPosition(width / 2, progressBarY);
        this.progressBarFill.setPosition(width / 2 - 150, progressBarY);
        this.progressText.setPosition(width / 2, progressBarY);
        
        // Update progress bar width based on current progress
        const progressPercent = (this.rotationProgress / this.maxRotationProgress);
        const barWidth = progressPercent * 300;
        this.progressBarFill.setDisplaySize(barWidth, 40);
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
        this.counterTitle = this.add.text(width - 85, 35, 'Noodles:', {
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
        
        // Create a container for all debug elements
        this.debugContainer = this.add.container(0, 0);
        this.debugContainer.add([this.debugBg, this.debugTitle, this.stateText, this.positionText, this.progressDebugText]);
        
        // Hide debug by default in production
        this.debugContainer.setVisible(false);
        
        // Add a debug toggle button in the top-right corner
        const toggleButton = this.add.circle(this.cameras.main.width - 20, 20, 15, 0x333333, 0.7);
        toggleButton.setInteractive();
        toggleButton.on('pointerdown', () => {
            this.debugContainer.setVisible(!this.debugContainer.visible);
        });
        
        // Add a "D" label to the toggle button
        const toggleText = this.add.text(this.cameras.main.width - 20, 20, 'D', {
            font: '16px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Make sure the toggle button stays in the corner when resizing
        this.scale.on('resize', (gameSize) => {
            toggleButton.setPosition(gameSize.width - 20, 20);
            toggleText.setPosition(gameSize.width - 20, 20);
        });
    }

    createGestureIndicator() {
        // Create a graphics object for gesture visualization
        this.gestureGraphics = this.add.graphics();
        
        // Create a trail effect for gestures
        this.gestureTrail = [];
        this.isDragging = false;
    }

    createCuttingGuide() {
        // Create a container for the cutting guide elements
        this.cuttingGuideContainer = this.add.container(0, 0);
        
        // Create dotted lines to show where to cut (initially invisible)
        this.cuttingGuideLines = [];
        
        // We'll create these lines but make them invisible until needed
        for (let i = 1; i <= this.requiredCuts; i++) {
            const guideGraphics = this.add.graphics();
            guideGraphics.lineStyle(2, 0xffff00, 0.5);
            
            // Add to container and store reference
            this.cuttingGuideContainer.add(guideGraphics);
            this.cuttingGuideLines.push(guideGraphics);
        }
        
        // Hide the guide initially
        this.cuttingGuideContainer.setVisible(false);
    }

    setupInput() {
        // Make the entire game area interactive
        this.inputZone = this.add.zone(0, 0, this.cameras.main.width, this.cameras.main.height)
            .setOrigin(0, 0)
            .setInteractive();
        
        // Track pointer down state
        this.input.on('pointerdown', (pointer) => {
            this.isDragging = true;
            this.lastPointerPosition = { x: pointer.x, y: pointer.y };
            this.lastPointerAngle = this.getPointerAngle(pointer);
            
            // Clear previous gesture trail
            this.gestureTrail = [];
            this.addGesturePoint(pointer.x, pointer.y);
        });
        
        // Track pointer movement
        this.input.on('pointermove', (pointer) => {
            if (this.isDragging) {
                this.handlePointerMove(pointer);
                this.lastPointerPosition = { x: pointer.x, y: pointer.y };
            }
        });
        
        // Track pointer up
        this.input.on('pointerup', () => {
            this.isDragging = false;
            this.lastPointerPosition = null;
        });
        
        // Handle pointer leaving game area
        this.input.on('pointerout', () => {
            this.isDragging = false;
            this.lastPointerPosition = null;
        });
        
        // Make sure the input zone resizes with the camera
        this.scale.on('resize', (gameSize) => {
            this.inputZone.setSize(gameSize.width, gameSize.height);
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
                
            case this.gameState.CUTTING_NOODLES:
                this.handleCuttingNoodles(pointer);
                break;
                
            case this.gameState.MOVING_TO_FINISH:
                this.handleMovingToFinish(pointer);
                break;
        }
        
        // Only update debug info if it's visible
        if (this.debugContainer && this.debugContainer.visible) {
            this.updateDebugInfo();
        }
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
                this.currentState = this.gameState.CUTTING_NOODLES;
                console.log('State changed to CUTTING_NOODLES');
                
                // Show the cutting guide
                this.showCuttingGuide();
                
                // Update instruction text
                if (this.instructionText) {
                    this.instructionText.setText('Cut the dough!');
                }
                
                // Update subtitle
                if (this.subtitleText) {
                    this.subtitleText.setText('(Swipe UP or DOWN anywhere on screen)');
                }
            }
        }
        
        this.lastPointerAngle = currentAngle;
    }

    handleCuttingNoodles(pointer) {
        // Check for vertical movement (up or down)
        if (!this.lastPointerPosition) return;
        
        const horizontalDistance = Math.abs(pointer.x - this.lastPointerPosition.x);
        const verticalDistance = Math.abs(pointer.y - this.lastPointerPosition.y);
        
        // If the movement is primarily vertical (more vertical than horizontal)
        if (verticalDistance > horizontalDistance && verticalDistance > 30) {
            // Calculate the horizontal position of the cut
            const cutX = pointer.x;
            
            // Check if this cut is far enough from existing cuts (prevent double cuts in same area)
            const minCutDistance = 20; // Minimum pixels between cuts
            let isTooClose = false;
            
            for (const existingCut of this.cutLines) {
                if (Math.abs(existingCut.x - cutX) < minCutDistance) {
                    isTooClose = true;
                    break;
                }
            }
            
            // Only add a new cut if it's not too close to existing cuts and within the dough area
            if (!isTooClose && this.isWithinDoughBoundsHorizontal(cutX)) {
                // Add a new cut line
                this.addCutLine(cutX);
                
                // Split the dough at this position
                this.splitDoughAtPosition(cutX);
                
                // Increment cut counter
                this.cutsMade++;
                console.log(`Cut made! ${this.cutsMade}/${this.requiredCuts}`);
                
                // Update the progress bar to show cutting progress
                this.updateCuttingProgress();
                
                // Check if all required cuts have been made
                if (this.cutsMade >= this.requiredCuts) {
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
        }
    }
    
    isWithinDoughBoundsHorizontal(x) {
        // Calculate the bounds of the dough based on its current position and scale
        const doughLeft = this.dough.x - (this.dough.displayWidth / 2);
        const doughRight = this.dough.x + (this.dough.displayWidth / 2);
        
        // Check if the x position is within the dough bounds
        return x >= doughLeft && x <= doughRight;
    }
    
    addCutLine(x) {
        // Create a graphics object for the cut line
        const cutGraphics = this.add.graphics();
        
        // Draw a dashed line across the dough height
        const doughHeight = this.dough.displayHeight;
        const startY = this.dough.y - (doughHeight / 2);
        const endY = this.dough.y + (doughHeight / 2);
        
        // Draw the main cut line with a thicker, more visible style
        cutGraphics.lineStyle(4, 0xffffff, 0.9);
        cutGraphics.beginPath();
        cutGraphics.moveTo(x, startY);
        cutGraphics.lineTo(x, endY);
        cutGraphics.strokePath();
        
        // Add some visual effects to make it look like a cut
        cutGraphics.lineStyle(2, 0x000000, 0.5);
        
        // Draw a slightly offset shadow line
        cutGraphics.beginPath();
        cutGraphics.moveTo(x + 2, startY);
        cutGraphics.lineTo(x + 2, endY);
        cutGraphics.strokePath();
        
        // Add a slight glow effect
        const glowGraphics = this.add.graphics();
        glowGraphics.lineStyle(6, 0xffffff, 0.3);
        glowGraphics.beginPath();
        glowGraphics.moveTo(x, startY);
        glowGraphics.lineTo(x, endY);
        glowGraphics.strokePath();
        
        // Store the cut line for reference
        this.cutLines.push({
            graphics: cutGraphics,
            glowGraphics: glowGraphics,
            x: x
        });
    }

    splitDoughAtPosition(x) {
        // If this is the first cut, we need to hide the original dough and create two slices
        if (this.doughSlices.length === 0) {
            // Get dough properties
            const doughX = this.dough.x;
            const doughY = this.dough.y;
            const doughWidth = this.dough.displayWidth;
            const doughHeight = this.dough.displayHeight;
            const doughRotation = this.dough.rotation;
            
            // Hide the original dough
            this.dough.setVisible(false);
            
            // Calculate slice widths
            const leftSliceWidth = x - (doughX - doughWidth/2);
            const rightSliceWidth = (doughX + doughWidth/2) - x;
            
            // Create left slice
            const leftSlice = this.createDoughSlice(
                doughX - (doughWidth/2) + leftSliceWidth/2, 
                doughY, 
                leftSliceWidth, 
                doughHeight,
                'left',
                x
            );
            
            // Create right slice
            const rightSlice = this.createDoughSlice(
                x + rightSliceWidth/2, 
                doughY, 
                rightSliceWidth, 
                doughHeight,
                'right',
                x
            );
            
            // Add slices to the array
            this.doughSlices.push(leftSlice, rightSlice);
            
            // Add a visual effect to show the cut
            this.addCutEffect(x, doughY, doughHeight);
        } else {
            // Find which slice the cut is in
            let sliceToSplit = null;
            let sliceIndex = -1;
            
            for (let i = 0; i < this.doughSlices.length; i++) {
                const slice = this.doughSlices[i];
                if (!slice.visible) continue; // Skip already split slices
                
                // Check if this slice contains the cut position
                let sliceLeft, sliceRight;
                
                if (slice.customBounds) {
                    sliceLeft = slice.customBounds.left;
                    sliceRight = slice.customBounds.right;
                } else {
                    sliceLeft = slice.x - slice.displayWidth/2;
                    sliceRight = slice.x + slice.displayWidth/2;
                }
                
                if (x >= sliceLeft && x <= sliceRight) {
                    sliceToSplit = slice;
                    sliceIndex = i;
                    break;
                }
            }
            
            if (sliceToSplit) {
                // Calculate properties for the new slices
                let sliceX, sliceY, sliceWidth, sliceHeight, sliceRotation;
                
                if (sliceToSplit.customBounds) {
                    sliceX = sliceToSplit.customBounds.centerX;
                    sliceY = sliceToSplit.customBounds.centerY;
                    sliceWidth = sliceToSplit.customBounds.width;
                    sliceHeight = sliceToSplit.customBounds.height;
                    sliceRotation = 0; // Custom shapes don't rotate
                } else {
                    sliceX = sliceToSplit.x;
                    sliceY = sliceToSplit.y;
                    sliceWidth = sliceToSplit.displayWidth;
                    sliceHeight = sliceToSplit.displayHeight;
                    sliceRotation = sliceToSplit.rotation;
                }
                
                // Calculate new slice widths
                let leftSliceWidth, rightSliceWidth, sliceLeft;
                
                if (sliceToSplit.customBounds) {
                    sliceLeft = sliceToSplit.customBounds.left;
                    leftSliceWidth = x - sliceLeft;
                    rightSliceWidth = sliceToSplit.customBounds.right - x;
                } else {
                    sliceLeft = sliceX - sliceWidth/2;
                    leftSliceWidth = x - sliceLeft;
                    rightSliceWidth = (sliceX + sliceWidth/2) - x;
                }
                
                // Hide the original slice
                sliceToSplit.setVisible(false);
                
                // Create left slice
                const leftSlice = this.createDoughSlice(
                    sliceLeft + leftSliceWidth/2, 
                    sliceY, 
                    leftSliceWidth, 
                    sliceHeight,
                    'left',
                    x
                );
                
                if (!leftSlice.customBounds) {
                    leftSlice.rotation = sliceRotation;
                }
                
                // Create right slice
                const rightSlice = this.createDoughSlice(
                    x + rightSliceWidth/2, 
                    sliceY, 
                    rightSliceWidth, 
                    sliceHeight,
                    'right',
                    x
                );
                
                if (!rightSlice.customBounds) {
                    rightSlice.rotation = sliceRotation;
                }
                
                // Replace the original slice with the two new slices
                this.doughSlices.splice(sliceIndex, 1, leftSlice, rightSlice);
                
                // Add a visual effect to show the cut
                this.addCutEffect(x, sliceY, sliceHeight);
            }
        }
        
        // Add a small animation to show the slices separating
        this.animateSlicesSeparation();
    }
    
    createDoughSlice(x, y, width, height, side, cutX) {
        // Create a new slice based on the original dough
        let slice;
        
        // Check if the original dough is a circle or a sprite
        const isCircle = this.dough.type === 'Arc' || this.dough.geom === 'circle';
        
        if (isCircle) {
            // For circular dough, create arc segments
            const doughRadius = this.dough.radius || this.dough.width / 2;
            const doughCenterX = this.dough.x;
            const doughCenterY = this.dough.y;
            
            // Create a graphics object for the slice
            slice = this.add.graphics();
            
            // Fill with dough color
            slice.fillStyle(0xf5e6c8, 1);
            slice.lineStyle(4, 0xe6d2a8);
            
            // Draw the appropriate arc segment based on which side of the cut this is
            if (side === 'left') {
                // Draw left segment (from left edge to cut)
                const leftEdge = doughCenterX - doughRadius;
                const arcWidth = cutX - leftEdge;
                
                // Create a custom shape for the left segment
                const leftSegment = new Phaser.Geom.Polygon([
                    // Top of the arc
                    { x: leftEdge, y: doughCenterY - doughRadius },
                    // Points along the left side of the circle
                    { x: leftEdge, y: doughCenterY - doughRadius * 0.7 },
                    { x: leftEdge, y: doughCenterY - doughRadius * 0.3 },
                    { x: leftEdge, y: doughCenterY },
                    { x: leftEdge, y: doughCenterY + doughRadius * 0.3 },
                    { x: leftEdge, y: doughCenterY + doughRadius * 0.7 },
                    // Bottom of the arc
                    { x: leftEdge, y: doughCenterY + doughRadius },
                    // Cut line (vertical)
                    { x: cutX, y: doughCenterY + doughRadius },
                    { x: cutX, y: doughCenterY - doughRadius }
                ]);
                
                slice.fillPoints(leftSegment.points, true);
                slice.strokePoints(leftSegment.points, true);
                
                // Set the position for the graphics object
                slice.x = 0;
                slice.y = 0;
                
                // Store custom properties for this slice
                slice.customBounds = {
                    left: leftEdge,
                    right: cutX,
                    top: doughCenterY - doughRadius,
                    bottom: doughCenterY + doughRadius,
                    width: arcWidth,
                    height: doughRadius * 2,
                    centerX: (leftEdge + cutX) / 2,
                    centerY: doughCenterY
                };
                
            } else { // side === 'right'
                // Draw right segment (from cut to right edge)
                const rightEdge = doughCenterX + doughRadius;
                const arcWidth = rightEdge - cutX;
                
                // Create a custom shape for the right segment
                const rightSegment = new Phaser.Geom.Polygon([
                    // Top of the arc at cut
                    { x: cutX, y: doughCenterY - doughRadius },
                    // Right edge top
                    { x: rightEdge, y: doughCenterY - doughRadius },
                    // Points along the right side of the circle
                    { x: rightEdge, y: doughCenterY - doughRadius * 0.7 },
                    { x: rightEdge, y: doughCenterY - doughRadius * 0.3 },
                    { x: rightEdge, y: doughCenterY },
                    { x: rightEdge, y: doughCenterY + doughRadius * 0.3 },
                    { x: rightEdge, y: doughCenterY + doughRadius * 0.7 },
                    // Bottom of the arc
                    { x: rightEdge, y: doughCenterY + doughRadius },
                    // Cut line bottom (vertical)
                    { x: cutX, y: doughCenterY + doughRadius }
                ]);
                
                slice.fillPoints(rightSegment.points, true);
                slice.strokePoints(rightSegment.points, true);
                
                // Set the position for the graphics object
                slice.x = 0;
                slice.y = 0;
                
                // Store custom properties for this slice
                slice.customBounds = {
                    left: cutX,
                    right: rightEdge,
                    top: doughCenterY - doughRadius,
                    bottom: doughCenterY + doughRadius,
                    width: arcWidth,
                    height: doughRadius * 2,
                    centerX: (cutX + rightEdge) / 2,
                    centerY: doughCenterY
                };
            }
            
            // Add custom display width/height properties to match the API of other game objects
            slice.displayWidth = slice.customBounds.width;
            slice.displayHeight = slice.customBounds.height;
            
            // Override the default position to use our custom bounds
            Object.defineProperty(slice, 'x', {
                get: function() { return this.customBounds.centerX; },
                set: function(value) {
                    const dx = value - this.customBounds.centerX;
                    this.customBounds.left += dx;
                    this.customBounds.right += dx;
                    this.customBounds.centerX = value;
                    this.setPosition(this.x, this.y);
                }
            });
            
            Object.defineProperty(slice, 'y', {
                get: function() { return this.customBounds.centerY; },
                set: function(value) {
                    const dy = value - this.customBounds.centerY;
                    this.customBounds.top += dy;
                    this.customBounds.bottom += dy;
                    this.customBounds.centerY = value;
                    this.setPosition(this.x, this.y);
                }
            });
            
        } else {
            // For rectangular/sprite dough, create a rectangle
            slice = this.add.rectangle(x, y, width, height, 0xf5e6c8);
            slice.setStrokeStyle(4, 0xe6d2a8);
            
            // Set the rotation to match the original dough
            slice.rotation = this.dough.rotation;
        }
        
        // Store which side this slice is on
        slice.side = side;
        
        return slice;
    }
    
    animateSlicesSeparation() {
        // Add a small animation to show the slices separating
        const separationDistance = 5; // pixels to separate
        
        this.doughSlices.forEach(slice => {
            if (slice.side === 'left') {
                if (slice.customBounds) {
                    // For custom shapes, we need to update the bounds and redraw
                    this.tweens.add({
                        targets: slice.customBounds,
                        centerX: slice.customBounds.centerX - separationDistance,
                        left: slice.customBounds.left - separationDistance,
                        right: slice.customBounds.right - separationDistance,
                        duration: 200,
                        ease: 'Power2',
                        onUpdate: () => {
                            // Force position update
                            slice.x = slice.customBounds.centerX;
                        }
                    });
                } else {
                    // For regular game objects
                    this.tweens.add({
                        targets: slice,
                        x: slice.x - separationDistance,
                        duration: 200,
                        ease: 'Power2'
                    });
                }
            } else if (slice.side === 'right') {
                if (slice.customBounds) {
                    // For custom shapes, we need to update the bounds and redraw
                    this.tweens.add({
                        targets: slice.customBounds,
                        centerX: slice.customBounds.centerX + separationDistance,
                        left: slice.customBounds.left + separationDistance,
                        right: slice.customBounds.right + separationDistance,
                        duration: 200,
                        ease: 'Power2',
                        onUpdate: () => {
                            // Force position update
                            slice.x = slice.customBounds.centerX;
                        }
                    });
                } else {
                    // For regular game objects
                    this.tweens.add({
                        targets: slice,
                        x: slice.x + separationDistance,
                        duration: 200,
                        ease: 'Power2'
                    });
                }
            }
        });
    }

    handleMovingToFinish(pointer) {
        // Check for rightward movement
        if (this.lastPointerPosition && pointer.x > this.lastPointerPosition.x) {
            // Calculate how much to move the dough based on pointer movement
            const dragDistance = pointer.x - this.lastPointerPosition.x;
            
            // Move all dough slices right proportionally to the drag with sensitivity applied
            const moveAmount = dragDistance * this.moveSensitivity;
            
            if (this.doughSlices.length > 0) {
                // Move all slices
                this.doughSlices.forEach(slice => {
                    if (slice.customBounds) {
                        // For custom shapes, update the bounds
                        slice.customBounds.left += moveAmount;
                        slice.customBounds.right += moveAmount;
                        slice.customBounds.centerX += moveAmount;
                        // Force position update
                        slice.x = slice.customBounds.centerX;
                    } else {
                        // For regular game objects
                        slice.x += moveAmount;
                    }
                });
                
                // Check if the rightmost slice reached the end position
                const rightmostSlice = this.doughSlices.reduce((rightmost, slice) => {
                    const currentRight = slice.customBounds ? 
                        slice.customBounds.right : 
                        slice.x + slice.displayWidth/2;
                    
                    const maxRight = rightmost.customBounds ? 
                        rightmost.customBounds.right : 
                        rightmost.x + rightmost.displayWidth/2;
                    
                    return (currentRight > maxRight) ? slice : rightmost;
                }, this.doughSlices[0]);
                
                const rightEdge = rightmostSlice.customBounds ? 
                    rightmostSlice.customBounds.right : 
                    rightmostSlice.x + rightmostSlice.displayWidth/2;
                
                if (rightEdge >= this.doughEndX) {
                    // Increment counter and reset game state
                    this.rolledDoughCount++;
                    console.log('Dough completed! Count:', this.rolledDoughCount);
                    this.updateCounter();
                    this.resetDough();
                }
            } else {
                // If no slices (shouldn't happen), move the original dough
                this.dough.x += moveAmount;
                
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

    updateCuttingProgress() {
        const progressPercent = (this.cutsMade / this.requiredCuts) * 100;
        const barWidth = (progressPercent / 100) * 300;
        
        // Update progress bar fill
        this.progressBarFill.setDisplaySize(barWidth, 40);
        
        // Update progress text
        this.progressText.setText(`${this.cutsMade}/${this.requiredCuts} cuts`);
    }

    updateCounter() {
        this.counterValue.setText(this.rolledDoughCount.toString());
    }
    
    updateDebugInfo() {
        // Only update if debug is visible (performance optimization)
        if (!this.debugContainer || !this.debugContainer.visible) return;
        
        this.stateText.setText(`State: ${this.stateNames[this.currentState]}`);
        this.positionText.setText(`Dough Position: X:${Math.round(this.dough.x)}, Y:${Math.round(this.dough.y)}`);
        
        // Show different progress info based on current state
        if (this.currentState === this.gameState.ROTATING_DOUGH) {
            this.progressDebugText.setText(`Progress: ${this.rotationProgress.toFixed(1)}/${this.maxRotationProgress}`);
        } else if (this.currentState === this.gameState.CUTTING_NOODLES) {
            this.progressDebugText.setText(`Cuts: ${this.cutsMade}/${this.requiredCuts}`);
        } else {
            this.progressDebugText.setText(`Progress: ${this.rotationProgress.toFixed(1)}/${this.maxRotationProgress}`);
        }
    }

    resetDough() {
        // Reset dough position and state
        this.dough.x = this.cameras.main.width / 2;
        this.dough.y = this.doughStartY;
        this.dough.rotation = 0;
        this.dough.setScale(1);
        this.dough.setVisible(true);
        
        // Clear cut lines
        this.cutLines.forEach(cut => {
            if (cut.graphics) {
                cut.graphics.destroy();
            }
            if (cut.glowGraphics) {
                cut.glowGraphics.destroy();
            }
        });
        this.cutLines = [];
        this.cutsMade = 0;
        
        // Clear dough slices
        this.doughSlices.forEach(slice => {
            if (slice) {
                slice.destroy();
            }
        });
        this.doughSlices = [];
        
        // Hide cutting guide
        if (this.cuttingGuideContainer) {
            this.cuttingGuideContainer.setVisible(false);
        }
        
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

    showCuttingGuide() {
        // Make the guide visible
        this.cuttingGuideContainer.setVisible(true);
        
        // Calculate the dough bounds
        const doughTop = this.dough.y - (this.dough.displayHeight / 2);
        const doughBottom = this.dough.y + (this.dough.displayHeight / 2);
        const doughHeight = this.dough.displayHeight;
        const doughWidth = this.dough.displayWidth;
        const doughLeft = this.dough.x - (doughWidth / 2);
        const doughRight = this.dough.x + (doughWidth / 2);
        
        // Position the guide lines evenly across the dough
        for (let i = 0; i < this.requiredCuts; i++) {
            const lineX = doughLeft + ((i + 1) * doughWidth / (this.requiredCuts + 1));
            const guideGraphics = this.cuttingGuideLines[i];
            
            // Clear and redraw
            guideGraphics.clear();
            guideGraphics.lineStyle(2, 0xffff00, 0.5);
            
            // Draw a dashed line manually by creating small line segments
            const dashLength = 5;
            const gapLength = 5;
            let dashY = doughTop - 20; // Extend beyond dough
            const endY = doughBottom + 20;
            
            while (dashY < endY) {
                // Draw a dash
                guideGraphics.beginPath();
                guideGraphics.moveTo(lineX, dashY);
                guideGraphics.lineTo(lineX, Math.min(dashY + dashLength, endY));
                guideGraphics.strokePath();
                
                // Move to the next dash position
                dashY += dashLength + gapLength;
            }
        }
    }

    addGesturePoint(x, y) {
        // Add a new point to the gesture trail
        this.gestureTrail.push({ x, y });
        
        // Limit the number of points to prevent performance issues
        if (this.gestureTrail.length > 20) {
            this.gestureTrail.shift();
        }
        
        // Draw the updated trail
        this.drawGestureTrail();
    }
    
    drawGestureTrail() {
        // Clear previous graphics
        this.gestureGraphics.clear();
        
        if (this.gestureTrail.length === 0) {
            return;
        }
        
        // Determine color based on current state
        let color;
        switch (this.currentState) {
            case this.gameState.PULLING_DOUGH:
                color = 0x00ff00; // Green for pulling
                break;
            case this.gameState.ROTATING_DOUGH:
                color = 0x0000ff; // Blue for rotating
                break;
            case this.gameState.CUTTING_NOODLES:
                color = 0xff0000; // Red for cutting
                break;
            case this.gameState.MOVING_TO_FINISH:
                color = 0xff00ff; // Purple for moving to finish
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

    addCutEffect(x, y, height) {
        // Create a flash effect for the cut
        const flash = this.add.rectangle(x, y, 10, height, 0xffffff);
        flash.setAlpha(0.8);
        
        // Animate the flash
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Add a small particle effect if we can
        if (this.particles) {
            const emitter = this.particles.createEmitter({
                x: x,
                y: y,
                speed: { min: 20, max: 50 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.5, end: 0 },
                blendMode: 'ADD',
                lifespan: 300,
                gravityY: 100
            });
            
            // Emit a burst of particles
            emitter.explode(10, x, y);
            
            // Stop the emitter after the burst
            this.time.delayedCall(100, () => {
                emitter.stop();
            });
        }
    }

    update() {
        // Fade out gesture trail over time
        if (this.gestureTrail.length > 0 && !this.isDragging) {
            this.gestureTrail.shift();
            this.drawGestureTrail();
        }
        
        // Update debug info if it's visible
        if (this.debugContainer && this.debugContainer.visible) {
            this.updateDebugInfo();
        }
        
        // Check for orientation changes on mobile
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // If we detect a significant change in screen dimensions, refresh the layout
        if (this.lastWidth !== width || this.lastHeight !== height) {
            this.lastWidth = width;
            this.lastHeight = height;
            
            // Refresh positions of key UI elements
            if (this.progressBarContainer) {
                this.resizeProgressBar();
            }
            
            // Update instruction text position
            if (this.instructionText) {
                this.instructionText.setPosition(width / 2, this.doughCenterY + 150);
            }
            
            if (this.subtitleText) {
                this.subtitleText.setPosition(width / 2, this.doughCenterY + 180);
            }
            
            // Update counter display position
            if (this.counterBg) {
                this.counterBg.clear();
                this.counterBg.fillStyle(0xffffff, 0.8);
                this.counterBg.fillRoundedRect(width - 150, 20, 130, 60, 10);
                this.counterBg.lineStyle(2, 0xcccccc, 1);
                this.counterBg.strokeRoundedRect(width - 150, 20, 130, 60, 10);
                
                this.counterTitle.setPosition(width - 85, 35);
                this.counterValue.setPosition(width - 85, 60);
            }
        }
    }
} 