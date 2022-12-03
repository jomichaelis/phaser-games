class BootScene extends Phaser.Scene {
    constructor() {
        super({
            key: "BootScene"
        });
    }

    init() {
        // Used to prepare data
    }

    preload() {
        // Used for preloading assets into your scene, such as
        // • images
        // • sounds
        this.load.image('sky', 'assets/sky.png');
    }

    create(data) {
        // Used to add objects to your game
        this.add.image(400, 400, 'sky');
        this.input.on('pointerdown', () => this.scene.start('GameScene'));
    }

    update(time, delta) {
        // Used to update your game. This function runs constantly
    }

}

export default BootScene;
