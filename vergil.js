CharacterSystem.register('vergil', {
    ...BaseCharacter,
    name: "Vergil",
    color: "#4a90e2", // Fallback color
    

    //Sprite configurations for Vergil with placeholders
sprites: {
    idle: {
        src: createPlaceholderSprite("#4a90e2", 1, PLAYER_SIZE, PLAYER_SIZE), // Use placeholder
        frameCount: 7,
        frameDuration: 200,
        frameWidth: PLAYER_SIZE,
        frameHeight: PLAYER_SIZE,
        loop: true,
        autoPlay: true
    },
    
    teleporting: {
        src: createPlaceholderSprite("#1a1a2e", 4, PLAYER_SIZE, PLAYER_SIZE), // Use placeholder
        frameCount: 4,
        frameDuration: 100,
        frameWidth: PLAYER_SIZE,
        frameHeight: PLAYER_SIZE,
        loop: true,
        autoPlay: false
    },
    
    concentrating: {
        src: createPlaceholderSprite("#6a4c93", 3, PLAYER_SIZE, PLAYER_SIZE), // Use placeholder
        frameCount: 3,
        frameDuration: 150,
        frameWidth: PLAYER_SIZE,
        frameHeight: PLAYER_SIZE,
        loop: true,
        autoPlay: false
    },
    
    slash: {
        src: createPlaceholderSprite("#ff6b6b", 5, PLAYER_SIZE, PLAYER_SIZE), // Use placeholder
        frameCount: 5,
        frameDuration: 120,
        frameWidth: PLAYER_SIZE,
        frameHeight: PLAYER_SIZE,
        loop: false,
        autoPlay: false,
        onComplete: function() {
            if (this.setAnimation) {
                this.setAnimation('idle');
            }
        }
    },
    
    run: {
        src: createPlaceholderSprite("#3498db", 8, PLAYER_SIZE, PLAYER_SIZE), // Use placeholder
        frameCount: 8,
        frameDuration: 100,
        frameWidth: PLAYER_SIZE,
        frameHeight: PLAYER_SIZE,
        loop: true,
        autoPlay: false
    }
},
    
    init: function(player) {
        player.judgementCutCooldown = 0;
        player.effectCanvas = null;
        player.effectCtx = null;
        player.snapCanvas = null;
        player.snapCtx = null;
        player.judgementCutEffect = null;
        
        // NEW: Add teleport dash properties
        player.teleportTrail = null;
        player.isTeleporting = false;
        player.teleportAlpha = 1.0;
        
        // NEW: Add teleport jump properties
        player.teleportJumpCooldown = 0;
        
        // ADD THIS: Animation state tracking
        player.isConcentrating = false;
        player.lastMovementState = 'idle';
    },
    
    update: function() {
        // Handle animation updates FIRST
        if (this.updateAnimation) {
            this.updateAnimation();
        }
        
        // Handle automatic animation switching
        if (this.animations) {
            const currentAnim = this.animations.currentAnimation;
            
            // Don't interrupt certain animations
            if (currentAnim === 'slash' && this.animations.animations.slash.isPlaying) {
                // Let slash animation complete
            }
            else if (currentAnim === 'concentrating' && this.isConcentrating) {
                // Let concentration animation continue
            }
            else if (this.isTeleporting && currentAnim !== 'teleporting') {
                // Switch to teleport animation when teleporting
                this.setAnimation('teleporting');
            }
            else if (!this.isTeleporting && !this.isConcentrating) {
                // Normal movement animations
                if (this.onGround && Math.abs(this.vx) > 1 && currentAnim !== 'run') {
                    this.setAnimation('run');
                    this.lastMovementState = 'run';
                } 
                else if (this.onGround && Math.abs(this.vx) <= 1 && currentAnim !== 'idle') {
                    this.setAnimation('idle');
                    this.lastMovementState = 'idle';
                }
            }
        }
        
        // Existing Vergil update logic
        if (this.judgementCutCooldown > 0) {
            this.judgementCutCooldown--;
        }
        
        // Handle teleport effects
        if (this.teleportTrail && this.teleportTrail.duration > 0) {
            this.teleportTrail.duration--;
            this.teleportTrail.alpha *= 0.92;
            if (this.teleportTrail.duration <= 0) {
                this.teleportTrail = null;
            }
        }
        
        // Handle teleport transparency
        if (this.isTeleporting) {
            if (this.dash > 0) {
                // Still dashing - keep semi-transparent and flickering
                this.teleportAlpha = 0.2 + 0.3 * Math.sin(performance.now() / 50);
            } else {
                // Dash finished - fade back to normal
                this.teleportAlpha += 0.15;
                if (this.teleportAlpha >= 1.0) {
                    this.teleportAlpha = 1.0;
                    this.isTeleporting = false;
                    // Return to previous movement animation
                    if (this.setAnimation) {
                        this.setAnimation(this.lastMovementState || 'idle');
                    }
                }
            }
        }

        // Handle teleport jump cooldown
        if (this.teleportJumpCooldown > 0) {
            this.teleportJumpCooldown--;
        }

        // Existing judgement cut effect logic
        if (this.judgementCutEffect) {
            const effect = this.judgementCutEffect;
            
            if (effect.phase === 'slide') {
                const t = performance.now() - effect.startTime;
                
                for (let s of effect.shards) {
                    s.x += s.vx * JUDGEMENT_CUT_CONSTANTS.SLIDE_SPEED;
                    s.y += s.vy * JUDGEMENT_CUT_CONSTANTS.SLIDE_SPEED;
                    s.angle += s.vangle * JUDGEMENT_CUT_CONSTANTS.SLIDE_SPEED;
                }
                
                if (t > JUDGEMENT_CUT_CONSTANTS.SLIDE_DURATION) {
                    effect.phase = 'fall';
                    
                    for (let s of effect.shards) {
                        s.vy = JUDGEMENT_CUT_CONSTANTS.FALL_INITIAL_VY + Math.random()*2;
                        s.vx = (Math.random()-0.5) * JUDGEMENT_CUT_CONSTANTS.FALL_VX_RANGE;
                    }
                }
            } else if (effect.phase === 'fall') {
                for (let s of effect.shards) {
                    s.x += s.vx;
                    s.y += s.vy;
                    s.vy += s.g;
                    s.angle += s.vangle;
                }
                const maxY = effect.viewHeight + 100;
                if (effect.shards.every(s => s.y > maxY)) {
                    this.judgementCutEffect = null;
                    // Return to idle after judgement cut
                    this.isConcentrating = false;
                    if (this.setAnimation) {
                        this.setAnimation('idle');
                    }
                }
            }
        }
    },
     
render: function(ctx) {
    // FIRST: Draw the main sprite using the animation system
    if (this.animations) {
        this.animations.draw(ctx, this.x, this.y, this.facing);
    } else {
        // Fallback to colored rectangle
        ctx.fillStyle = this.color;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeRect(this.x, this.y, this.w, this.h);
    }

    // THEN: Draw teleport trail (behind character)
    if (this.teleportTrail && this.teleportTrail.duration > 0) {
        ctx.save();
        ctx.globalAlpha = this.teleportTrail.alpha;
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(this.teleportTrail.x, this.teleportTrail.y, this.w, this.h);
        
        ctx.strokeStyle = "#4a90e2";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.teleportTrail.x, this.teleportTrail.y, this.w, this.h);
        ctx.restore();
    }

    // Draw teleport jump trail
    if (this.teleportJumpTrail && this.teleportJumpTrail.duration > 0) {
        ctx.save();
        ctx.globalAlpha = this.teleportJumpTrail.alpha;
        ctx.fillStyle = "#0f0f1a";
        ctx.fillRect(this.teleportJumpTrail.x, this.teleportJumpTrail.y, this.w, this.h);
        
        ctx.strokeStyle = "#6a4c93";
        ctx.lineWidth = 2;
        ctx.strokeRect(this.teleportJumpTrail.x, this.teleportJumpTrail.y, this.w, this.h);
        
        for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = "#6a4c93";
            ctx.lineWidth = 1;
            ctx.globalAlpha = this.teleportJumpTrail.alpha * 0.5;
            ctx.beginPath();
            ctx.moveTo(this.teleportJumpTrail.x + this.w/2 - 10 + i*10, this.teleportJumpTrail.y + this.h);
            ctx.lineTo(this.teleportJumpTrail.x + this.w/2 - 10 + i*10, this.teleportJumpTrail.y + this.h + 15);
            ctx.stroke();
        }
        ctx.restore();
    }
    
    // Apply teleport transparency to the sprite if needed
    if (this.isTeleporting || this.teleportAlpha < 1.0) {
        ctx.save();
        ctx.globalAlpha = this.teleportAlpha;
        
        // Re-draw the sprite with transparency
        if (this.animations) {
            this.animations.draw(ctx, this.x, this.y, this.facing);
        }
        
        ctx.restore();
    }
    
    // Add teleport effect particles when teleporting
    if ((this.isTeleporting && this.dash > 0) || this.isTeleportJumping) {
        ctx.save();
        // Draw shadow particles around Vergil
        for (let i = 0; i < 4; i++) {
            const offsetX = (Math.random() - 0.5) * 25;
            const offsetY = (Math.random() - 0.5) * 25;
            ctx.globalAlpha = 0.4 * Math.random();
            
            if (this.isTeleportJumping) {
                ctx.fillStyle = "#6a4c93";
            } else {
                ctx.fillStyle = "#1a1a2e";
            }
            
            ctx.fillRect(this.x + offsetX, this.y + offsetY, 6, 6);
        }
        
        if (this.isTeleportJumping) {
            for (let i = 0; i < 2; i++) {
                const offsetX = (Math.random() - 0.5) * 15;
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = "#9d4edd";
                ctx.fillRect(this.x + this.w/2 + offsetX, this.y + this.h + Math.random() * 10, 4, 8);
            }
        }
        ctx.restore();
    }
},
     
    abilities: {
        keyPress: function(key) {
            const controls = getControls(this.id);
            if (key === controls.special) {
                // MODIFY THIS: Add concentration animation
                this.isConcentrating = true;
                if (this.setAnimation) {
                    this.setAnimation('concentrating');
                }
                
                pauseGame('judgement_cut');
                // ... rest of existing judgement cut logic stays the same ...
                
                const { cx, cy, zoom } = getCamera();
                const viewW = canvas.width / zoom;
                const viewH = canvas.height / zoom;
                
                if (!this.snapCanvas) {
                    this.snapCanvas = document.createElement('canvas');
                    this.snapCtx = this.snapCanvas.getContext('2d');
                }
                
                this.snapCanvas.width = viewW;
                this.snapCanvas.height = viewH;
                
                const viewLeft = cx - viewW / 2;
                const viewTop = cy - viewH / 2;
                
                this.snapCtx.clearRect(0, 0, viewW, viewH);
                this.snapCtx.save();
                this.snapCtx.translate(-viewLeft, -viewTop);
                
                // Background
                this.snapCtx.fillStyle = "#181c24";
                this.snapCtx.fillRect(0, 0, WIDTH, HEIGHT);
                this.snapCtx.fillStyle = "#6d4c41";
                this.snapCtx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);

                // Platforms
                platforms.forEach(p => {
                    this.snapCtx.fillStyle = "#ffd54f";
                    this.snapCtx.fillRect(p.x, p.y, p.w, PLATFORM_HEIGHT);
                    this.snapCtx.strokeStyle = "#ffb300";
                    this.snapCtx.lineWidth = 3;
                    this.snapCtx.strokeRect(p.x, p.y, p.w, PLATFORM_HEIGHT);
                });

                // Players
                for (let p of players) {
                    if (!p.alive) continue;
                    
                    this.snapCtx.globalAlpha = 0.18;
                    this.snapCtx.beginPath();
                    this.snapCtx.ellipse(p.x + p.w / 2, p.y + p.h - 4, p.w / 2.5, 7, 0, 0, 2 * Math.PI);
                    this.snapCtx.fillStyle = "#000";
                    this.snapCtx.fill();
                    this.snapCtx.globalAlpha = 1;
                    
                    this.snapCtx.fillStyle = p.color;
                    this.snapCtx.strokeStyle = "#fff";
                    this.snapCtx.lineWidth = 3;
                    this.snapCtx.fillRect(p.x, p.y, p.w, p.h);
                    this.snapCtx.strokeRect(p.x, p.y, p.w, p.h);
                }
                
                this.snapCtx.restore();
                
                // ADD THIS: Trigger slash animation when judgement cut executes
                setTimeout(() => {
                    if (this.setAnimation) {
                        this.setAnimation('slash');
                    }
                    AbilityLibrary.judgementCut(this);
                }, 2000);
                
                setTimeout(() => {
                    resumeGame();
                }, 9500);
            }
        },
         
        keyPresses: function(key, count) {
            const controls = getControls(this.id);
            
            // Teleport dash on double tap left/right
            if ((key === controls.left || key === controls.right) && count === 2 && this.dashCooldown === 0) {
                const direction = key === controls.right ? 1 : -1;
                
                this.teleportTrail = {
                    x: this.x,
                    y: this.y,
                    duration: 15,
                    alpha: 0.8
                };
                
                this.isTeleporting = true;
                this.teleportAlpha = 0.3;
                
                // MODIFY THIS: Trigger teleport animation
                if (this.setAnimation) {
                    this.setAnimation('teleporting');
                }
                
                this.vx = direction * DASH_SPEED * 1.2;
                this.dash = DASH_FRAMES;
                this.dashCooldown = DASH_COOLDOWN;
                
                log(`${this.name} teleports through the shadows!`);
            }
            
            // Teleport jump on double tap up
            if (key === controls.up && count === 2 && this.teleportJumpCooldown === 0) {
                this.teleportTrail = {
                    x: this.x,
                    y: this.y,
                    duration: 15,
                    alpha: 0.8
                };
                
                this.isTeleporting = true;
                this.teleportAlpha = 0.3;
                
                // MODIFY THIS: Trigger teleport animation for jump too
                if (this.setAnimation) {
                    this.setAnimation('teleporting');
                }
                
                this.vy = -JUMP_VEL * 1.1;
                this.jumps++;
                this.teleportJumpCooldown = 60;
                
                log(`${this.name} teleports upward!`);
            }
        }
    }
});