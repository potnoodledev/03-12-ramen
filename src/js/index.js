import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import GameScene from './scenes/GameScene';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 640,
    height: 960,
    backgroundColor: '#f8f8f8',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, GameScene]
};

window.addEventListener('load', () => {
    const game = new Phaser.Game(config);
    
    // Handle mobile browser issues
    window.addEventListener('resize', () => {
        game.scale.refresh();
    });
    
    // Prevent default touch behavior on mobile
    document.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
}); 