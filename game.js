//game.js
// Main game logic
// Add these variables after your existing variables in game.js
let cameraZoomEffect = {
    active: false,
    startZoom: 1,
    targetZoom: 1.5,  // Zoom in to 1.5x during the effect
    currentZoom: 1,
    phase: 'idle',    // 'zoom_in', 'hold', 'zoom_out'
    startTime: 0,
    duration: {
        zoomIn: 6300,   // 800ms to zoom in slowly
        hold: 400,     // Hold the zoom for 400ms during slide
        zoomOut: 700   // 600ms to zoom back out
    }
};
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Add this after the cameraZoomEffect object (around line 16)
let gameState = {
    paused: false,
    pauseReason: null, // 'judgement_cut' or null
    pauseStartTime: 0
};

// Add these functions after the cameraZoomEffect object
function pauseGame(reason) {
    gameState.paused = true;
    gameState.pauseReason = reason;
    gameState.pauseStartTime = performance.now();
    log("Game paused for " + reason);
}

function resumeGame() {
    gameState.paused = false;
    gameState.pauseReason = null;
    log("Game resumed");
}

// Player factory function with character system integration
// In game.js - modify createPlayer function to include points
function createPlayer(x, y, facing, playerName, charId, playerId) {
  const player = {
    x: x, y: y, vx: 0, vy: 0, w: PLAYER_SIZE, h: PLAYER_SIZE,
    facing: facing, hp: 100, jumps: 0, dash: 0, dashCooldown: 0,
    block: BLOCK_MAX, blocking: false, onGround: false, jumpHeld: false, alive: true,
    id: playerId, name: playerName,
    points: 0, 
    justHit: 0, hasDashHit: false, lastTapDir: null, lastTapTime: 0,
    lastReleaseTime: { left: 0, right: 0 }, _wasBlocking: false,
    dizzy: 0, isParalyzed: false, paralyzeTimer: 0,
    movement: true,
    chargingLogged: {},
    dashdmg: 0
  };
  
  // Apply character abilities and properties
  return CharacterSystem.applyTo(player, charId || 'default');
}

// Create players with their respective characters
const players = [
    createPlayer(WIDTH / 3, FLOOR - PLAYER_SIZE, 1, "Smasher", "smasher", 0),
  //createPlayer(WIDTH / 3, FLOOR - PLAYER_SIZE, 1, "Player 1", "gold", 0),
  createPlayer(2 * WIDTH / 3, FLOOR - PLAYER_SIZE, -1, "Player 2", "berry", 1),
];

// In game.js - add after the players array:

// Character selection functionality
function changeCharacter(playerId, characterId) {
  const player = players[playerId];
  const oldX = player.x;
  const oldY = player.y;
  const oldFacing = player.facing;
  const oldName = "Player " + (playerId + 1);
  
  // Create a new player with the selected character
  players[playerId] = createPlayer(oldX, oldY, oldFacing, oldName, characterId, playerId);
  log(`Player ${playerId + 1} switched to ${CharacterSystem.get(characterId).name}`);
}

// Example usage with number keys
document.addEventListener("keydown", function(e) {
  if (e.key === "1") changeCharacter(0, "fireMage");
  if (e.key === "2") changeCharacter(0, "berry");
  if (e.key === "3") changeCharacter(0, "smasher");
    if (e.key === "4") changeCharacter(0, "zombieRider");
    if (e.key === "5") changeCharacter(0, "vergil");  // For player 1
if (e.key === "6") changeCharacter(1, "vergil");
    
  
  // For player 2
  if (e.key === "7") changeCharacter(1, "gold");
  if (e.key === "8") changeCharacter(1, "berry");
  if (e.key === "9") changeCharacter(1, "smasher");
  if (e.key === "0") changeCharacter(1, "zombieRider");
});

// Set up keyboard handling
const keyHandlers = {};
document.addEventListener("keydown", function(e) {
  const key = e.key.toLowerCase();
  if (!keyHandlers[key]) keyHandlers[key] = { isDown: false, downTime: 0, upTime: 0, pressCount: 0, lastPressTime: 0 };
  let h = keyHandlers[key];
  if (!h.isDown) {
    h.isDown = true;
    h.downTime = performance.now();
    if (performance.now() - h.lastPressTime < 300) {
      h.pressCount++;
    } else {
      h.pressCount = 1;
    }
    h.lastPressTime = performance.now();

    players.forEach(player => player.keyPress && player.keyPress(key, h.pressCount));
  }
});

document.addEventListener("keyup", function(e) {
  const key = e.key.toLowerCase();
  if (!keyHandlers[key]) keyHandlers[key] = { isDown: false, downTime: 0, upTime: 0, pressCount: 0, lastPressTime: 0 };
  let h = keyHandlers[key];
  if (h.isDown) {
    h.upTime = performance.now();
    let duration = h.upTime - h.downTime;
    h.isDown = false;
    players.forEach(player => player.keyRelease && player.keyRelease(key, duration));
  }
});

const keys = {};
document.addEventListener("keydown", e => { keys[e.key.toLowerCase()] = true; });
document.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });

function handleKeyEvents() {
  for (const key in keyHandlers) {
    const h = keyHandlers[key];
    if (h.isDown) {
      let holdDuration = performance.now() - h.downTime;
      players.forEach(player => player.keyHold && player.keyHold(key, holdDuration));
    }
    if (h.pressCount >= 2 && (performance.now() - h.lastPressTime < 300)) {
      players.forEach(player => player.keyPresses && player.keyPresses(key, h.pressCount));
      h.pressCount = 0;
    }
  }
}

function updateBlocking(p, pid) {
  const controls = getControls(pid);
  if (p._wasBlocking === undefined) p._wasBlocking = false;
  if (p.onGround && keys[controls.down]) {
    if (!p._wasBlocking && p.block < BLOCK_MAX) {
      p.blocking = false;
    } else if (p.block > 0) {
      p.blocking = true;
      reduceBlock(p, BLOCK_DEPLETION);
    } else {
      p.blocking = false;
    }
  } else {
    p.blocking = false;
  }
  if (!p.blocking && p.block < BLOCK_MAX) {
    addBlock(p, BLOCK_RECOVERY);
  }
  p._wasBlocking = p.blocking;
  if (p.dizzy > 0) {
    p.dizzy--;
    p.vx *= FRICTION;
    if (Math.abs(p.vx) < 0.3) p.vx = 0;
    return true;
  }
  return false;
}

// In game.js - modify updatePlayer function
function updatePlayer(p, pid) {
  if (!p.alive) return;

  // Update character-specific logic
  if (p.characterUpdate) {
    p.characterUpdate.call(p);
  }
  
  // Update animations
  if (p.updateAnimation) {
    p.updateAnimation();
  }
  if (p.isParalyzed) {
    p.vx *= 0.92;
    p.vy += GRAVITY;
    p.paralyzeTimer--;
    if (p.paralyzeTimer <= 0) {
      p.isParalyzed = false;
      p.paralyzeTimer = 0;
      p.movement = true;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.onGround = false;
    if (p.y + p.h >= FLOOR) {
      setPosition(p, p.x, FLOOR - p.h);
      p.vy = 0;
      p.onGround = true;
      p.jumps = 0;
    } else {
      for (let plat of platforms) {
        if (
          p.vy >= 0 &&
          p.x + p.w > plat.x && p.x < plat.x + plat.w &&
          p.y + p.h > plat.y && p.y + p.h - p.vy <= plat.y + 3
        ) {
          setPosition(p, p.x, plat.y - p.h);
          p.vy = 0;
          p.onGround = true;
          p.jumps = 0;
        }
      }
    }
    if (p.y < 0) { setPosition(p, p.x, 0); p.vy = 0; }
    return;
  }

  const controls = getControls(pid);
  if (updateBlocking(p, pid)) return;
  if (p.movement) {
    if (p.dash > 0) {
      p.dash--;
    } else {
      if (keys[controls.left] && !keys[controls.right] && !p.blocking) {
        p.vx = -PLAYER_SPEED; p.facing = -1;
      }
      if (keys[controls.right] && !keys[controls.left] && !p.blocking) {
        p.vx = PLAYER_SPEED; p.facing = 1;
      }
      if ((!keys[controls.left] && !keys[controls.right]) || p.blocking) {
        p.vx *= FRICTION;
        if (Math.abs(p.vx) < 0.3) p.vx = 0;
      }
    }
    let slowFallActive = false;
    if (!p.onGround && keys[controls.up]) slowFallActive = true;
    if (keys[controls.up]) {
      if ((p.onGround || p.jumps < MAX_JUMPS) && !p.jumpHeld && !p.blocking) {
        p.vy = -JUMP_VEL;
        p.jumps++;
        p.jumpHeld = true;
      }
    } else {
      p.jumpHeld = false;
    }
    if (p.dashCooldown > 0) p.dashCooldown--;
    if (slowFallActive && p.vy > 0) p.vy += GRAVITY * SLOW_FALL_MULTIPLIER;
    else p.vy += GRAVITY;
    p.x += p.vx; p.y += p.vy;
    p.x = Math.max(0, Math.min(WIDTH - p.w, p.x));
    p.onGround = false;
    if (p.y + p.h >= FLOOR) {
      setPosition(p, p.x, FLOOR - p.h);
      p.vy = 0;
      p.onGround = true;
      p.jumps = 0;
    } else {
      for (let plat of platforms) {
        if (
          p.vy >= 0 &&
          p.x + p.w > plat.x && p.x < plat.x + plat.w &&
          p.y + p.h > plat.y && p.y + p.h - p.vy <= plat.y + 3
        ) {
          setPosition(p, p.x, plat.y - p.h);
          p.vy = 0;
          p.onGround = true;
          p.jumps = 0;
        }
      }
    }
    if (p.y < 0) { setPosition(p, p.x, 0); p.vy = 0; }
  }
}

// In game.js - modify handleDashAndBlockDamage function
function handleDashAndBlockDamage() {
  let p1 = players[0], p2 = players[1];
  if (!p1.alive || !p2.alive) return;
  for (let i = 0; i < 2; i++) {
    let p = players[i], opp = players[1 - i];
    if (p.dash > 0 && !p.hasDashHit) {
      if (
        p.x < opp.x + opp.w && p.x + p.w > opp.x &&
        p.y < opp.y + opp.h && p.y + p.h > opp.y
      ) {
        if (isBlockingProperly(opp, p)) {
          // Block successful: push attacker back, deplete block, then paralyze attacker
          knockback(opp, p, BLOCK_PUSHBACK_X, BLOCK_PUSHBACK_Y);
          reduceBlock(opp, 12);
          setParalyzed(p, 45);
          
          // Award point for successful block
          points(opp, 1);
          log(opp.name + " gained 1 point for perfect block! (Total: " + opp.points + ")");
        } else {
          // Not blocking or wrong direction: take damage
          handleDashDmg(p, opp, 10);
        }
        p.hasDashHit = true;
      }
    }
    if (p.dash === 0) p.hasDashHit = false;
  }
}

// CAMERA MOVEMENT
// CAMERA MOVEMENT - Original version
// Replace your existing getCamera function with this:
function getCamera() {
    const p1 = players[0], p2 = players[1];
    const x1 = p1.x + p1.w / 2, y1 = p1.y + p1.h / 2;
    const x2 = p2.x + p2.w / 2, y2 = p2.y + p2.h / 2;

    // Center between both players
    let cx = (x1 + x2) / 2;
    let cy = (y1 + y2) / 2;

    // Add padding around players
    const extra = 80;
    const playersW = Math.abs(x2 - x1) + p1.w + p2.w + extra;
    const playersH = Math.abs(y2 - y1) + p1.h + p2.h + extra;

    // Zoom so both players fit
    const zoomW = canvas.width / playersW;
    const zoomH = canvas.height / playersH;
    let baseZoom = Math.min(zoomW, zoomH);

    // Clamp base zoom
    const minZoom = Math.max(canvas.width / WIDTH, canvas.height / HEIGHT);
    const maxZoom = 1.8;
    baseZoom = Math.max(minZoom, Math.min(maxZoom, baseZoom));
    
    // Apply zoom effect if active
    let finalZoom = baseZoom;
    if (cameraZoomEffect.active) {
        finalZoom = baseZoom * cameraZoomEffect.currentZoom;
    }

    // Keep camera within stage bounds
    const viewW = canvas.width / finalZoom, viewH = canvas.height / finalZoom;
    cx = Math.max(viewW / 2, Math.min(WIDTH - viewW / 2, cx));
    cy = Math.max(viewH / 2, Math.min(HEIGHT - viewH / 2, cy));

    return { cx, cy, zoom: finalZoom };
}

function startCameraZoomEffect() {
    cameraZoomEffect.active = true;
    cameraZoomEffect.phase = 'zoom_in';
    cameraZoomEffect.startTime = performance.now();
    cameraZoomEffect.startZoom = 1;
    cameraZoomEffect.currentZoom = 1;
}

function updateCameraZoomEffect() {
    if (!cameraZoomEffect.active) return;
    
    const now = performance.now();
    const elapsed = now - cameraZoomEffect.startTime;
    
    switch (cameraZoomEffect.phase) {
        case 'zoom_in':
            // Slowly zoom in with easing
            const zoomProgress = Math.min(elapsed / cameraZoomEffect.duration.zoomIn, 1);
            const easeProgress = 1 - Math.pow(1 - zoomProgress, 3); // Ease out cubic
            cameraZoomEffect.currentZoom = 1 + (cameraZoomEffect.targetZoom - 1) * easeProgress;
            
            if (elapsed >= cameraZoomEffect.duration.zoomIn) {
                cameraZoomEffect.phase = 'hold';
                cameraZoomEffect.startTime = now;
            }
            break;
            
        case 'hold':
            // Hold the zoom at target level
            cameraZoomEffect.currentZoom = cameraZoomEffect.targetZoom;
            
            if (elapsed >= cameraZoomEffect.duration.hold) {
                cameraZoomEffect.phase = 'zoom_out';
                cameraZoomEffect.startTime = now;
            }
            break;
            
        case 'zoom_out':
            // Zoom back out smoothly
            const outProgress = Math.min(elapsed / cameraZoomEffect.duration.zoomOut, 1);
            const easeOutProgress = Math.pow(outProgress, 2); // Ease in quadratic
            cameraZoomEffect.currentZoom = cameraZoomEffect.targetZoom - (cameraZoomEffect.targetZoom - 1) * easeOutProgress;
            
            if (elapsed >= cameraZoomEffect.duration.zoomOut) {
                // Effect complete
                cameraZoomEffect.active = false;
                cameraZoomEffect.phase = 'idle';
                cameraZoomEffect.currentZoom = 1;
            }
            break;
    }
}

function draw() {
  // Clear before transformations
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- CAMERA SETUP ---
  ctx.save();
  const { cx, cy, zoom } = getCamera();
  // Translate so the camera center is the midpoint, then scale/zoom
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-cx, -cy);

  // BACKGROUND
  ctx.fillStyle = "#181c24";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(0, FLOOR, WIDTH, HEIGHT - FLOOR);

  // PLATFORMS
  platforms.forEach(p => {
    ctx.fillStyle = "#ffd54f";
    ctx.fillRect(p.x, p.y, p.w, PLATFORM_HEIGHT);
    ctx.strokeStyle = "#ffb300";
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x, p.y, p.w, PLATFORM_HEIGHT);
  });

  // PLAYERS
  for (let p of players) {
    if (!p.alive) continue;
    
    // Draw shadow
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y + p.h - 4, p.w / 2.5, 7, 0, 0, 2 * Math.PI);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.globalAlpha = 1;
    
    // Draw block indicator if blocking
    if (p.blocking && p.block > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#b0bec5";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.roundRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8, 18);
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw paralyzed indicator
    if (p.isParalyzed) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(performance.now() / 120);
      ctx.strokeStyle = "#ffd740";
      ctx.lineWidth = 4 + 2 * Math.sin(performance.now() / 60);
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y - 14, 19 + 3 * Math.sin(performance.now() / 120), 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
    
    // Draw player body
    if (p.render) {
      // Use custom render method if defined by character
      p.render(ctx);
    } else {
      // Default player rendering
      ctx.fillStyle = p.color;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
    
    // Draw hit flash
    if (p.justHit > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#fff";
      ctx.fillRect(p.x - 3, p.y - 3, p.w + 6, p.h + 6);
      ctx.restore();
    }
  }

  // Add this after drawing players (around line 472)
  // Add visual feedback for pause state
  if (gameState.paused && gameState.pauseReason === 'judgement_cut') {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#4a90e2"; // Vergil's blue color
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    // Add some dramatic text
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = "#4a90e2";
    ctx.shadowBlur = 10;
    
    ctx.font = "18px Arial";
    ctx.shadowBlur = 5;
    ctx.restore();
  }
  
  // NOW render Judgement Cut WHITE LINES first (before shards)
  for (let p of players) {
    if (p.judgementCutEffect && p.judgementCutEffect.phase === 'lines') {
      const effect = p.judgementCutEffect;
      
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#3EB7FA";
      ctx.shadowBlur = 10;
      
        // Draw only the visible lines
    for (let i = 0; i < Math.min(effect.visibleLines, effect.lines.length); i++) {
        const line = effect.lines[i];
        const [x1, y1, x2, y2] = line;
        const worldX1 = effect.cameraX + x1;
        const worldY1 = effect.cameraY + y1;
        const worldX2 = effect.cameraX + x2;
        const worldY2 = effect.cameraY + y2;
        
        ctx.beginPath();
        ctx.moveTo(worldX1, worldY1);
        ctx.lineTo(worldX2, worldY2);
        ctx.stroke();
    }
      
      ctx.restore();
    }
  }
  
  // NOW render Judgement Cut effects AFTER all players
  for (let p of players) {
    if (p.judgementCutEffect && p.effectCtx) {
      const effect = p.judgementCutEffect;
      const effectCtx = p.effectCtx;
      
      // Clear the effect canvas
      effectCtx.clearRect(0, 0, effect.viewWidth, effect.viewHeight);
      
      // Draw each shard
      for (let s of effect.shards) {
        effectCtx.save();
        
        let cx=0, cy=0;
        for (let pt of s.poly) { cx+=pt[0]; cy+=pt[1]; }
        cx/=s.poly.length; cy/=s.poly.length;
        
        effectCtx.translate(cx + s.x, cy + s.y);
        effectCtx.rotate(s.angle);
        effectCtx.translate(-cx, -cy);
        
        effectCtx.beginPath();
        effectCtx.moveTo(s.poly[0][0], s.poly[0][1]);
        for (let j=1; j<s.poly.length; ++j) {
          effectCtx.lineTo(s.poly[j][0], s.poly[j][1]);
        }
        effectCtx.closePath();
        
        effectCtx.clip();
        effectCtx.drawImage(p.snapCanvas, 0, 0);
        
        // Add blue tint
        effectCtx.fillStyle = "rgba(0, 127, 255, 0.1)";
        effectCtx.fill();
        
        // Add glowing edge
        effectCtx.strokeStyle = "#00bfff";
        effectCtx.lineWidth = 1;
        effectCtx.globalAlpha = 0.4;
        effectCtx.stroke();
        
        effectCtx.restore();
      }
      
      // Draw the effect canvas at the camera position
      ctx.globalAlpha = 0.9;
      ctx.drawImage(p.effectCanvas, effect.cameraX, effect.cameraY);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore(); // end camera transform
}

// In game.js - modify updateUI function
function updateUI() {
  let p1 = players[0], p2 = players[1];
  document.getElementById("p1hp").style.width = Math.max(0, p1.hp) + "%";
  document.getElementById("p2hp").style.width = Math.max(0, p2.hp) + "%";
  document.getElementById("p1block").style.width = (p1.block / BLOCK_MAX * 100) + "%";
  document.getElementById("p2block").style.width = (p2.block / BLOCK_MAX * 100) + "%";
  document.getElementById("p1dash").style.width = (1 - (p1.dashCooldown / DASH_COOLDOWN)) * 100 + "%";
  document.getElementById("p2dash").style.width = (1 - (p2.dashCooldown / DASH_COOLDOWN)) * 100 + "%";
  
  // Update player names from character info
  document.getElementById("p1name").textContent = p1.name;
  document.getElementById("p2name").textContent = p2.name;
  
  // Update point indicators
  const p1PointsContainer = document.getElementById("p1points").children;
  const p2PointsContainer = document.getElementById("p2points").children;
  
  for (let i = 0; i < MAX_POINTS; i++) {
    p1PointsContainer[i].className = i < p1.points ? "point-circle active" : "point-circle";
    p2PointsContainer[i].className = i < p2.points ? "point-circle active" : "point-circle";
  }
}

// Replace the existing gameLoop function with this:
function gameLoop() {
  handleKeyEvents();
  updateCameraZoomEffect();
  
  // Only update game logic if not paused
  if (!gameState.paused) {
    for (let i = 0; i < players.length; i++) {
      let p = players[i];
      if (p.justHit > 0) p.justHit--;
      updatePlayer(p, i);
    }
    handleDashAndBlockDamage();
  }
  
  // Always update UI and draw (so we can see the pause effect)
  updateUI();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();
