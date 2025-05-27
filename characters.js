// Character System
const CharacterSystem = {
  characters: {},
  
  // Register a new character type
  register: function(id, config) {
    this.characters[id] = config;
    console.log(`Character '${id}' registered`);
  },
  
  // Get character definition by ID
  get: function(id) {
    return this.characters[id] || this.characters['default'];
  },
  
  // Apply character abilities to a player object
  applyTo: function(player, charId) {
    const character = this.get(charId);
    
    // Set basic character properties
    player.charId = charId;
    player.color = character.color || "#42a5f5";
    
    // Initialize animation controller
    player.animations = AnimationSystem.createAnimationController();
    
    // Add sprite animations if defined
    if (character.sprites) {
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
    }
    
    // Apply character initialization if available
    if (character.init) {
      character.init(player);
    }
    
    // Apply custom update method if available
    if (character.update) {
      player.characterUpdate = character.update;
    }
    
    // Add animation state transition helper
    player.setAnimation = function(state) {
      if (this.animations && this.animations.animations[state]) {
        this.animations.play(state);
        return true;
      }
      return false;
    };
    
    // Add animation update helper to be called each frame
    player.updateAnimation = function() {
      if (this.animations) {
        // Update animation frames
        this.animations.update();
        
        // Auto-transition based on player state if no manual override
        if (!this.animationOverride) {
          if (!this.onGround) {
            this.setAnimation('jump');
          } else if (Math.abs(this.vx) > 0.5) {
            this.setAnimation('run');
          } else if (this.blocking) {
            this.setAnimation('block');
          } else if (this.dash > 0) {
            this.setAnimation('attack');
          } else {
            this.setAnimation('idle');
          }
        }
      }
    };
    
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
    
    // Replace render method with animation-based rendering
    player.render = function(ctx) {
      // Draw shadow
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.ellipse(this.x + this.w / 2, this.y + this.h - 4, this.w / 2.5, 7, 0, 0, 2 * Math.PI);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Draw block indicator if blocking
      if (this.blocking && this.block > 0) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = "#b0bec5";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.roundRect(this.x - 4, this.y - 4, this.w + 8, this.h + 8, 18);
        ctx.stroke();
        ctx.restore();
      }
      
      // Draw paralyzed indicator
      if (this.isParalyzed) {
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(performance.now() / 120);
        ctx.strokeStyle = "#ffd740";
        ctx.lineWidth = 4 + 2 * Math.sin(performance.now() / 60);
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y - 14, 19 + 3 * Math.sin(performance.now() / 120), 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
      }
      
      // Draw character with animation if available
      if (this.animations) {
        this.animations.draw(ctx, this.x, this.y, this.facing);
      } else {
        // Fallback to default rectangle rendering
        ctx.fillStyle = this.color;
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.fillRect(this.x, this.y, this.w, this.h);
        ctx.strokeRect(this.x, this.y, this.w, this.h);
      }
      
      // Draw hit flash
      if (this.justHit > 0) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#fff";
        ctx.fillRect(this.x - 3, this.y - 3, this.w + 6, this.h + 6);
        ctx.restore();
      }
      
      // Allow custom character-specific rendering to override or add to the base
      if (character.customRender) {
        character.customRender.call(this, ctx);
      }
    };
    
    return player;
  }
};

// Register default character
CharacterSystem.register('default', {
  name: "Fighter",
  color: "#808080",
  // Default sprite sheet definitions
  sprites: {
    idle: {
      src: 'assets/sprites/default/idle.png',
      frameCount: 4,
      frameDuration: 150,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: true
    },
    run: {
      src: 'assets/sprites/default/run.png',
      frameCount: 6,
      frameDuration: 100,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE
    },
    jump: {
      src: 'assets/sprites/default/jump.png',
      frameCount: 4,
      frameDuration: 120,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE
    },
    attack: {
      src: 'assets/sprites/default/attack.png',
      frameCount: 3,
      frameDuration: 80,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: false
    },
    block: {
      src: 'assets/sprites/default/block.png',
      frameCount: 2,
      frameDuration: 200,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE
    },
    intro: {
      src: 'assets/sprites/default/intro.png',
      frameCount: 8,
      frameDuration: 120,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: false,
      autoPlay: false
    }
  },
  abilities: {
    keyPresses: function(key, count) {
      const controls = getControls(this.id);
      // Basic double-tap dash for all characters
      if ((key === controls.right || key === controls.left) && count === 2 && this.points >= 1) {
        this.vx = (key === controls.right) ? DASH_SPEED : -DASH_SPEED;
        this.dash = DASH_FRAMES;
        this.dashCooldown = DASH_COOLDOWN;
        // Set attack animation and override auto transitions temporarily
        this.animationOverride = true;
        this.setAnimation('attack');
        setTimeout(() => { this.animationOverride = false; }, 300);
        
        // Consume 1 point
        points(this, -1);
        log(this.name + " dashes " + (key === controls.right ? "right" : "left") + "! (-1 point, " + this.points + " remaining)");
      }
    }
  }
});

// Register Gold character with sprites
CharacterSystem.register('gold', {
  name: "Gold",
  color: "#42a5f5",
  sprites: {
    idle: {
      src: 'assets/sprites/gold/idle.png',
      frameCount: 4,
      frameDuration: 150,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: true
    },
    run: {
      src: 'assets/sprites/gold/run.png',
      frameCount: 6,
      frameDuration: 100,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE
    },
    jump: {
      src: 'assets/sprites/gold/jump.png',
      frameCount: 4,
      frameDuration: 120,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE
    },
    attack: {
      src: 'assets/sprites/gold/attack.png',
      frameCount: 3,
      frameDuration: 80,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: false
    },
    block: {
      src: 'assets/sprites/gold/block.png',
      frameCount: 2,
      frameDuration: 200,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE
    },
    intro: {
      src: 'assets/sprites/gold/intro.png',
      frameCount: 8,
      frameDuration: 120,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: false,
      autoPlay: false
    },
    superJump: {
      src: 'assets/sprites/gold/superJump.png',
      frameCount: 5,
      frameDuration: 100,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: false,
      autoPlay: false
    }
  },
  abilities: {
    keyPresses: function(key, count) {
      const controls = getControls(this.id);
      if ((key === controls.right || key === controls.left) && count === 2 && this.points >= 1) {
        this.vx = (key === controls.right) ? DASH_SPEED : -DASH_SPEED;
        this.dash = DASH_FRAMES;
        this.dashCooldown = DASH_COOLDOWN;
        
        // Set attack animation and override auto transitions temporarily
        this.animationOverride = true;
        this.setAnimation('attack');
        setTimeout(() => { this.animationOverride = false; }, 300);
        
        // Consume 1 point
        points(this, -1);
        log("Gold dashes " + (key === controls.right ? "right" : "left") + "! (-1 point, " + this.points + " remaining)");
      }
    },
    keyHold: function(key, duration) {
      const controls = getControls(this.id);
      if (key === controls.special && duration > 1000 && this.points >= 1) {
        if (!this.chargingLogged[key]) {
          log("Gold is charging power! (Costs 1 point)");
          this.chargingLogged[key] = true;
        }
      }
    },
    keyRelease: function(key, duration) {
      const controls = getControls(this.id);
      if (key === controls.special && duration > 1000 && this.points >= 1) {
        // Play super jump animation
        this.animationOverride = true;
        this.setAnimation('superJump');
        setTimeout(() => { this.animationOverride = false; }, 500);
        
        this.vy = -JUMP_VEL * 1.5;
        // Consume 1 point for super jump
        points(this, -1);
        log("Gold released a super jump! (-1 point, " + this.points + " remaining)");
      }
    }
  }
});

// Register Berry character with sprites
CharacterSystem.register('berry', {
  name: "Berry",
  color: "#ef5350",
  sprites: {
    idle: {
      src: 'assets/sprites/berry/idle.png',
      frameCount: 4,
      frameDuration: 150,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: true
    },
    run: {
      src: 'assets/sprites/berry/run.png',
      frameCount: 6,
      frameDuration: 100,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE
    },
    jump: {
      src: 'assets/sprites/berry/jump.png',
      frameCount: 4,
      frameDuration: 120,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE
    },
    attack: {
      src: 'assets/sprites/berry/attack.png',
      frameCount: 3,
      frameDuration: 80,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: false
    },
    block: {
      src: 'assets/sprites/berry/block.png',
      frameCount: 2,
      frameDuration: 200,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE
    },
    intro: {
      src: 'assets/sprites/berry/intro.png',
      frameCount: 8,
      frameDuration: 120,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: false,
      autoPlay: false
    },
    megaJump: {
      src: 'assets/sprites/berry/megaJump.png',
      frameCount: 6,
      frameDuration: 100,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: false,
      autoPlay: false
    }
  },
  abilities: {
    keyPresses: function(key, count) {
      const controls = getControls(this.id);
      if ((key === controls.right || key === controls.left) && count === 2 && this.points >= 1) {
        this.vx = (key === controls.right) ? DASH_SPEED : -DASH_SPEED;
        this.dash = DASH_FRAMES;
        this.dashCooldown = DASH_COOLDOWN;
        
        // Set attack animation and override auto transitions temporarily
        this.animationOverride = true;
        this.setAnimation('attack');
        setTimeout(() => { this.animationOverride = false; }, 300);
        
        // Consume 1 point
        points(this, -1);
        log("Berry dashes " + (key === controls.right ? "right" : "left") + "! (-1 point, " + this.points + " remaining)");
      }
    },
    keyHold: function(key, duration) {
      const controls = getControls(this.id);
      if (key === controls.special && duration > 1000 && this.points >= 2) {
        if (!this.chargingLogged[key]) {
          log("Berry is charging a jump! (Costs 2 points)");
          this.chargingLogged[key] = true;
        }
      }
    },
    keyRelease: function(key, duration) {
      const controls = getControls(this.id);
      if (key === controls.special && duration > 1000 && this.points >= 2) {
        // Play mega jump animation
        this.animationOverride = true;
        this.setAnimation('megaJump');
        setTimeout(() => { this.animationOverride = false; }, 600);
        
        this.vy = -JUMP_VEL * 2.0;
        // Consume 2 points for mega jump
        points(this, -2);
        log("Berry released a MEGA jump! (-2 points, " + this.points + " remaining)");
      }
    }
  }
});

// Register Smasher character with sprites
CharacterSystem.register('smasher', {
  name: "Smasher",
  color: "#ff5722",
  sprites: {
    idle: {
      src: 'assets/sprites/smasher/idle.png',
      frameCount: 4,
      frameDuration: 150,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: true
    },
    run: {
      src: 'assets/sprites/smasher/run.png',
      frameCount: 6,
      frameDuration: 100,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE
    },
    jump: {
      src: 'assets/sprites/smasher/jump.png',
      frameCount: 4,
      frameDuration: 120,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE
    },
    attack: {
      src: 'assets/sprites/smasher/attack.png',
      frameCount: 3,
      frameDuration: 80,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: false
    },
    block: {
      src: 'assets/sprites/smasher/block.png',
      frameCount: 2,
      frameDuration: 200,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE
    },
    intro: {
      src: 'assets/sprites/smasher/intro.png',
      frameCount: 8,
      frameDuration: 120,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: false,
      autoPlay: false
    },
    smash: {
      src: 'assets/sprites/smasher/smash.png',
      frameCount: 5,
      frameDuration: 100,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: false,
      autoPlay: false
    },
    superSmash: {
      src: 'assets/sprites/smasher/superSmash.png',
      frameCount: 6,
      frameDuration: 90,
      frameWidth: PLAYER_SIZE,
      frameHeight: PLAYER_SIZE,
      loop: false,
      autoPlay: false
    }
  },
  
  // Initialize character-specific properties
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
      
      // Ground smash when pressing down while in midair - now costs 1 point
      if (key === controls.down && !this.onGround && !this.isSmashing && this.points >= 1) {
        this.isSmashing = true;
        this.vy = 20; // Fast downward velocity
        this.vx = 0;  // Stop horizontal movement
        
        // Set smash animation and override auto transitions
        this.animationOverride = true;
        this.setAnimation('smash');
        
        // Calculate impact power based on height (higher = more powerful)
        const heightFromGround = FLOOR - (this.y + this.h);
        this.smashImpactPower = Math.min(25, Math.max(5, heightFromGround / 10));
        
        // Consume 1 point
        points(this, -1);
        log(`${this.name} initiates GROUND SMASH from height ${Math.round(heightFromGround)}! (-1 point, ${this.points} remaining)`);
      }
      
      // Handle regular dash with double-tap
      if ((key === controls.right || key === controls.left) && pressCount === 2 && this.dashCooldown === 0 && this.points >= 1) {
        this.vx = (key === controls.right) ? DASH_SPEED : -DASH_SPEED;
        this.dash = DASH_FRAMES;
        this.dashCooldown = DASH_COOLDOWN;
        
        // Set attack animation and override auto transitions temporarily
        this.animationOverride = true;
        this.setAnimation('attack');
        setTimeout(() => { this.animationOverride = false; }, 300);
        
        // Consume 1 point
        points(this, -1);
        log(this.name + " dashes " + (key === controls.right ? "right" : "left") + "! (-1 point, " + this.points + " remaining)");
      }
    },
    
    keyHold: function(key, duration) {
      const controls = getControls(this.id);
      if (key === controls.special && !this.onGround && duration > 300 && !this.isSmashing && this.points >= 2) {
        if (!this.chargingLogged[key]) {
          log(this.name + " is charging smash power! (Costs 2 points)");
          this.chargingLogged[key] = true;
        }
      }
    },
    
    keyRelease: function(key, duration) {
      this.chargingLogged[key] = false;
      const controls = getControls(this.id);
      
      // Super ground smash if charged with special key - costs 2 points
      if (key === controls.special && !this.onGround && duration > 300 && !this.isSmashing && this.points >= 2) {
        this.isSmashing = true;
        this.vy = 25; // Even faster downward velocity
        this.vx = 0;  // Stop horizontal movement
        
        // Set super smash animation and override auto transitions
        this.animationOverride = true;
        this.setAnimation('superSmash');
        
        // Extra powerful impact
        const heightFromGround = FLOOR - (this.y + this.h);
        this.smashImpactPower = Math.min(35, Math.max(15, heightFromGround / 8)); 
        
        // Consume 2 points for super smash
        points(this, -2);
        log(`${this.name} initiates SUPER GROUND SMASH! (-2 points, ${this.points} remaining)`);
      }
    }
  },
  
  // Custom update method to handle ground impact
  update: function() {
    // Handle impact effect duration
    if (this.impactDuration > 0) {
      this.impactDuration--;
      this.impactRadius = this.maxImpactRadius * (1 - this.impactDuration / 20);
    }
    
    // Check if smashing character has hit the ground
    if (this.isSmashing && this.onGround) {
      // Create impact effect
      this.impactDuration = 20; // Impact effect lasts 20 frames
      this.impactRadius = 0;    // Start radius at 0
      
      // Damage and knockback nearby opponents
      for (let i = 0; i < players.length; i++) {
        let opponent = players[i];
        if (opponent !== this && opponent.alive) {
          // Calculate distance between players
          const dx = (opponent.x + opponent.w/2) - (this.x + this.w/2);
          const dy = (opponent.y + opponent.h/2) - (this.y + this.h/2);
          const distance = Math.sqrt(dx*dx + dy*dy);
          
          // If opponent is within impact range
          if (distance < this.maxImpactRadius) {
            // Apply damage based on distance (closer = more damage)
            const damageMultiplier = 1 - (distance / this.maxImpactRadius);
            const damage = Math.round(this.smashImpactPower * damageMultiplier);
            
            // Apply knockback and damage
            if (damage > 0) {
              opponent.hp -= damage;
              opponent.justHit = 10;
              
              // Knockback direction based on relative position
              const knockbackX = (dx !== 0) ? Math.sign(dx) * 15 : 0;
              const knockbackY = -10; // Always up
              
              opponent.vx = knockbackX;
              opponent.vy = knockbackY;
              
              log(`${this.name}'s GROUND SMASH hit ${opponent.name} for ${damage} damage!`);
            }
          }
        }
      }
      
      // Reset smashing state
      this.isSmashing = false;
      this.animationOverride = false;
      
      // Apply a little self-knockback upward after impact
      this.vy = -5;
    }
  },
  
  // Custom render method for impact effects
  customRender: function(ctx) {
    // Draw impact effect
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
      
      // Draw cracks in the ground
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Draw several random cracks
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

// Register default character
CharacterSystem.register('default', {
  name: "Fighter",
  color: "#808080",
  abilities: {
    keyPresses: function(key, count) {
      const controls = getControls(this.id);
      // Basic double-tap dash for all characters
      if ((key === controls.right || key === controls.left) && count === 2 && this.dashCooldown === 0) {
        this.vx = (key === controls.right) ? DASH_SPEED : -DASH_SPEED;
        this.dash = DASH_FRAMES;
        this.dashCooldown = DASH_COOLDOWN;
        log(this.name + " dashes " + (key === controls.right ? "right" : "left") + "!");
      }
    }
  }
});

// Register Gold character
CharacterSystem.register('gold', {
  name: "Gold",
  color: "#42a5f5",
  abilities: {
    keyPresses: function(key, count) {
      const controls = getControls(this.id);
      if ((key === controls.right || key === controls.left) && count === 2 && this.dashCooldown === 0) {
        this.vx = (key === controls.right) ? DASH_SPEED : -DASH_SPEED;
        this.dash = DASH_FRAMES;
        this.dashCooldown = DASH_COOLDOWN;
        log("Gold dashes " + (key === controls.right ? "right" : "left") + "!");
      }
    },
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
        this.vy = -JUMP_VEL * 1.5;
        log("Gold released a super jump!");
      }
    }
  }
});

// Register Berry character
CharacterSystem.register('berry', {
  name: "Berry",
  color: "#ef5350",
  abilities: {
    keyPresses: function(key, count) {
      const controls = getControls(this.id);
      if ((key === controls.right || key === controls.left) && count === 2 && this.dashCooldown === 0) {
        this.vx = (key === controls.right) ? DASH_SPEED : -DASH_SPEED;
        this.dash = DASH_FRAMES;
        this.dashCooldown = DASH_COOLDOWN;
        log("Berry dashes " + (key === controls.right ? "right" : "left") + "!");
      }
    },
    keyHold: function(key, duration) {
      const controls = getControls(this.id);
      if (key === controls.special && duration > 1000 && this.points >= 1) {
        if (!this.chargingLogged[key]) {
            points(this, -1);
          log("Berry is charging a jump!");
          this.chargingLogged[key] = true;
        }
      }
    },
    keyRelease: function(key, duration) {
      const controls = getControls(this.id);
      if (key === controls.special && duration > 1000 ) {
        this.vy = -JUMP_VEL * 2.0;
        log("Berry released a MEGA jump!");
      }
    }
  }
});


// In characters.js - add after the existing character registrations

// In characters.js - modify the Smasher character definition
CharacterSystem.register('smasher', {
  name: "Smasher",
  color: "#ff5722", // Orange color
  
  // Initialize character-specific properties
  init: function(player) {
    player.isSmashing = false;        // Tracks if currently performing ground smash
    player.smashImpactPower = 0;      // Stores how powerful the impact will be
    player.impactRadius = 0;          // Current visual radius of impact effect
    player.maxImpactRadius = 120;     // Maximum radius of impact
    player.impactDuration = 0;        // Current frames of impact effect
    // Remove smashCooldown property - we're using points now
  },
  
  abilities: {
    keyPress: function(key, pressCount) {
      const controls = getControls(this.id);
      
      // Ground smash when pressing down while in midair - now costs 1 point
      if (key === controls.down && !this.onGround && !this.isSmashing && this.points >= 1) {
        this.isSmashing = true;
        this.vy = 20; // Fast downward velocity
        this.vx = 0;  // Stop horizontal movement
        
        // Calculate impact power based on height (higher = more powerful)
        const heightFromGround = FLOOR - (this.y + this.h);
        this.smashImpactPower = (heightFromGround / 10)+10;
        
        // Consume 1 point
        points(this, -1);
        log(`${this.name} initiates GROUND SMASH from height ${Math.round(heightFromGround)}! (-1 point, ${this.points} remaining)`);
      }
      
      // Handle regular dash with double-tap
      if ((key === controls.right || key === controls.left) && pressCount === 2 && this.dashCooldown === 0) {
        this.vx = (key === controls.right) ? DASH_SPEED : -DASH_SPEED;
        this.dash = DASH_FRAMES;
        this.dashCooldown = DASH_COOLDOWN;
        log(this.name + " dashes " + (key === controls.right ? "right" : "left") + "!");
      }
    },
    
    
    keyRelease: function(key, duration) {
      this.chargingLogged[key] = false;
      const controls = getControls(this.id);
      
      // Super ground smash if charged with special key - costs 2 points
      if (key === controls.special && !this.onGround && duration > 300 && !this.isSmashing && this.points >= 2) {
        this.isSmashing = true;
        this.vy = 25; // Even faster downward velocity
        this.vx = 0;  // Stop horizontal movement
        
        // Extra powerful impact
        const heightFromGround = FLOOR - (this.y + this.h);
        this.smashImpactPower = Math.min(35, Math.max(15, heightFromGround / 8)); 
        
        // Consume 2 points for super smash
        points(this, -2);
        log(`${this.name} initiates SUPER GROUND SMASH! (-2 points, ${this.points} remaining)`);
      }
    }
  },
  
  // Custom update method to handle ground impact
  update: function() {
    // Handle impact effect duration
    if (this.impactDuration > 0) {
      this.impactDuration--;
      this.impactRadius = this.maxImpactRadius * (1 - this.impactDuration / 20);
    }
    
    // Check if smashing character has hit the ground
    if (this.isSmashing && this.onGround) {
      // Create impact effect
      this.impactDuration = 20; // Impact effect lasts 20 frames
      this.impactRadius = 0;    // Start radius at 0
      
      // Damage and knockback nearby opponents
      for (let i = 0; i < players.length; i++) {
        let opponent = players[i];
        if (opponent !== this && opponent.alive) {
          // Calculate distance between players
          const dx = (opponent.x + opponent.w/2) - (this.x + this.w/2);
          const dy = (opponent.y + opponent.h/2) - (this.y + this.h/2);
          const distance = Math.sqrt(dx*dx + dy*dy);
          
          // If opponent is within impact range
          if (distance < this.maxImpactRadius) {
            // Apply damage based on distance (closer = more damage)
            const damageMultiplier = 1 - (distance / this.maxImpactRadius);
            const damage = Math.round(this.smashImpactPower * damageMultiplier);
            
            // Apply knockback and damage
            if (damage > 0) {
              opponent.hp -= damage;
              opponent.justHit = 10;
              
              // Knockback direction based on relative position
              const knockbackX = (dx !== 0) ? Math.sign(dx) * 15 : 0;
              const knockbackY = -10; // Always up
              
              opponent.vx = knockbackX;
              opponent.vy = knockbackY;
              
              log(`${this.name}'s GROUND SMASH hit ${opponent.name} for ${damage} damage!`);
            }
          }
        }
      }
      
      // Reset smashing state
      this.isSmashing = false;
      
      // Apply a little self-knockback upward after impact
      this.vy = -5;
    }
  },
  
  // Render method - remain mostly the same but update the cooldown indicator to show points instead
  render: function(ctx) {
    // Draw the base character
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeRect(this.x, this.y, this.w, this.h);
    
    // Draw charging effect while in air
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
    
    // Draw active smashing effect
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
    
    // Draw impact effect
    if (this.impactDuration > 0) {
      // Impact effect drawing remains the same...
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
      
      // Draw cracks in the ground
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Draw several random cracks
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

// Example of adding a new character (uncomment to use)

CharacterSystem.register('ninja', {
  name: "Ninja",
  color: "#9c27b0",
  abilities: {
    keyPresses: function(key, count) {
      const controls = getControls(this.id);
      // Triple-dash for ninja
     if ((key === controls.right || key === controls.left) && count === 2) {
        this.vx = (key === controls.right) ? DASH_SPEED * 1.5 : -DASH_SPEED * 1.5;
        this.dash = DASH_FRAMES * 1.2;
        this.dashCooldown = DASH_COOLDOWN;
        log("Ninja performs a triple dash!");
      }
    },
    
    },
    keyHold: function(key, duration) {
      const controls = getControls(this.id);
      if (key === controls.special && duration > 800) {
        if (!this.chargingLogged[key]) {
          log("Ninja is charging shadow technique!");
          this.chargingLogged[key] = true;
        }
      }
    },
    keyRelease: function(key, duration) {
      const controls = getControls(this.id);
      if (key === controls.special && duration > 800) {
        // Teleport in facing direction
        this.x += this.facing * 150;
        log("Ninja shadow teleport!");
      }
    }
  });
