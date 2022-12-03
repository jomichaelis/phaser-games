/* jshint globalstrict: true, loopfunc: true */
/* global Phaser, forge, io, console, $, getCookie */
/* jshint -W082 */
'use strict';

const width = 780;
const height = 780;

class BootScene extends Phaser.Scene {
    constructor() {
        super({
            key: 'BootScene',
            active: true
        });
    }

    preload() {
        // load screen
        this.graphics = this.add.graphics();
        this.newGraphics = this.add.graphics();
        let progressBar = new Phaser.Geom.Rectangle(width / 2 - 100, height / 2 + 15, 200, 30);
        var progressBarFill = new Phaser.Geom.Rectangle(width / 2 - 95, height / 2 + 20, 190, 20);

        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillRectShape(progressBar);

        this.newGraphics.fillStyle(0x3587e2, 1);
        this.newGraphics.fillRectShape(progressBarFill);

        let loadingText = this.add.text(width / 2 - 95, height / 2 - 20, "Lade 'Robinsons Adventures'", {
            fontSize: '12px',
            fill: '#FFF'
        });
        let that = this;
        this.load.on('progress', function (percentage) {
            that.newGraphics.clear();
            that.newGraphics.fillStyle(0x3587e2, 1);
            that.newGraphics.fillRectShape(new Phaser.Geom.Rectangle(width / 2 - 95, height / 2 + 20, percentage * 190, 20));
        });


        // map tiles
        this.load.image('groundimages', 'assets/map/spritesheet-extruded.png');
        this.load.image('waterimages', 'assets/map/water.png');
        this.load.image('castleimages', 'assets/map/castle.png');
        this.load.image('indoorcastleimages', 'assets/map/indoorcastle.png');
        this.load.image('darkdimensionImage', 'assets/map/darkdimension.png');
        this.load.image('underworldImage', 'assets/map/underworld.png');
        this.load.image('beachImage', 'assets/map/beach_tileset.png');
        this.load.image('ashlandImage', 'assets/map/ashlands_tileset.png');
        this.load.image('atlasImage', 'assets/map/atlas.png');
        this.load.image('farmhouseImage', 'assets/map/farmhouse.png');
        this.load.image('overworldImage', 'assets/map/overworld_tileset_grass.png');
        this.load.image('newTownImage', 'assets/map/newTown.jpg');
        this.load.image('rpgImage', 'assets/map/rpg.png');

        // map in json format
        this.load.tilemapTiledJSON('map', 'assets/map/map.json');

        // our two characters
        this.load.spritesheet('player', 'assets/RPG_assets.png', {
            frameWidth: 16,
            frameHeight: 16
        });

        //character images
        this.load.image('entImage', 'assets/map/darkent.png');
        this.load.image('demonImage', 'assets/map/demon.png');
        this.load.image('wormImage', 'assets/map/giant-worm.png');
        this.load.image('wolfImage', 'assets/map/wolf.png');
        this.load.image('hiImage', 'assets/map/HiBox.png');
        this.load.image('bullet', 'assets/bullet.png');


        //GUI images
        this.load.setCORS('anonymous');
        this.load.spritesheet('button', 'https://examples.phaser.io/assets/buttons/button_sprite_sheet.png', {
            frameWidth: 193,
            frameHeight: 71
        });
        this.load.atlas('buttonAtlas', 'https://examples.phaser.io/assets/buttons/button_texture_atlas.png', 'https://examples.phaser.io/assets/buttons/button_texture_atlas.json');
    }

    create() {
        this.scene.start('WorldScene');
    }
}

class WorldScene extends Phaser.Scene {
    constructor() {
        super({
            key: 'WorldScene'
        });
    }

    create() {
        this.socket = io();
        this.otherPlayers = this.physics.add.group();


        //Level Layers and Characters
        var GrassLayer;
        var ObstaclesLayer;
        var ObstaclesLayer2;
        var WaterLayer;
        this.QuestionMaster = [];
        var MainCharacter;
        this.bullets = this.physics.add.group({defaultKey: 'bullet'});
        this.modal = document.getElementById("myModal");
        this.colliderActivatedTimer = Date.now();

        // Movement
        this.v = 300;
        this.v_diag = this.v / Math.sqrt(2);

        //GUI
        this.createUIElements();

        // create map
        this.createMap();

        // create player animations
        this.createAnimations();

        // user input
        this.cursors = this.input.keyboard.createCursorKeys();

        this.spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // create questionmasters
        this.createQuestionMasters();

        this.createMessageElement();


        // listen for web socket events
        this.socket.on('connect', function (socket) {
            this.register(this.socket.id);
        }
            .bind(this));

        this.socket.on('kickout', function (socketid) {
            if (this.socket.id === socketid) {
                this.logout(false);
            }
        }
            .bind(this));

        this.socket.on('currentPlayers', function (players) {
            Object.keys(players).forEach(function (id) {
                if (players[id].playerId !== this.socket.id) {
                    this.addOtherPlayers(players[id]);
                }
            }
                .bind(this));
        }
            .bind(this));

        this.socket.on('newPlayer', function (playerInfo) {
            if (playerInfo.playerId === this.socket.id) {
                this.createPlayer(playerInfo);
            } else {
                console.log('wrong player info received');
            }

        }
            .bind(this));

        this.socket.on('disconnect', function (playerId) {
            this.otherPlayers.getChildren().forEach(function (player) {
                if (playerId === player.playerId) {
                    player.destroy();
                }
            }
                .bind(this));
        }
            .bind(this));


        this.socket.on('players-moved', function (playersUpdate) {
            for (let [updateId, playerUpdate] of Object.entries(playersUpdate)) {

                // Ignore own player - just update health
                if (playerUpdate.playerId === this.socket.id) {
                    if (this.MainCharacter) {
                        this.MainCharacter.health = playerUpdate.health;
                        this.MainCharacter.message = playerUpdate.message;
                    }
                } else {
                    this.otherPlayers.getChildren().forEach(function
                        (player) {


                        if (playerUpdate.playerId === player.playerId) {
                            let dx = playerUpdate.x - player.x;
                            let dy = playerUpdate.y - player.y;

                            player.setPosition(playerUpdate.x, playerUpdate.y);
                            player.health = playerUpdate.health;
                            player.message = playerUpdate.message;

                            if (dx < 0) {
                                player.sprite.anims.play('left', true);
                                player.sprite.flipX = true;
                            } else if (dx > 0) {
                                player.sprite.anims.play('right', true);
                                player.sprite.flipX = false;
                            } else if (dy < 0) {
                                player.sprite.anims.play('up', true);
                            } else if (dy > 0) {
                                player.sprite.anims.play('down', true);
                            } else {
                                player.sprite.anims.stop();
                            }

                        }
                    }
                        .bind(this));
                }
            }
        }
            .bind(this));

        this.socket.on('playerForcePoseUpdate', function (playerInfo) {
            if (playerInfo.playerId === this.socket.id) {
                this.MainCharacter.x = playerInfo.x;
                this.MainCharacter.y = playerInfo.y;
            }
        }
            .bind(this));

        // Listen for bullet update events
        this.socket.on('bullets-update', function (server_bullet_array) {
            let i;
            // If there's not enough bullets on the client, create them
            for (i = 0; i < server_bullet_array.length; i++) {
                if (server_bullet_array[i].owner_id === this.socket.id) {
                    continue;
                }

                let found = false;
                this.bullets.getChildren().forEach(function (bullet) {
                    if (bullet.owner_id === server_bullet_array[i].owner_id &&
                        bullet.id === server_bullet_array[i].id) {
                        found = true;
                    }
                });

                if (found === false) {
                    let bullet = this.bullets.get(server_bullet_array[i].x, server_bullet_array[i].y);
                    bullet.setVelocity(server_bullet_array[i].speed_x, server_bullet_array[i].speed_y);
                    bullet.id = server_bullet_array[i].id;
                    bullet.owner_id = server_bullet_array[i].owner_id;
                }
            }


            this.bullets.getChildren().forEach(function (bullet) {
                let found = false;
                for (i = 0; i < server_bullet_array.length; i++) {
                    if (bullet.owner_id === server_bullet_array[i].owner_id &&
                        bullet.id === server_bullet_array[i].id) {
                        found = true;
                    }
                }

                if (found === false) {
                    bullet.destroy();
                }
            });


        }
            .bind(this));


        this.socket.on('bullets-destroy', function (server_bullet_array) {
            // If there's not enough bullets on the client, create them
            for (let i = 0; i < server_bullet_array.length; i++) {
                if (server_bullet_array[i].owner_id === this.socket.id) {
                    if (this.MainCharacter) {
                        this.MainCharacter.bullets.getChildren().forEach(function (bullet) {
                            if (bullet.id === server_bullet_array[i].id) {
                                bullet.destroy();
                            }
                        });
                    }
                } else {
                    this.bullets.getChildren().forEach(function (bullet) {
                        if (bullet.owner_id === server_bullet_array[i].owner_id &&
                            bullet.id === server_bullet_array[i].id) {
                            bullet.destroy();
                        }
                    });
                }
            }
        }.bind(this));


        // Listen for any player hit events and make that player flash
        this.socket.on('player-hit', function (id) {
            if (id === this.socket.id) {
                //If this is you
                this.MainCharacter.alpha = 0;
            } else {
                // Find the right player
                this.otherPlayers.getChildren().forEach(function (player) {
                    if (id === player.playerId) {
                        player.alpha = 0;
                    }
                });
            }
        }
            .bind(this));
    }

    register(id) {
        let message = id;
        $.ajax({
            type: 'POST',
            url: '/register-player',
            data: {
                message,
                refreshToken: getCookie('refreshJwt')
            },
            success: function (data) {
            },
            error: function (xhr) {
                console.log(xhr);
                if (xhr.status === 600) {
                    window.location.replace('/already-loggedin.html');
                } else {
                    window.alert(JSON.stringify(xhr));
                    window.location.replace('/index.html');
                }
            }
        });
    }

    logout(voluntary = true) {
        $.ajax({
            type: 'POST',
            url: '/logout',
            data: {
                refreshToken: getCookie('refreshJwt')
            },
            success: function (data) {
                if (voluntary) {
                    window.location.replace('/logged-out.html');
                } else {
                    window.location.replace('/kicked-out.html');
                }
            },
            error: function (xhr) {
                window.alert(JSON.stringify(xhr));
                window.location.replace('/error.html');
            }
        });
    }

    resetposition() {
        $.ajax({
            type: 'POST',
            url: '/resetposition-player',
            data: {
                refreshToken: getCookie('refreshJwt')
            },
            success: function (data) {
            },
            error: function (xhr) {
                window.alert(JSON.stringify(xhr));
                window.location.replace('/error.html');
            }
        });
    }


    redrawLifebars() {
        this.lifeBar.clear();
        if (this.MainCharacter.health < this.MainCharacter.maxHealth) {
            let fraction = this.MainCharacter.health / this.MainCharacter.maxHealth;
            this.lifeBar.fillStyle(0x00FF00, 1);
            this.lifeBar.fillRect(-25 / 2, -16, 25 * fraction, 5);

            this.lifeBar.lineStyle(1, 0xFF0000, 1.0);
            this.lifeBar.strokeRect(-25 / 2, -16, 25, 5);
        }

        this.otherPlayers.getChildren().forEach(function (player) {
            player.lifeBar.clear();

            if (player.health < player.maxHealth) {
                let fraction = player.health / player.maxHealth;
                player.lifeBar.fillStyle(0x00FF00, 1);
                player.lifeBar.fillRect(-25 / 2, -16, 25 * fraction, 5);

                player.lifeBar.lineStyle(1, 0xFF0000, 1.0);
                player.lifeBar.strokeRect(-25 / 2, -16, 25, 5);
            }
        });
    }


    redrawMessages() {
        if (this.MainCharacter.message !== this.messageText.text) {
            this.messageText.text = this.MainCharacter.message;
        }

        this.otherPlayers.getChildren().forEach(function (player) {
            if (player.message !== player.messageText.text) {
                player.messageText.text = player.message;
            }
        });
    }

    createMap() {
        // create the map
        this.map = this.make.tilemap({
            key: 'map'
        });

        // first parameter is the name of the tilemap in tiled
        let groundtiles = this.map.addTilesetImage('spritesheet', 'groundimages', 16, 16, 1, 2);
        let watertiles = this.map.addTilesetImage('Water32Frames8x4', 'waterimages', 16, 16, 0, 0);
        let castletiles = this.map.addTilesetImage('castle', 'castleimages', 16, 16);
        let indoorcastletiles = this.map.addTilesetImage('indoorcastle', 'indoorcastleimages', 16, 16);
        let beachtiles = this.map.addTilesetImage('beach', 'beachImage', 16, 16);
        let ashlandtiles = this.map.addTilesetImage('ashlands_tileset', 'ashlandImage', 16, 16);
        let atlastiles = this.map.addTilesetImage('atlas', 'atlasImage', 16, 16);
        let hitiles = this.map.addTilesetImage('HiBox', 'hiImage', 16, 16);
        let darkdimensiontiles = this.map.addTilesetImage('darkdimension', 'darkdimensionImage', 16, 16);
        let underworldtiles = this.map.addTilesetImage('underworld', 'underworldImage', 16, 16);
        let overworldtiles = this.map.addTilesetImage('overworld', 'overworldImage', 16, 16);
        let farmhousetiles = this.map.addTilesetImage('farmhouse', 'farmhouseImage', 16, 16);
        let newTownImage = this.map.addTilesetImage('newTown', 'newTownImage', 16, 16);
        // creating the layers

        this.GrassLayer = this.map.createDynamicLayer('Grass', [groundtiles, castletiles, indoorcastletiles, beachtiles, ashlandtiles, atlastiles, darkdimensiontiles, underworldtiles, overworldtiles, farmhousetiles, newTownImage], 0, 0);
        this.ObstaclesLayer = this.map.createDynamicLayer('Obstacles', [groundtiles, castletiles, indoorcastletiles, beachtiles, ashlandtiles, atlastiles, darkdimensiontiles, underworldtiles, overworldtiles, farmhousetiles, newTownImage], 0, 0);
        this.ObstaclesLayer2 = this.map.createDynamicLayer('Obstacles2', [groundtiles, castletiles, indoorcastletiles, beachtiles, ashlandtiles, atlastiles, darkdimensiontiles, underworldtiles, overworldtiles, farmhousetiles, newTownImage], 0, 0);
        this.WaterLayer = this.map.createDynamicLayer('Water', [watertiles, groundtiles, castletiles, indoorcastletiles, beachtiles, ashlandtiles, atlastiles, darkdimensiontiles, underworldtiles, overworldtiles, farmhousetiles, newTownImage], 0, 0);
        this.BrueckenLayer = this.map.createDynamicLayer('Bruecken', [groundtiles, castletiles, indoorcastletiles, beachtiles, ashlandtiles, atlastiles, darkdimensiontiles, underworldtiles, overworldtiles, farmhousetiles, newTownImage], 0, 0);
        this.HiLayer = this.map.createDynamicLayer('HiBox', hitiles, 0, 0);

        //set obstacles and water as collider
        this.ObstaclesLayer.setCollisionByProperty({
            collides: true
        });
        this.ObstaclesLayer2.setCollisionByProperty({
            collides: true
        });
        this.WaterLayer.setCollisionByProperty({
            collides: true
        });
        this.GrassLayer.setCollisionByProperty({
            collides: true
        });
        this.BrueckenLayer.setCollisionByProperty({
            collides: true
        });

        // don't go out of the map
        this.physics.world.bounds.width = this.map.widthInPixels;
        this.physics.world.bounds.height = this.map.heightInPixels;
    }

    createAnimations() {
        //  animation with key 'left', we don't need left and right as we will use one and flip the sprite
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('player', {
                frames: [1, 7, 1, 13]
            }),
            frameRate: 10,
            repeat: -1
        });

        // animation with key 'right'
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('player', {
                frames: [1, 7, 1, 13]
            }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'up',
            frames: this.anims.generateFrameNumbers('player', {
                frames: [2, 8, 2, 14]
            }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'down',
            frames: this.anims.generateFrameNumbers('player', {
                frames: [0, 6, 0, 12]
            }),
            frameRate: 10,
            repeat: -1
        });
    }


    createPlayer(playerInfo) {
        // our player sprite created through the physics system

        this.MainCharacter = this.add.container(playerInfo.x, playerInfo.y);
        this.MainCharacter.setSize(16, 16);
        this.physics.world.enable(this.MainCharacter);

        this.MainCharacter.shot = false;
        this.MainCharacter.shot_orientation = 90 * Math.PI / 180;
        this.MainCharacter.health = 5;
        this.MainCharacter.maxHealth = 5;
        this.MainCharacter.message = '';

        let d = new Date();
        let timestamp = d.getTime();
        this.MainCharacter.bullets = this.physics.add.group({defaultKey: 'bullet'});
        this.MainCharacter.bullets.id = 0;
        this.MainCharacter.shot_timestamp = timestamp;

        // Create sprite
        this.playerSprite = this.add.sprite(0, 0, 'player', 6);

        // Create message
        this.messageText = this.add.text(0, -30, this.MainCharacter.message, {
            fontFamily: 'Arial',
            color: '#FFFFFF',
            align: 'center',
        }).setFontSize(14);
        this.messageText.setOrigin(0.5);

        this.nickname = this.add.text(-8, -20, playerInfo.nickname, {
            fontFamily: 'Arial',
            color: '#00000',
            align: 'center',
        }).setFontSize(12);

        // Create life bar
        this.lifeBar = this.add.graphics();

        // Register with container
        this.MainCharacter.add(this.playerSprite);
        this.MainCharacter.add(this.lifeBar);
        this.MainCharacter.add(this.messageText);
        this.MainCharacter.add(this.nickname);

        // update camera
        this.updateCamera();

        // don't go out of the map
        this.MainCharacter.body.setCollideWorldBounds(true);

        //add colliders to player
        this.physics.add.collider(this.MainCharacter, this.spawns);
        this.physics.add.collider(this.MainCharacter, this.WaterLayer);
        this.physics.add.collider(this.MainCharacter, this.ObstaclesLayer);
        this.physics.add.collider(this.MainCharacter, this.ObstaclesLayer2);
        this.physics.add.collider(this.MainCharacter, this.BrueckenLayer);

        for (let i = 0; i < this.QuestionMaster.length; i++) {
            //console.log('MainCharacter: ', this.MainCharacter, ' QuestionMaster[', i, ']: ', this.QuestionMaster[i]);
            this.physics.add.collider(this.MainCharacter, this.QuestionMaster[i], this.onMeetQuestionMaster, null, this);
        }
    }

    addOtherPlayers(playerInfo) {
        const otherPlayer = this.add.container(playerInfo.x, playerInfo.y);
        otherPlayer.setSize(16, 16);

        // Add properties
        otherPlayer.playerId = playerInfo.playerId;
        otherPlayer.sprite = this.add.sprite(0, 0, 'player', 6);
        otherPlayer.lifeBar = this.add.graphics();
        otherPlayer.health = playerInfo.health;
        otherPlayer.maxHealth = 5;
        otherPlayer.message = '';
        otherPlayer.messageText = this.add.text(0, -30, otherPlayer.message, {
            fontFamily: 'Arial',
            color: '#FFFFFF',
            align: 'center',
        }).setFontSize(14);
        otherPlayer.name = this.add.text(0, 0, playerInfo.nickname, {
            fontFamily: 'Arial',
            color: '#00000',
            align: 'center',
        }).setFontSize(14);
        otherPlayer.messageText.setOrigin(0.5);

        // Register with container
        otherPlayer.add(otherPlayer.sprite);
        otherPlayer.add(otherPlayer.lifeBar);
        otherPlayer.add(otherPlayer.messageText);
        otherPlayer.add(otherPlayer.name);


        this.otherPlayers.add(otherPlayer);
    }

    updateCamera() {
        // limit camera to map
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(this.MainCharacter);
        this.cameras.main.roundPixels = true; // avoid tile bleed
    }

    createQuestionMasters() {
        let demontile = this.map.addTilesetImage('demon', 'demonImage', 16, 16);
        let enttile = this.map.addTilesetImage('dark-ent', 'entImage', 16, 16);
        let wolftile = this.map.addTilesetImage('wolf', 'wolfImage', 16, 16);
        let rpgtile = this.map.addTilesetImage('rpg', 'rpgImage', 16, 16);
        let atlastiles = this.map.getTileset('atlas');
        let underworldtiles = this.map.getTileset('underworld');
        for (let i = 0; i < 30; i++) {
            let mastername = 'Questionmaster' + (i + 1);
            this.QuestionMaster[i] = this.map.createDynamicLayer(mastername, [demontile, atlastiles, rpgtile, underworldtiles, wolftile, enttile], 0, 0);
            this.QuestionMaster[i].setCollisionByProperty({
                collides: true
            });
        }
    }

    onMeetQuestionMaster(player, questionmaster) {
        if (Date.now() > this.colliderActivatedTimer) {
            this.colliderActivatedTimer = new Date(Date.now() + 1000);
            let text = questionmaster.layer.properties[2].value;
            let message = questionmaster.layer.properties[1].value;

            const pubKey = forge.pki.publicKeyFromPem(`-----BEGIN PUBLIC KEY-----
        MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA525oXTwl4BLJdKasUpq+
        LAegNdtVi/W4T22l4CH2jKKsSaTKmpxOSHiNEFaiUadGx/u1oWQbztN0Y2uMz7di
        6s+kcu2vKRZMmFA9wIJMcIDgRTwMovE00Ly+exaM2muL0+KT0vKIUz/uhdRjdqIM
        G26HVGuYEKSG5CRLunlN0YJ4UmPl1oek6ZZiDaM3/a5aLwnM7y4butPI+MpGIhfA
        PrnFLgp2TpGZDFNDsYDWA8+z0RrqtKkZ1/X61diUNUSePBE4CeS57qOdKB3tvQaO
        Gy9TC0515utvA7t1CDm2m8Fquvb9IDf05KV4qPWea45T7pHzeG/pjoCrJFPh3JuQ
        RQIDAQAB
        -----END PUBLIC KEY-----`);
            this.time.delayedCall(500, this.setFocusToGame, null, this);
            let bytes = forge.util.createBuffer(message, 'utf8').getBytes();
            message = forge.util.bytesToHex(pubKey.encrypt(bytes));

            $.ajax({
                type: 'POST',
                url: '/get-question',
                data: {
                    message,
                    refreshToken: getCookie('refreshJwt')
                },
                success: function (data) {
                    let questionlink = data.responseText;
                    if (questionlink !== "") {
                        const modalText = document.getElementById("modaltext");
                        const modalWindow = document.getElementById("myModal");
                        modalText.innerHTML = text;
                        let a = document.createElement('a');

                        //Load clicked link in a new tab
                        a.setAttribute("target", "_blank");
                        a.setAttribute("rel", "noopener noreferrer");

                        // Create the text node for anchor element.
                        let link = document.createTextNode("hier");

                        // Set the title.
                        a.title = "QuestionMaster";

                        // Set the href property.
                        a.href = questionlink;

                        // Append the text node to anchor element.
                        a.appendChild(link);

                        // Append the anchor element to the body.
                        modalText.appendChild(a);

                        modalWindow.style.display = "block";
                    }
                },
                error: function (xhr) {
                    console.log('error: ', xhr);
                }
            });
        } else {
            this.colliderActivatedTimer = new Date(Date.now() + 1000);
        }
    }

    setFocusToGame() {
        document.getElementById("content").focus();
    }

    createUIElements() {

        const logout = document.getElementById('logoutbutton').addEventListener('click', this.logout);
        const backtostart = document.getElementById('backtostart').addEventListener('click', this.resetposition);

        const modalWindow = document.getElementById("myModal");    // Get the <span> element that closes the modal
        let sceneWindow = this.scene;
        let span = document.getElementsByClassName("close")[0];

        // When the user clicks on <span> (x), close the modal
        span.onclick = function () {
            modalWindow.style.display = "none";
            //sceneWindow.resume('WorldScene');
        };

        // When the user clicks anywhere outside of the modal, close it
        window.onclick = function (event) {
            if (event.target === modalWindow) {
                modalWindow.style.display = "none";
                //sceneWindow.resume('WorldScene');
            }
        };
    }

    createMessageElement() {
        const inputMessage = document.getElementById('inputMessage');

        window.addEventListener('keydown', event => {
            if (event.which === 13) {
                sendMessage();
                this.setFocusToGame();
            }
            if (event.which === 32) {
                if (document.activeElement === inputMessage) {
                    inputMessage.value = inputMessage.value + ' ';
                    this.setFocusToGame();
                }
            }
        });

        var that = this;

        function sendMessage() {
            let message = inputMessage.value;
            const max_length = 30;
            let length = message.length;
            if (length > max_length) {
                message = message.substring(0, max_length);
                message += "[...]";
            }

            if (message) {
                inputMessage.value = '';
                that.socket.emit('message', {
                    message: message
                });
            }
        }
    }


    update() {
        if (this.MainCharacter) {
            this.MainCharacter.body.setVelocity(0);

            let up = this.cursors.up.isDown;
            let down = this.cursors.down.isDown;
            let left = this.cursors.left.isDown;
            let right = this.cursors.right.isDown;


            if (!left && right && !up && !down) {
                // right
                this.MainCharacter.body.setVelocityX(this.v);
                this.MainCharacter.shot_orientation = 0;
            } else if (!left && down && !up && right) {
                // right - down
                this.MainCharacter.body.setVelocityX(this.v_diag);
                this.MainCharacter.body.setVelocityY(this.v_diag);
                this.MainCharacter.shot_orientation = 45 * Math.PI / 180;
            } else if (!left && down && !up && !right) {
                // down
                this.MainCharacter.body.setVelocityY(this.v);
                this.MainCharacter.shot_orientation = 90 * Math.PI / 180;
            } else if (left && down && !up && !right) {
                // down + left
                this.MainCharacter.body.setVelocityX(-this.v_diag);
                this.MainCharacter.body.setVelocityY(this.v_diag);
                this.MainCharacter.shot_orientation = 135 * Math.PI / 180;
            } else if (left && !down && !up && !right) {
                // left
                this.MainCharacter.body.setVelocityX(-this.v);
                this.MainCharacter.shot_orientation = 180 * Math.PI / 180;
            } else if (left && !down && up && !right) {
                // left + up
                this.MainCharacter.body.setVelocityX(-this.v_diag);
                this.MainCharacter.body.setVelocityY(-this.v_diag);
                this.MainCharacter.shot_orientation = 225 * Math.PI / 180;
            } else if (!left && !down && up && !right) {
                // up
                this.MainCharacter.body.setVelocityY(-this.v_diag);
                this.MainCharacter.shot_orientation = 270 * Math.PI / 180;
            } else if (!left && !down && up && right) {
                // up + right
                this.MainCharacter.body.setVelocityX(this.v_diag);
                this.MainCharacter.body.setVelocityY(-this.v_diag);
                this.MainCharacter.shot_orientation = 315 * Math.PI / 180;
            }


            // Update the animation last and give left/right animations precedence over up/down animations
            if (left && !right) {
                this.playerSprite.anims.play('left', true);
                this.playerSprite.flipX = true;
            } else if (!left && right) {
                this.playerSprite.anims.play('right', true);
                this.playerSprite.flipX = false;
            } else if (up && !down) {
                this.playerSprite.anims.play('up', true);
            } else if (!up && down) {
                this.playerSprite.anims.play('down', true);
            } else {
                this.playerSprite.anims.stop();
            }

            // emit player movement
            let x = this.MainCharacter.x;
            let y = this.MainCharacter.y;

            let stopped = true;
            if (this.MainCharacter.oldPosition) {
                if ((x === this.MainCharacter.oldPosition.x) && (y === this.MainCharacter.oldPosition.y)) {
                    stopped = true;
                } else {
                    stopped = false;
                }

                let stop_update = false;
                if (stopped && !this.MainCharacter.oldPosition.stopped) {
                    stop_update = true;
                }

                let update = (x !== this.MainCharacter.oldPosition.x) || (y !== this.MainCharacter.oldPosition.y) || stop_update;
                if (update) {
                    //this.colliderActivated = false;
                    this.socket.emit('playerMovement', {
                        x,
                        y
                    });
                }
            }

            // save old position data
            this.MainCharacter.oldPosition = {
                x: this.MainCharacter.x,
                y: this.MainCharacter.y,
                stopped: stopped
            };

            // Shoot bullet
            let d = new Date();
            let timestamp = d.getTime();
            let is_active = document.activeElement !== document.getElementById('inputMessage');
            let dt = Math.abs(timestamp - this.MainCharacter.shot_timestamp);
            if (this.spaceBar.isDown && !this.MainCharacter.shot && is_active && dt > 500) {
                this.MainCharacter.shot = true;
                this.MainCharacter.shot_timestamp = timestamp;

                let speed_x = Math.cos(this.MainCharacter.shot_orientation) * 250;
                let speed_y = Math.sin(this.MainCharacter.shot_orientation) * 250;
                let bullet = this.MainCharacter.bullets.get(this.MainCharacter.x, this.MainCharacter.y);
                bullet.setVelocity(speed_x, speed_y);
                bullet.id = this.MainCharacter.bullets.id;
                this.MainCharacter.bullets.id++;

                if (this.MainCharacter.bullets.id > 9999) {
                    this.MainCharacter.bullets.id = 0;
                }

                let that = this;

                function on_local_bullet_collide(_bullet, _obstacle) {
                    that.socket.emit('client-destroy-bullet', {
                        id: _bullet.id
                    });
                    _bullet.destroy();
                }

                this.physics.add.collider(this.MainCharacter.bullets, this.spawns, on_local_bullet_collide);
                this.physics.add.collider(this.MainCharacter.bullets, this.WaterLayer, on_local_bullet_collide);
                this.physics.add.collider(this.MainCharacter.bullets, this.ObstaclesLayer, on_local_bullet_collide);
                this.physics.add.collider(this.MainCharacter.bullets, this.BrueckenLayer, on_local_bullet_collide);
                for (let i = 0; i < this.QuestionMaster.length; i++) {
                    this.physics.add.collider(this.MainCharacter.bullets, this.QuestionMaster[i], on_local_bullet_collide);
                }

                this.MainCharacter.shot = true;
                this.socket.emit('shoot-bullet', {
                    x: this.MainCharacter.x,
                    y: this.MainCharacter.y,
                    angle: this.MainCharacter.shot_orientation,
                    speed_x: speed_x,
                    speed_y: speed_y,
                    id: bullet.id
                });
            }

            if (!this.spaceBar.isDown) {
                this.MainCharacter.shot = false;
            }


            // Check if characters hit
            this.otherPlayers.getChildren().forEach(function (player) {
                if (player.alpha < 1) {
                    player.alpha += (1 - player.alpha) * 0.16;
                } else {
                    player.alpha = 1;
                }
            });

            if (this.MainCharacter.alpha < 1) {
                this.MainCharacter.alpha += (1 - this.MainCharacter.alpha) * 0.16;
            } else {
                this.MainCharacter.alpha = 1;
            }

            this.redrawLifebars();

            this.redrawMessages();
        }
    }
}

var config = {
    type: Phaser.AUTO,
    parent: 'content',
    zoom: 2,
    width: width,
    height: height,
    scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    pixelArt: true,
    fps: {
        target: 30
    },
    physics: {
        default:
            'arcade',
        arcade: {
            gravity: {
                y: 0
            },
            debug: false // set to true to view zones
        }
    },
    scene: [
        BootScene,
        WorldScene
    ]
};
var game;
window.onload = function () {
    if (game !== undefined) {
        game.destroy();
    }
    game = new Phaser.Game(config);
}

window.onunload = function () {
    game.destroy();
};

window.addEventListener('load', function () {
    let containerdiv = document.getElementById('content');
    containerdiv.addEventListener('click', function (e) {
        let message = document.getElementById('inputMessage');
        message.blur();
    }, false);
});
