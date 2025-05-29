//utils.js
// Utility functions
function log(msg) {
  const logDiv = document.getElementById("game-log");
  if (!logDiv) return;
  logDiv.innerHTML += `<div>${msg}</div>`;
  let lines = logDiv.children;
  if (lines.length > 50) logDiv.removeChild(lines[0]);
  logDiv.scrollTop = logDiv.scrollHeight;
}

function setHealth(player, value) {
  player.hp = Math.max(0, Math.min(100, value));
}

function healToFull(player) {
  player.hp = 100;
}

function setPosition(player, x, y) {
  player.x = x;
  player.y = y;
}

function addBlock(player, amount) {
  player.block = Math.min(BLOCK_MAX, player.block + amount);
}

function reduceBlock(player, amount) {
  player.block = Math.max(0, player.block - amount);
}

function resetDashCooldown(player) {
  player.dashCooldown = 0;
}

function setParalyzed(player, duration) {
  player.isParalyzed = true;
  player.paralyzeTimer = duration;
  player.movement = false;
}

function knockback(attacker, defender, strengthX, strengthY) {
  defender.vx = (defender.x < attacker.x ? -1 : 1) * Math.abs(strengthX);
  defender.vy = strengthY;
}

function isBlockingProperly(blocker, attacker) {
  return blocker.blocking && blocker.block > 0 && (blocker.facing === -attacker.facing);
}

function handleDashDmg(attacker, victim, dmg) {
  attacker.dashdmg = dmg; // assign unique identifier for this dash hit
  victim.hp -= dmg;
  if (victim.hp < 0) victim.hp = 0;
  victim.justHit = 10;
  log(attacker.name + " hit " + victim.name + " with DASH for " + dmg + " damage (dashdmg=" + attacker.dashdmg + ")");
}

function getControls(pid) {
  return pid === 0
    ? { left: 'a', right: 'd', up: 'w', down: 's', special: 'e' }
    : { left: 'k', right: ';', up: 'o', down: 'l', special: 'p' };
}

// start of point functions
function points(player, amount) {
  player.points = Math.max(0, Math.min(MAX_POINTS, player.points + amount));
  return player.points;
}
// end of point functions

// In utils.js - Add this function
function createPlaceholderSprite(color, frameCount, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width * frameCount;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  for (let i = 0; i < frameCount; i++) {
    ctx.fillStyle = color;
    ctx.fillRect(i * width, 0, width, height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(i * width + 2, 2, width - 4, height - 4);
    
    // Add frame number
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(i+1, i * width + width/2, height/2 + 7);
  }
  
  return canvas.toDataURL();
}

