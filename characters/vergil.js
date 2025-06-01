CharacterSystem.register('vergil', {
    ...BaseCharacter,
    name: "Vergil",
    color: "#4a90e2",
    
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
},
    
update: function() {
    if (this.judgementCutCooldown > 0) {
        this.judgementCutCooldown--;
    }
    
    // NEW: Handle teleport effects
    if (this.teleportTrail && this.teleportTrail.duration > 0) {
        this.teleportTrail.duration--;
        this.teleportTrail.alpha *= 0.92;  // Fade out trail
        if (this.teleportTrail.duration <= 0) {
            this.teleportTrail = null;
        }
    }
    
    // NEW: Handle teleport transparency
 // NEW: Handle teleport transparency (same for both dash and jump)
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
        }
    }
}

// NEW: Handle teleport jump cooldown
if (this.teleportJumpCooldown > 0) {
    this.teleportJumpCooldown--;
}

    if (this.judgementCutEffect) {
        const effect = this.judgementCutEffect;
        
        // Only handle slide and fall phases (lines and preparing are handled by setTimeout)
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
            }
        }
        // 'lines' and 'preparing' phases don't need animation updates
    }
},
    
 render: function(ctx) {
    // NEW: Draw teleport trail first (behind character)

if (this.teleportTrail && this.teleportTrail.duration > 0) {
    ctx.save();
    ctx.globalAlpha = this.teleportTrail.alpha;
    ctx.fillStyle = "#1a1a2e";  // Dark blue shadow color
    ctx.fillRect(this.teleportTrail.x, this.teleportTrail.y, this.w, this.h);
    
    // Add some blue glow to the trail
    ctx.strokeStyle = "#4a90e2";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.teleportTrail.x, this.teleportTrail.y, this.w, this.h);
    ctx.restore();
}

// NEW: Draw teleport jump trail
if (this.teleportJumpTrail && this.teleportJumpTrail.duration > 0) {
    ctx.save();
    ctx.globalAlpha = this.teleportJumpTrail.alpha;
    ctx.fillStyle = "#0f0f1a";  // Even darker blue for jump
    ctx.fillRect(this.teleportJumpTrail.x, this.teleportJumpTrail.y, this.w, this.h);
    
    // Add purple glow for jump trail
    ctx.strokeStyle = "#6a4c93";
    ctx.lineWidth = 2;
    ctx.strokeRect(this.teleportJumpTrail.x, this.teleportJumpTrail.y, this.w, this.h);
    
    // Add upward motion lines
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
    
    // Draw the main character with teleport transparency
    ctx.save();
    ctx.globalAlpha = this.teleportAlpha;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeRect(this.x, this.y, this.w, this.h);
    
    // NEW: Add teleport effect particles when teleporting
   // NEW: Add teleport effect particles when teleporting or jumping
if ((this.isTeleporting && this.dash > 0) || this.isTeleportJumping) {
    // Draw some "shadow particles" around Vergil
    for (let i = 0; i < 4; i++) {
        const offsetX = (Math.random() - 0.5) * 25;
        const offsetY = (Math.random() - 0.5) * 25;
        ctx.globalAlpha = 0.4 * Math.random();
        
        if (this.isTeleportJumping) {
            // Purple particles for teleport jump
            ctx.fillStyle = "#6a4c93";
        } else {
            // Blue particles for teleport dash
            ctx.fillStyle = "#1a1a2e";
        }
        
        ctx.fillRect(this.x + offsetX, this.y + offsetY, 6, 6);
    }
    
    // Add extra upward particles when teleport jumping
    if (this.isTeleportJumping) {
        for (let i = 0; i < 2; i++) {
            const offsetX = (Math.random() - 0.5) * 15;
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = "#9d4edd";
            ctx.fillRect(this.x + this.w/2 + offsetX, this.y + this.h + Math.random() * 10, 4, 8);
        }
    }
}
    
    ctx.restore();
},
    
abilities: {
    keyPress: function(key) {
        const controls = getControls(this.id);
        if (key === controls.special) {
             pauseGame('judgement_cut');
            // Get current camera state
            const { cx, cy, zoom } = getCamera();
            
            // Calculate camera view dimensions
            const viewW = canvas.width / zoom;
            const viewH = canvas.height / zoom;
            
            // Create snapshot canvas to match the camera view size
            if (!this.snapCanvas) {
                this.snapCanvas = document.createElement('canvas');
                this.snapCtx = this.snapCanvas.getContext('2d');
            }
            
            // Set snapshot canvas to camera view size
            this.snapCanvas.width = viewW;
            this.snapCanvas.height = viewH;
            
            // Calculate what area of the world is visible
            const viewLeft = cx - viewW / 2;
            const viewTop = cy - viewH / 2;
            
            // Take snapshot of only the visible camera area
            this.snapCtx.clearRect(0, 0, viewW, viewH);
            this.snapCtx.save();
            
            // Translate to show only the camera view area
            this.snapCtx.translate(-viewLeft, -viewTop);
            
            // BACKGROUND
            this.snapCtx.fillStyle = "#181c24";
            this.snapCtx.fillRect(0, 0, WIDTH, HEIGHT);
            this.snapCtx.fillStyle = "#6d4c41";
            this.snapCtx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);

            // PLATFORMS
            platforms.forEach(p => {
                this.snapCtx.fillStyle = "#ffd54f";
                this.snapCtx.fillRect(p.x, p.y, p.w, PLATFORM_HEIGHT);
                this.snapCtx.strokeStyle = "#ffb300";
                this.snapCtx.lineWidth = 3;
                this.snapCtx.strokeRect(p.x, p.y, p.w, PLATFORM_HEIGHT);
            });

            // PLAYERS
            for (let p of players) {
                if (!p.alive) continue;
                
                // Draw shadow
                this.snapCtx.globalAlpha = 0.18;
                this.snapCtx.beginPath();
                this.snapCtx.ellipse(p.x + p.w / 2, p.y + p.h - 4, p.w / 2.5, 7, 0, 0, 2 * Math.PI);
                this.snapCtx.fillStyle = "#000";
                this.snapCtx.fill();
                this.snapCtx.globalAlpha = 1;
                
                // Draw player body
                this.snapCtx.fillStyle = p.color;
                this.snapCtx.strokeStyle = "#fff";
                this.snapCtx.lineWidth = 3;
                this.snapCtx.fillRect(p.x, p.y, p.w, p.h);
                this.snapCtx.strokeRect(p.x, p.y, p.w, p.h);
            }
            
            this.snapCtx.restore();
            
            // ADD DELAY HERE - Trigger the effect after 2 seconds
          
              setTimeout(() => {
                AbilityLibrary.judgementCut(this);
            }, 2000);
            setTimeout(()=>{
                 // RESUME THE GAME when shards start falling
            resumeGame();
            },9500)
        }
    },
    
    // NEW: Add teleport dash function
   keyPresses: function(key, count) {
    const controls = getControls(this.id);
    
    // Teleport dash on double tap left/right
    if ((key === controls.left || key === controls.right) && count === 2 && this.dashCooldown === 0) {
        const direction = key === controls.right ? 1 : -1;
        
        // Create teleport trail at current position
        this.teleportTrail = {
            x: this.x,
            y: this.y,
            duration: 15,  // Shorter than fire trail
            alpha: 0.8
        };
        
        // Start teleport effect
        this.isTeleporting = true;
        this.teleportAlpha = 0.3;  // Make Vergil semi-transparent
        
        // Enhanced dash with teleport distance
        this.vx = direction * DASH_SPEED *1.2;  // 50% faster than normal dash
        this.dash = DASH_FRAMES;
        this.dashCooldown = DASH_COOLDOWN;
        
        log(`${this.name} teleports through the shadows!`);
    }
    
    // NEW: Teleport jump on double tap up
   // NEW: Teleport jump on double tap up
if (key === controls.up && count === 2 && this.teleportJumpCooldown === 0) {
    // Create teleport trail at current position (same as dash)
    this.teleportTrail = {
        x: this.x,
        y: this.y,
        duration: 15,
        alpha: 0.8
    };
    
    // Start teleport effect (same as dash)
    this.isTeleporting = true;
    this.teleportAlpha = 0.3;
    
    // Enhanced jump
    this.vy = -JUMP_VEL * 1.1;
    this.jumps++;
    this.teleportJumpCooldown = 60;
    
    log(`${this.name} teleports upward!`);
}
}
}
});