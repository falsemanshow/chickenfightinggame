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