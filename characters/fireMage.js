CharacterSystem.register('fireMage', {
    ...BaseCharacter,
    name: "Fire Mage",
    color: "#e74c3c",

    init: function(player) {
        player.fireballs = [];
        player.fireballCooldown = 0;
        player.isChanneling = false;
        player.fireShield = 0;
        player.fireTrail = null;
        player.chargeTime = 0;
    },

    sprites: {
        idle: {
            src: createPlaceholderSprite("#e74c3c", 4, 54, 54),
            frameCount: 4,
            frameDuration: 250,
            frameWidth: 54,
            frameHeight: 54,
            loop: true,
            autoPlay: true
        },
        casting: {
            src: createPlaceholderSprite("#f39c12", 3, 54, 54),
            frameCount: 3,
            frameDuration: 150,
            frameWidth: 54,
            frameHeight: 54,
            loop: true,
            autoPlay: false
        },
        walking: {
            src: createPlaceholderSprite("#e74c3c", 6, 54, 54),
            frameCount: 6,
            frameDuration: 120,
            frameWidth: 54,
            frameHeight: 54,
            loop: true,
            autoPlay: false
        }
    },

    abilities: {
        keyPress: function(key, pressCount) {
            const controls = getControls(this.id);
            
            // Fireball
            if (key === controls.special) {
                AbilityLibrary.throwFireball(this);
            }
            
            // Fire shield
            if (key === controls.down && this.onGround) {
                AbilityLibrary.fireShield(this, 0);
            }
            
            // Flame dash
            if (key === controls.up) {
                AbilityLibrary.flameDash(this, 0);
            }
        },

        keyPresses: function(key, count) {
            const controls = getControls(this.id);
            
            // Enhanced fire dash
            if ((key === controls.left || key === controls.right) && count === 2 && this.dashCooldown === 0) {
                const direction = key === controls.right ? 1 : -1;
                AbilityLibrary.dash(this, direction, 1.2);
                
                // Create fire trail effect
                this.fireTrail = {
                    x: this.x,
                    y: this.y,
                    duration: 20
                };
                log(`${this.name} dashes with fire trail!`);
            }
        },

        keyHold: function(key, duration) {
            const controls = getControls(this.id);
            
            if (key === controls.special && duration > 800) {
                if (!this.chargingLogged[key]) {
                    this.isChanneling = true;
                    this.chargeTime = duration;
                    if (this.setAnimation) {
                        this.setAnimation('casting');
                    }
                    log(`${this.name} channels fire magic...`);
                    this.chargingLogged[key] = true;
                }
            }
        },

        keyRelease: function(key, duration) {
            const controls = getControls(this.id);
            
            if (key === controls.special && this.isChanneling) {
                this.isChanneling = false;
                this.chargeTime = 0;
                
                if (duration > 2500) {
                    // Meteor strike (long channel)
                    AbilityLibrary.meteorStrike(this, 2);
                } else if (duration > 1000) {
                    // Fire burst (medium channel)
                    AbilityLibrary.fireBurst(this, 120, 18);
                }
                
                if (this.setAnimation) {
                    this.setAnimation('idle');
                }
            }
        }
    },

    update: function() {
        // Handle cooldowns
        if (this.fireballCooldown > 0) this.fireballCooldown--;
        if (this.fireShield > 0) this.fireShield--;
        
        // Update fire trail
        if (this.fireTrail && this.fireTrail.duration > 0) {
            this.fireTrail.duration--;
            if (this.fireTrail.duration <= 0) {
                this.fireTrail = null;
            }
        }
        
        // Update fireballs and meteors
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const projectile = this.fireballs[i];
            
            // Update position
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            
            // Add gravity to meteors
            if (projectile.isMeteor) {
                projectile.vy += GRAVITY * 0.5;
            }
            
            // Update trail
            if (projectile.trail) {
                projectile.trail.push({x: projectile.x, y: projectile.y});
                if (projectile.trail.length > 5) projectile.trail.shift();
            }
            
            // Check collision with opponents
            for (let j = 0; j < players.length; j++) {
                const opponent = players[j];
                if (opponent !== this && opponent.alive &&
                    projectile.x < opponent.x + opponent.w &&
                    projectile.x + projectile.w > opponent.x &&
                    projectile.y < opponent.y + opponent.h &&
                    projectile.y + projectile.h > opponent.y) {
                    
                    // Hit opponent
                    opponent.hp -= projectile.damage;
                    opponent.justHit = 10;
                    
                    if (projectile.isMeteor) {
                        knockback(this, opponent, 12, -8);
                        log(`${this.name}'s METEOR hit ${opponent.name} for ${projectile.damage} damage!`);
                        
                        // Meteor splash damage
                        for (let k = 0; k < players.length; k++) {
                            const splashTarget = players[k];
                            if (splashTarget !== this && splashTarget !== opponent && splashTarget.alive) {
                                const distance = Math.abs(splashTarget.x - projectile.x);
                                if (distance < 60) {
                                    const splashDamage = Math.round(10 * (1 - distance / 60));
                                    splashTarget.hp -= splashDamage;
                                    splashTarget.justHit = 10;
                                    log(`Meteor splash hit ${splashTarget.name} for ${splashDamage} damage!`);
                                }
                            }
                        }
                    } else {
                        knockback(this, opponent, 3, -2);
                        log(`${this.name}'s fireball hit ${opponent.name} for ${projectile.damage} damage!`);
                    }
                    
                    this.fireballs.splice(i, 1);
                    break;
                }
            }
            
            // Ground collision for meteors
            if (projectile.isMeteor && projectile.y + projectile.h >= FLOOR) {
                // Create impact effect and splash damage
                for (let j = 0; j < players.length; j++) {
                    const opponent = players[j];
                    if (opponent !== this && opponent.alive) {
                        const distance = Math.abs(opponent.x - projectile.x);
                        if (distance < 80) {
                            const damage = Math.round(15 * (1 - distance / 80));
                            opponent.hp -= damage;
                            opponent.justHit = 10;
                            knockback(this, opponent, 8, -5);
                            log(`Meteor impact hit ${opponent.name} for ${damage} damage!`);
                        }
                    }
                }
                this.fireballs.splice(i, 1);
                continue;
            }
            
            // Remove if out of bounds
            if (projectile.x < -50 || projectile.x > WIDTH + 50 || projectile.y > HEIGHT + 50) {
                this.fireballs.splice(i, 1);
            }
        }
        
        // Safe animation switching
        if (!this.isChanneling && this.setAnimation) {
            if (Math.abs(this.vx) > 0.5 && this.onGround) {
                this.setAnimation('walking');
            } else {
                this.setAnimation('idle');
            }
        }
    },

    render: function(ctx) {
        // Main character
        if (this.animations) {
            this.animations.draw(ctx, this.x, this.y, this.facing);
        } else {
            ctx.fillStyle = this.color;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 3;
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.strokeRect(this.x, this.y, this.w, this.h);
        }
        
        // Fire shield effect
        if (this.fireShield > 0) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = "#ff6b35";
            ctx.lineWidth = 4 + 2 * Math.sin(performance.now() / 100);
            ctx.beginPath();
            ctx.arc(this.x + this.w/2, this.y + this.h/2, 
                   this.w * 0.8 + 5 * Math.sin(performance.now() / 80), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        
        // Fire trail effect
        if (this.fireTrail && this.fireTrail.duration > 0) {
            ctx.save();
            ctx.globalAlpha = this.fireTrail.duration / 20;
            ctx.fillStyle = "#ff6b35";
            ctx.fillRect(this.fireTrail.x, this.fireTrail.y, this.w, this.h);
            ctx.restore();
        }
        
        // Channeling effect
        if (this.isChanneling) {
            ctx.save();
            ctx.globalAlpha = 0.8;
            const intensity = Math.sin(performance.now() / 100) * 0.3 + 0.7;
            
            for (let i = 0; i < 4; i++) {
                ctx.fillStyle = `hsl(${10 + i * 15}, 100%, ${50 + i * 10}%)`;
                ctx.beginPath();
                ctx.arc(this.x + this.w/2, this.y - 15 - i * 10, 
                       4 + 3 * Math.sin(performance.now() / 150 + i) * intensity, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
        
        // Draw projectiles with trails and effects
        this.fireballs.forEach(projectile => {
            // Draw trail
            if (projectile.trail) {
                ctx.save();
                ctx.globalAlpha = 0.4;
                projectile.trail.forEach((point, i) => {
                    const alpha = (i + 1) / projectile.trail.length;
                    ctx.globalAlpha = 0.4 * alpha;
                    ctx.fillStyle = projectile.isMeteor ? "#8b0000" : "#ff4757";
                    ctx.beginPath();
                    ctx.arc(point.x + projectile.w/2, point.y + projectile.h/2, 
                           (i + 1) * 2, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.restore();
            }
            
            // Draw main projectile
            ctx.fillStyle = projectile.color;
            ctx.beginPath();
            ctx.arc(projectile.x + projectile.w/2, projectile.y + projectile.h/2, 
                   projectile.w/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Glow effect
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = projectile.isMeteor ? "#ff4500" : "#ffa500";
            ctx.beginPath();
            ctx.arc(projectile.x + projectile.w/2, projectile.y + projectile.h/2, 
                   projectile.w * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Meteor special effects
            if (projectile.isMeteor) {
                ctx.save();
                ctx.globalAlpha = 0.6;
                ctx.strokeStyle = "#ff0000";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(projectile.x + projectile.w/2, projectile.y + projectile.h/2, 
                       projectile.w/2 + 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });
    }
});
