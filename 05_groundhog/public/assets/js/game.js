import bootScene from './scenes/bootScene.js';
import gameScene from './scenes/gameScene.js';

let config = {
    version: "0.0.1",
    type: Phaser.AUTO,
    target: 'content',
    width: 800,
    height: 800,
    pixelArt: true,
    fps: {
        target: 30
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [
        bootScene, gameScene
    ]
};

let game = new Phaser.Game(config);

window.onload = function () {
    if (game !== undefined) {
        game.destroy(true);
    }
    game = new Phaser.Game(config);
}

window.onunload = function () {
    game.destroy(true);
};
