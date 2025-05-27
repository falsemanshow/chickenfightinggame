// Game constants
const WIDTH = 900, HEIGHT = 600, FLOOR = HEIGHT - 30, PLATFORM_HEIGHT = 20;
const PLAYER_SIZE = 54, PLAYER_SPEED = 5, GRAVITY = 0.7, FRICTION = 0.7;
const JUMP_VEL = 15, MAX_JUMPS = 2, DASH_FRAMES = 8, DASH_SPEED = 13, DASH_COOLDOWN = 36;
const BLOCK_MAX = 100, BLOCK_DEPLETION = 1.8, BLOCK_RECOVERY = 0.8, SLOW_FALL_MULTIPLIER = 0.16;
const BLOCK_PUSHBACK_X = 9, BLOCK_PUSHBACK_Y = -4;
// Points system
const MAX_POINTS = 5;
const BLOCK_POINT_REWARD = 1;
const SMASH_POINT_COST = 1;

// Platforms configuration
const platforms = [
  { x: WIDTH / 2 - 70, y: FLOOR - 90, w: 140 },
  { x: WIDTH / 4 - 60, y: FLOOR - 180, w: 120 },
  { x: 3 * WIDTH / 4 - 60, y: FLOOR - 180, w: 120 },
  { x: 60, y: FLOOR - 60, w: 120 },
  { x: WIDTH - 180, y: FLOOR - 60, w: 120 }
];