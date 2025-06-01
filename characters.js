// 1. Base Character System (Keep your existing system)
//characters.js
const JUDGEMENT_CUT_CONSTANTS = {
    SLIDE_DURATION: 5000,        // How long shards slide before falling (5 seconds)
    SLIDE_SPEED: 2,              // Speed of the sliding animation
    FALL_INITIAL_VY: -7,         // Initial vertical velocity when shards start falling
    FALL_VX_RANGE: 3,            // Range of horizontal velocity for falling shards
    LINE_DISPLAY_DURATION: 1100, // How long the white lines are displayed
    LINE_APPEAR_INTERVAL: 50,    // Time between each line appearing
    FIRST_THREE_INTERVAL: 50,    // Interval for first 3 lines
    REMAINING_LINES_DELAY: 200   // Extra delay before remaining lines appear
};

const CharacterSystem = {
    characters: {},
    
    register: function(id, config) {
        // Merge with base character template
        this.characters[id] = {
            ...BaseCharacter,
            ...config,
            abilities: {
                ...BaseCharacter.abilities,
                ...config.abilities
            }
        };
        console.log(`Character '${id}' registered`);
    },
    
    get: function(id) {
        return this.characters[id] || this.characters['default'];
    },
    
    applyTo: function(player, charId) {
        const character = this.get(charId);
        
        // Set basic character properties
        player.charId = charId;
        player.color = character.color || "#42a5f5";
        
        // Initialize animation controller if sprites are defined
        if (character.sprites) {
            player.animations = AnimationSystem.createAnimationController();
            
            // Add each animation from the sprites configuration
            Object.keys(character.sprites).forEach(animName => {
                const animConfig = character.sprites[animName];
                player.animations.add(AnimationSystem.createAnimation({
                    name: animName,
                    src: animConfig.src,
                    frameCount: animConfig.frameCount || 1,
                    frameDuration: animConfig.frameDuration || 100,
                    frameWidth: animConfig.frameWidth || PLAYER_SIZE,
                    frameHeight: animConfig.frameHeight || PLAYER_SIZE,
                    loop: animConfig.loop !== undefined ? animConfig.loop : true,
                    autoPlay: animConfig.autoPlay !== undefined ? animConfig.autoPlay : (animName === 'idle'),
                    row: animConfig.row || 0,
                    flipX: animConfig.flipX || false,
                    onComplete: animConfig.onComplete || null
                }));
            });
            
            // Add animation helpers
            player.setAnimation = function(state) {
                if (this.animations && this.animations.animations[state]) {
                    this.animations.play(state);
                    return true;
                }
                return false;
            };
            
            player.updateAnimation = function() {
                if (this.animations) {
                    this.animations.update();
                }
            };
        }
        
        // Apply character initialization if available
        if (character.init) {
            character.init(player);
        }
        
        // Apply custom update method if available
        if (character.update) {
            player.characterUpdate = character.update;
        }
        
        // Apply ability methods
        player.keyPress = function(key, pressCount) {
            if (!this.movement) return;
            if (character.abilities.keyPress) {
                character.abilities.keyPress.call(this, key, pressCount);
            }
        };
        
        player.keyPresses = function(key, count) {
            if (!this.movement) return;
            if (character.abilities.keyPresses) {
                character.abilities.keyPresses.call(this, key, count);
            }
        };
        
        player.keyHold = function(key, duration) {
            if (character.abilities.keyHold) {
                character.abilities.keyHold.call(this, key, duration);
            }
        };
        
        player.keyRelease = function(key, duration) {
            this.chargingLogged[key] = false;
            if (character.abilities.keyRelease) {
                character.abilities.keyRelease.call(this, key, duration);
            }
        };
        
        // Apply render method
        player.render = character.render || function(ctx) {
            if (this.animations) {
                this.animations.draw(ctx, this.x, this.y, this.facing);
            } else {
                ctx.fillStyle = this.color;
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 3;
                ctx.fillRect(this.x, this.y, this.w, this.h);
                ctx.strokeRect(this.x, this.y, this.w, this.h);
            }
        };


        
        return player;
    }
};

// 2. Base Character Template
const BaseCharacter = {
    name: "Unknown",
    color: "#808080",
    abilities: {
        keyPresses: function(key, count) {
            const controls = getControls(this.id);
            if ((key === controls.right || key === controls.left) && count === 2 && this.dashCooldown === 0) {
                AbilityLibrary.dash(this, key === controls.right ? 1 : -1);
            }
        }
    }
};

// const abilitylibrary exist here before

// registered Characters lied here before
