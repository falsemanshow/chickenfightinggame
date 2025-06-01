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

// 3. Ability Library (New Addition)
// Add these new abilities to your existing AbilityLibrary
const AbilityLibrary = {
    // Your existing abilities
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
    },

    // NEW FIRE MAGE ABILITIES
    throwFireball: function(character) {
        if (character.fireballCooldown > 0) return false;
        
        const fireball = {
            x: character.x + (character.facing > 0 ? character.w : -10),
            y: character.y + character.h / 2,
            vx: character.facing * 10,
            vy: 0,
            w: 12,
            h: 12,
            color: "#e74c3c",
            damage: 3,
            trail: []
        };
        
        character.fireballs.push(fireball);
        character.fireballCooldown = 30; // 0.5 seconds
        log(`${character.name} throws a fireball!`);
        return true;
    },

    fireShield: function(character, costPoints = 1) {
        if (character.points >= costPoints) {
            points(character, -costPoints);
            character.fireShield = 180; // 3 seconds
            log(`${character.name} activates fire shield! (-${costPoints} point)`);
            return true;
        }
        return false;
    },

    flameDash: function(character, costPoints = 0) {
        if (character.points >= costPoints && character.onGround) {
            points(character, -costPoints);
            character.vy = -JUMP_VEL * 1.3;
            character.vx = character.facing * 8;
            
            // Burn nearby enemies
            for (let i = 0; i < players.length; i++) {
                const opponent = players[i];
                if (opponent !== character && opponent.alive) {
                    const distance = Math.abs(opponent.x - character.x);
                    if (distance < 80) {
                        opponent.hp -= 8;
                        opponent.justHit = 10;
                        knockback(character, opponent, 3, -2);
                        log(`${character.name}'s flame dash burns ${opponent.name}!`);
                    }
                }
            }
            log(`${character.name} performs flame dash! (-${costPoints} point)`);
            return true;
        }
        return false;
    },

    fireBurst: function(character, range = 100, damage = 15) {
        let hitCount = 0;
        for (let i = 0; i < players.length; i++) {
            const opponent = players[i];
            if (opponent !== character && opponent.alive) {
                const dx = (opponent.x + opponent.w/2) - (character.x + character.w/2);
                const dy = (opponent.y + opponent.h/2) - (character.y + character.h/2);
                const distance = Math.sqrt(dx*dx + dy*dy);
                
                if (distance < range) {
                    const actualDamage = Math.round(damage * (1 - distance / range));
                    opponent.hp -= actualDamage;
                    opponent.justHit = 10;
                    knockback(character, opponent, 5, -3);
                    log(`${character.name}'s fire burst hit ${opponent.name} for ${actualDamage} damage!`);
                    hitCount++;
                }
            }
        }
        return hitCount > 0;
    },

    meteorStrike: function(character, costPoints = 2) {
        if (character.points >= costPoints) {
            points(character, -costPoints);
            const meteor = {
                x: character.x + character.w/2,
                y: -50,
                vx: 0,
                vy: 15,
                w: 20,
                h: 20,
                color: "#8b0000",
                damage: 25,
                isMeteor: true,
                trail: []
            };
            
            character.fireballs.push(meteor);
            log(`${character.name} calls down a METEOR STRIKE! (-${costPoints} points)`);
            return true;
        }
        return false;
    },

    // Add to AbilityLibrary in characters.js
//judgementcutend ability
judgementCut: function(character, costPoints = 0) {
    if (character.points < costPoints || character.judgementCutCooldown > 0) return false;
    
   
    
    // Zoom
    startCameraZoomEffect();
    
    // Get current camera state
    const { cx, cy, zoom } = getCamera();
    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;
    
    // Create effect canvas if it doesn't exist
    if (!character.effectCanvas) {
        character.effectCanvas = document.createElement('canvas');
        character.effectCtx = character.effectCanvas.getContext('2d');
    }
    
    // Set effect canvas to camera view size
    character.effectCanvas.width = viewW;
    character.effectCanvas.height = viewH;
    
    // Points cost
    points(character, -costPoints);
    
    // Set cooldown
    character.judgementCutCooldown = 120;
    
    // STEP 1: Show lines immediately
    const effect = {
        lines: [
            //sequence line
           [0, viewH * 0.07, viewW, viewH * 0.82],
            [0, viewH * 0.29, viewW, viewH],
            [0, viewH * 0.52, viewW * 0.82, viewH],
            [0, viewH * 0.88, viewW, viewH * 0.8],
            [0, viewH * 0.92, viewW, viewH * 0.51],
            [viewW * 0.16, 0, viewW, viewH],
            [viewW * 0.22, 0, viewW, viewH * 0.73],
            [viewW * 0.3, 0, viewW, viewH * 0.48],
            [0, viewH * 0.2, viewW, viewH * 0.08],
            [0, viewH * 0.12, viewW, viewH * 0.45],
            [0, viewH * 0.55, viewW, viewH * 0.23],
            [0, viewH * 0.75, viewW, viewH * 0.19],
            [0, viewH * 0.2, viewW * 0.55, viewH],
            [0, viewH, viewW, viewH * 0.25],
            [viewW * 0.73, 0, viewW, viewH],
            [viewW, 0, viewW * 0.34, viewH],
            [viewW, 0, viewW * 0.03, viewH],
        ],
        phase: 'lines',
        damage: 35,
        range: 500,
        cameraX: cx - viewW / 2,
        cameraY: cy - viewH / 2,
        viewWidth: viewW,
        viewHeight: viewH,
        shards: [],
        visibleLines: 0
    };
    
    // Store effect in character
    character.judgementCutEffect = effect;
    
    //This is the line where the white lines appears one by onehahah
    for (let i = 0; i < 7; i++) {
        setTimeout(() => {
            if (character.judgementCutEffect && character.judgementCutEffect.phase === 'lines') {
                character.judgementCutEffect.visibleLines = i + 1;
            }
        }, i * JUDGEMENT_CUT_CONSTANTS.FIRST_THREE_INTERVAL);
    }
    
    // lines to appear all at once after delay
    setTimeout(() => {
        if (character.judgementCutEffect && character.judgementCutEffect.phase === 'lines') {
            character.judgementCutEffect.visibleLines = effect.lines.length;
        }
    }, 3 * JUDGEMENT_CUT_CONSTANTS.FIRST_THREE_INTERVAL + JUDGEMENT_CUT_CONSTANTS.REMAINING_LINES_DELAY);
    
    // STEP 2: After lines display duration, hide lines and prepare shards
    setTimeout(() => {
        if (character.judgementCutEffect) {
            character.judgementCutEffect.phase = 'preparing'; // Hide lines, prepare shards
            
            // Generate shards but don't show them yet
            const helpers = {
                lineSide: function(line, pt) {
                    const [x1,y1,x2,y2] = line;
                    return (x2-x1)*(pt[1]-y1)-(y2-y1)*(pt[0]-x1);
                },
                
                segLineIntersection: function(a, b, line) {
                    const [x1,y1,x2,y2] = line;
                    const x3 = a[0], y3 = a[1], x4 = b[0], y4 = b[1];
                    const denom = (x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
                    if (Math.abs(denom)<1e-8) return null;
                    const px = ((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/denom;
                    const py = ((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/denom;
                    const between = (a,b,c) => a>=Math.min(b,c)-1e-6 && a<=Math.max(b,c)+1e-6;
                    if (between(px,a[0],b[0])&&between(py,a[1],b[1])) return [px,py];
                    return null;
                },
                
                splitPolygonByLine: function(poly, line) {
                    let left=[], right=[];
                    for (let i=0;i<poly.length;++i) {
                        let a = poly[i], b = poly[(i+1)%poly.length];
                        let aside = this.lineSide(line, a);
                        let bside = this.lineSide(line, b);
                        if (aside >= 0) left.push(a);
                        if (aside <= 0) right.push(a);
                        if ((aside > 0 && bside < 0) || (aside < 0 && bside > 0)) {
                            let ipt = this.segLineIntersection(a, b, line);
                            if (ipt) { left.push(ipt); right.push(ipt); }
                        }
                    }
                    if (left.length>2) {
                        left = left.filter((p,i,arr)=>
                            i==0||Math.abs(p[0]-arr[i-1][0])>1e-5||Math.abs(p[1]-arr[i-1][1])>1e-5
                        );
                    } else left = null;
                    if (right.length>2) {
                        right = right.filter((p,i,arr)=>
                            i==0||Math.abs(p[0]-arr[i-1][0])>1e-5||Math.abs(p[1]-arr[i-1][1])>1e-5
                        );
                    } else right = null;
                    return [left, right];
                },
                
                shatterPolygons: function(lines) {
                    let initial = [[ [0,0], [WIDTH,0], [WIDTH,HEIGHT], [0,HEIGHT] ]];
                    for (let line of lines) {
                        let next = [];
                        for (let poly of initial) {
                            let [left, right] = this.splitPolygonByLine(poly, line);
                            if (left) next.push(left);
                            if (right) next.push(right);
                        }
                        initial = next;
                    }
                    return initial;
                }
            };
            
            const polys = helpers.shatterPolygons.call(helpers, effect.lines);
            character.judgementCutEffect.shards = polys.map(poly => {
                let cx=0, cy=0;
                for (let p of poly) { cx+=p[0]; cy+=p[1]; }
                cx/=poly.length; cy/=poly.length;
                
                let dir = Math.random() < 0.5 ? -0.8 : 0.8;
                return {
                    poly,
                    x: 0, y: 0,
                    vx: dir * (18 + Math.random()*10),
                    vy: (Math.random()-0.5)*10,
                    g: 1.10 + Math.random()*0.2,
                    angle: (Math.random()-0.5)*0.2,
                    vangle: (Math.random()-0.5)*0.12 + (cx-effect.viewWidth/2)*0.0003
                };
            });
        }
    }, JUDGEMENT_CUT_CONSTANTS.LINE_DISPLAY_DURATION);
    
    //shard anim
    setTimeout(() => {
        if (character.judgementCutEffect) {
            character.judgementCutEffect.phase = 'slide';
            character.judgementCutEffect.startTime = performance.now();
            
           
        }
    }, JUDGEMENT_CUT_CONSTANTS.LINE_DISPLAY_DURATION + 500);
    
    // Deal damage to opponents in range (immediate)
    for (let i = 0; i < players.length; i++) {
        const opponent = players[i];
        if (opponent !== character && opponent.alive) {
            const dx = opponent.x - character.x;
            const dy = opponent.y - character.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if (distance < effect.range) {
                const damageMultiplier = 1 - (distance / effect.range);
                const damage = Math.round(effect.damage * damageMultiplier);
                opponent.hp -= damage;
                opponent.justHit = 10;
                knockback(character, opponent, effect.knockback.x, effect.knockback.y);
                log(`${character.name}'s Judgement Cut hit ${opponent.name} for ${damage} damage!`);
            }
        }
    }
    
    return true;
},
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
