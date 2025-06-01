
CharacterSystem.register('zombieRider', {
    ...BaseCharacter,
    name: "Zombie Rider",
    color: "#8BC34A",

    // Initialize zombieRider character
    init: function(player) {
        player.isFired = false; // Tracks if the zombie has been fired
        player.zombie = null; // The zombie projectile
        player.chicken = null; // The chicken running after firing
        player.zombieLatchTime = 0; // Timer for how long zombie is latched
        player.latchedOpponent = null; // Which opponent the zombie is latched to
    },

    // Abilities for zombieRider
    abilities: {
        keyPress: function(key) {
            const controls = getControls(this.id);

            // Special ability: Fire the zombie as a projectile
            if (key === controls.special) {
                if (!this.isFired) {
                    // Fire the zombie
                    this.isFired = true;

                    // Create zombie projectile with gravity
                    this.zombie = {
                        x: this.x + (this.facing > 0 ? this.w : -20),
                        y: this.y,
                        vx: this.facing * 8, // Horizontal velocity
                        vy: -2, // Initial upward velocity (slight jump)
                        w: this.w * 0.6,
                        h: this.h * 0.6,
                        color: "#689F38",
                        isRunning: true, // Flag to indicate it's running
                        onGround: false
                    };

                    log(`Raaaaaahhh`);
                }
            }
        }
    },

    // Update logic for zombieRider
    update: function() {
        // Update zombie projectile
        if (this.zombie && !this.latchedOpponent) {
            if (this.zombie.isRunning) {
                // Apply gravity to zombie
                this.zombie.vy += GRAVITY;
                
                // Update zombie position
                this.zombie.x += this.zombie.vx;
                this.zombie.y += this.zombie.vy;

                // Check if zombie hits the ground
                this.zombie.onGround = false;
                if (this.zombie.y + this.zombie.h >= FLOOR) {
                    this.zombie.y = FLOOR - this.zombie.h;
                    this.zombie.vy = 0;
                    this.zombie.onGround = true;
                }

                // Check platform collisions for zombie
                for (let plat of platforms) {
                    if (this.zombie.vy >= 0 &&
                        this.zombie.x + this.zombie.w > plat.x &&
                        this.zombie.x < plat.x + plat.w &&
                        this.zombie.y + this.zombie.h > plat.y &&
                        this.zombie.y + this.zombie.h - this.zombie.vy <= plat.y + PLATFORM_HEIGHT) {
                        this.zombie.y = plat.y - this.zombie.h;
                        this.zombie.vy = 0;
                        this.zombie.onGround = true;
                        break;
                    }
                }
            }

            // Check collision with opponents
            for (let i = 0; i < players.length; i++) {
                const opponent = players[i];
                if (opponent !== this && opponent.alive && 
                    this.zombie.x < opponent.x + opponent.w &&
                    this.zombie.x + this.zombie.w > opponent.x &&
                    this.zombie.y < opponent.y + opponent.h &&
                    this.zombie.y + this.zombie.h > opponent.y) {
                    
                    // Zombie latches onto opponent
                    this.latchedOpponent = opponent;
                    this.zombieLatchTime = 300; // 5 seconds at 60fps
                    this.zombie.isRunning = false;
                    setParalyzed(opponent, 180); // Paralyze for 3 seconds
                    log(`${this.name}'s zombie latched onto ${opponent.name} and paralyzed them!`);
                    break;
                }
            }

            // Check for collision with walls (remove zombie if hits wall)
            if (this.zombie.x < 0 || this.zombie.x + this.zombie.w > WIDTH) {
                log("Zombie projectile hit a wall and disappeared!");
                this.zombie = null;
            }

            // Remove zombie if it falls off the screen
            if (this.zombie && this.zombie.y > HEIGHT) {
                log("Zombie fell off the screen!");
                this.zombie = null;
            }
        }

        // Update latched zombie
        if (this.latchedOpponent && this.zombieLatchTime > 0) {
            this.zombieLatchTime--;
            
            // Keep zombie positioned on the opponent
            if (this.zombie) {
                this.zombie.x = this.latchedOpponent.x + this.latchedOpponent.w / 2 - this.zombie.w / 2;
                this.zombie.y = this.latchedOpponent.y - this.zombie.h / 2;
            }
            
            // Remove latch when timer expires
            if (this.zombieLatchTime <= 0) {
                log(`Zombie detached from ${this.latchedOpponent.name}`);
                this.zombie = null;
                this.latchedOpponent = null;
            }
        }

        // Update chicken with gravity
        if (this.chicken) {
            this.chicken.vy += GRAVITY;
            this.chicken.x += this.chicken.vx;
            this.chicken.y += this.chicken.vy;

            // Chicken ground collision
            this.chicken.onGround = false;
            if (this.chicken.y + this.chicken.h >= FLOOR) {
                this.chicken.y = FLOOR - this.chicken.h;
                this.chicken.vy = 0;
                this.chicken.onGround = true;
            } else {
                // Check platform collisions for chicken
                for (let plat of platforms) {
                    if (this.chicken.vy >= 0 &&
                        this.chicken.x + this.chicken.w > plat.x &&
                        this.chicken.x < plat.x + plat.w &&
                        this.chicken.y + this.chicken.h > plat.y &&
                        this.chicken.y + this.chicken.h - this.chicken.vy <= plat.y + PLATFORM_HEIGHT) {
                        this.chicken.y = plat.y - this.chicken.h;
                        this.chicken.vy = 0;
                        this.chicken.onGround = true;
                        break;
                    }
                }
            }

            // Keep chicken within bounds
            this.chicken.x = Math.max(0, Math.min(WIDTH - this.chicken.w, this.chicken.x));

            // Remove chicken if it falls off screen
            if (this.chicken.y > HEIGHT) {
                this.chicken = null;
            }
        }

        // Reset ability when both zombie and chicken are gone
        if (!this.zombie && !this.chicken && this.zombieLatchTime <= 0) {
            this.isFired = false;
            this.latchedOpponent = null;
        }
    },

    // Render logic for zombieRider
    render: function(ctx) {
        // Render main character (always visible)
        ctx.fillStyle = this.color;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeRect(this.x, this.y, this.w, this.h);

        // Render chicken
        if (this.chicken) {
            ctx.fillStyle = this.chicken.color;
            ctx.strokeStyle = "#FF8F00";
            ctx.lineWidth = 2;
            ctx.fillRect(this.chicken.x, this.chicken.y, this.chicken.w, this.chicken.h);
            ctx.strokeRect(this.chicken.x, this.chicken.y, this.chicken.w, this.chicken.h);
            
            // Add chicken details (beak)
            ctx.fillStyle = "#FF6F00";
            ctx.fillRect(this.chicken.x + (this.chicken.vx > 0 ? this.chicken.w : -4), 
                        this.chicken.y + this.chicken.h * 0.3, 4, 6);
        }

        // Render zombie projectile
        if (this.zombie) {
            ctx.fillStyle = this.zombie.color;
            ctx.strokeStyle = "#4CAF50";
            ctx.lineWidth = 2;
            ctx.fillRect(this.zombie.x, this.zombie.y, this.zombie.w, this.zombie.h);
            ctx.strokeRect(this.zombie.x, this.zombie.y, this.zombie.w, this.zombie.h);
            
            // Add zombie eyes
            ctx.fillStyle = this.latchedOpponent ? "#FF0000" : "#000000";
            ctx.fillRect(this.zombie.x + 4, this.zombie.y + 4, 4, 4);
            ctx.fillRect(this.zombie.x + this.zombie.w - 8, this.zombie.y + 4, 4, 4);
            
            // Add running animation effect if running
            if (this.zombie.isRunning) {
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = "#689F38";
                // Add motion blur effect
                ctx.fillRect(this.zombie.x - this.zombie.vx, this.zombie.y, this.zombie.w, this.zombie.h);
                ctx.restore();
            }
        }
    }
});