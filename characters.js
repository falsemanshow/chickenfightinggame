// 1. Base Character System (Keep your existing system)
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

// 3. Ability Library (New Addition)
const AbilityLibrary = {
    dash: function(character, direction, speedMultiplier = 1) {
        character.vx = direction * DASH_SPEED * speedMultiplier;
        character.dash = DASH_FRAMES;
        character.dashCooldown = DASH_COOLDOWN;
        log(`${character.name} dashes ${direction > 0 ? "right" : "left"}!`);
    },
    
    groundSmash: function(character, power = 1, costPoints = 1) {
        if (!character.onGround && !character.isSmashing && character.points >= costPoints) {
            character.isSmashing = true;
            character.vy = 20;
            character.vx = 0;
            const heightFromGround = FLOOR - (character.y + character.h);
            character.smashImpactPower = Math.min(35, Math.max(15, heightFromGround / 8)) * power;
            points(character, -costPoints);
            return true;
        }
        return false;
    },
    
    superJump: function(character, multiplier = 1.5, costPoints = 0) {
        if (costPoints === 0 || character.points >= costPoints) {
            if (costPoints > 0) points(character, -costPoints);
            character.vy = -JUMP_VEL * multiplier;
            return true;
        }
        return false;
    }
};

// 4. Character Definitions (Updated with new structure)
CharacterSystem.register('default', {
    ...BaseCharacter,
    name: "Fighter"
});

CharacterSystem.register('gold', {
    ...BaseCharacter,
    name: "Gold",
    color: "#42a5f5",
    abilities: {
        keyHold: function(key, duration) {
            const controls = getControls(this.id);
            if (key === controls.special && duration > 1000) {
                if (!this.chargingLogged[key]) {
                    log("Gold is charging power!");
                    this.chargingLogged[key] = true;
                }
            }
        },
        keyRelease: function(key, duration) {
            const controls = getControls(this.id);
            if (key === controls.special && duration > 1000) {
                AbilityLibrary.superJump(this, 1.5);
                log("Gold released a super jump!");
            }
        }
    }
});

CharacterSystem.register('berry', {
    ...BaseCharacter,
    name: "Berry",
    color: "#ef5350",
    abilities: {
        keyHold: function(key, duration) {
            const controls = getControls(this.id);
            if (key === controls.special && duration > 1000) {
                if (!this.chargingLogged[key]) {
                    AbilityLibrary.superJump(this, 2.0, 1);
                    log("Berry is charging a jump!");
                }
            }
        }
    }
});

CharacterSystem.register('smasher', {
    ...BaseCharacter,
    name: "Smasher",
    color: "#ff5722",
    
    init: function(player) {
        player.isSmashing = false;
        player.smashImpactPower = 0;
        player.impactRadius = 0;
        player.maxImpactRadius = 120;
        player.impactDuration = 0;
    },
    
    abilities: {
        keyPress: function(key, pressCount) {
            const controls = getControls(this.id);
            if (key === controls.down) {
                if (AbilityLibrary.groundSmash(this, 1, 1)) {
                    log(`${this.name} initiates GROUND SMASH! (-1 point, ${this.points} remaining)`);
                }
            }
        },
        
        keyRelease: function(key, duration) {
            const controls = getControls(this.id);
            if (key === controls.special && !this.onGround && duration > 300) {
                if (AbilityLibrary.groundSmash(this, 1.5, 2)) {
                    log(`${this.name} initiates SUPER GROUND SMASH! (-2 points, ${this.points} remaining)`);
                }
            }
        }
    },
    
    update: function() {
        // Keep your existing update logic for Smasher
        if (this.impactDuration > 0) {
            this.impactDuration--;
            this.impactRadius = this.maxImpactRadius * (1 - this.impactDuration / 20);
        }
        
        if (this.isSmashing && this.onGround) {
            this.impactDuration = 20;
            this.impactRadius = 0;
            
            for (let i = 0; i < players.length; i++) {
                let opponent = players[i];
                if (opponent !== this && opponent.alive) {
                    const dx = (opponent.x + opponent.w/2) - (this.x + this.w/2);
                    const dy = (opponent.y + opponent.h/2) - (this.y + this.h/2);
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    
                    if (distance < this.maxImpactRadius) {
                        const damageMultiplier = 1 - (distance / this.maxImpactRadius);
                        const damage = Math.round(this.smashImpactPower * damageMultiplier);
                        
                        if (damage > 0) {
                            opponent.hp -= damage;
                            opponent.justHit = 10;
                            opponent.vx = (dx !== 0) ? Math.sign(dx) * 15 : 0;
                            opponent.vy = -10;
                            log(`${this.name}'s GROUND SMASH hit ${opponent.name} for ${damage} damage!`);
                        }
                    }
                }
            }
            
            this.isSmashing = false;
            this.vy = -5;
        }
    },
    
    render: function(ctx) {
        // Keep your existing render logic for Smasher
        ctx.fillStyle = this.color;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeRect(this.x, this.y, this.w, this.h);
        
        if (!this.onGround && !this.isSmashing) {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = "#ffeb3b";
            ctx.beginPath();
            ctx.moveTo(this.x + this.w/2, this.y + this.h);
            ctx.lineTo(this.x + this.w/2 - 15, this.y + this.h + 15);
            ctx.lineTo(this.x + this.w/2 + 15, this.y + this.h + 15);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        
        if (this.isSmashing) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = "#f44336";
            ctx.beginPath();
            ctx.moveTo(this.x + this.w/2, this.y + this.h);
            ctx.lineTo(this.x + this.w/2 - 20, this.y + this.h + 30);
            ctx.lineTo(this.x + this.w/2 + 20, this.y + this.h + 30);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        
        if (this.impactDuration > 0) {
            ctx.save();
            const gradient = ctx.createRadialGradient(
                this.x + this.w/2, FLOOR, 0,
                this.x + this.w/2, FLOOR, this.impactRadius
            );
            gradient.addColorStop(0, 'rgba(255, 87, 34, 0.8)');
            gradient.addColorStop(0.7, 'rgba(255, 87, 34, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 87, 34, 0)');
            
            ctx.globalAlpha = this.impactDuration / 20;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x + this.w/2, FLOOR, this.impactRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            const crackCount = 5;
            for (let i = 0; i < crackCount; i++) {
                const angle = (Math.PI * 2 * i / crackCount) + (Math.random() * 0.5);
                const length = this.impactRadius * 0.7 * (0.7 + Math.random() * 0.3);
                
                ctx.moveTo(this.x + this.w/2, FLOOR);
                ctx.lineTo(
                    this.x + this.w/2 + Math.cos(angle) * length,
                    FLOOR + Math.sin(angle) * length * 0.2
                );
            }
            ctx.stroke();
            ctx.restore();
        }
    }
});
