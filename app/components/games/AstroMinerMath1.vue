<template>
  <div class="miner-container" ref="gameContainerRef">
    <canvas ref="gameCanvasRef"></canvas>

    <!-- UI Overlay -->
    <div class="ui-layer">
      <!-- Top Info -->
      <div class="header">
        <div class="score-panel">
          <span class="label">DEPTH</span>
          <span class="value">{{ Math.floor(player.gridY) }}m</span>
        </div>
        <div class="score-panel">
          <span class="label">CRYSTALS</span>
          <span class="value text-yellow-400">{{ score }}</span>
        </div>
      </div>

      <!-- Drills Selector (Bottom) -->
      <div class="drill-selector">
        <div class="drill-label">ACTIVE DRILL:</div>
        <div class="drills-row">
          <button 
            v-for="d in availableDrills" 
            :key="d"
            class="drill-btn"
            :class="{ 'active': currentDrill === d }"
            @click="selectDrill(d)"
            @touchstart.stop="selectDrill(d)"
          >
            <span class="drill-num">{{ d }}</span>
            <span class="drill-icon">▼</span>
          </button>
        </div>
      </div>

      <!-- Mobile Controls (D-Pad) -->
      <div class="dpad-overlay" v-if="isMobile">
        <div class="dpad-row">
          <button class="dpad-btn" @touchstart.prevent="handleInput('up')">▲</button>
        </div>
        <div class="dpad-row middle">
          <button class="dpad-btn" @touchstart.prevent="handleInput('left')">◀</button>
          <button class="dpad-btn" @touchstart.prevent="handleInput('down')">▼</button>
          <button class="dpad-btn" @touchstart.prevent="handleInput('right')">▶</button>
        </div>
      </div>
    </div>

    <!-- Menu -->
    <div v-if="gameState !== 'playing'" class="menu-overlay">
      <div class="menu-content">
        <h1 class="game-title">ASTRO MINER</h1>
        <p class="subtitle">DIVISIBILITY DEEP DIVE</p>
        <div class="tutorial">
          <p>Разрушай блоки, подбирая правильный делитель.</p>
          <div class="example">
            <div class="block-ex">24</div>
            <span>÷</span>
            <div class="drill-ex">6</div>
            <span>=</span>
            <span class="ok">OK!</span>
          </div>
          <div class="example">
            <div class="block-ex">24</div>
            <span>÷</span>
            <div class="drill-ex">5</div>
            <span>=</span>
            <span class="bad">NO</span>
          </div>
        </div>
        <button @click="startGame" class="start-btn">
          {{ score > 0 ? 'RESUME DIGGING' : 'START MISSION' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

// --- Constants & Config ---
const TILE_SIZE = 64;
const COLS = 9; // Odd number looks better for centering
const GRAVITY = 0.2;
const COLORS = {
  bg: '#0d0b14',
  rock: '#3c3645',
  rockHard: '#2a2433', // Harder to break visual
  soil: '#1e1826',
  gem: '#00ffcc',
  player: '#ffaa00',
  uiBg: 'rgba(20, 16, 30, 0.9)',
  drillActive: '#ffaa00',
  drillInactive: '#555'
};

// --- State ---
const gameContainerRef = ref(null);
const gameCanvasRef = ref(null);
const gameState = ref('initial');
const score = ref(0);
const isMobile = ref(false);

// Game Objects
const player = ref({
  gridX: 4, // Center
  gridY: 2, // Start a bit down
  visualX: 4 * TILE_SIZE,
  visualY: 2 * TILE_SIZE,
  dir: 1, // 1 right, -1 left
  actionState: 'idle', // idle, moving, drilling
  targetX: 4,
  targetY: 2
});

const camera = { y: 0 };
const availableDrills = [2, 3, 4, 5, 6, 10];
const currentDrill = ref(2);

// Map: Object map with key `${x},${y}` for sparse infinite generation
let map = new Map(); 
let particles = [];
let floatingTexts = []; // For showing math results

// Engine
let ctx = null;
let animationFrameId;
let lastTime = 0;
let width = 0;
let height = 0;

// --- Core Logic ---

function startGame() {
  score.value = 0;
  map.clear();
  particles = [];
  floatingTexts = [];
  currentDrill.value = 2;
  
  // Reset Player
  player.value.gridX = Math.floor(COLS / 2);
  player.value.gridY = 0;
  player.value.visualX = player.value.gridX * TILE_SIZE;
  player.value.visualY = 0;
  player.value.targetX = player.value.gridX;
  player.value.targetY = 0;
  
  // Generate initial platform
  for(let x=0; x<COLS; x++) {
    // Air above
    for(let y=-5; y<0; y++) setTile(x, y, { type: 'empty' });
    // Starting platform is empty
    setTile(x, 0, { type: 'empty' });
  }

  // Pre-generate some rows
  for(let y=1; y<15; y++) generateRow(y);

  gameState.value = 'playing';
  lastTime = performance.now();
  loop(lastTime);
}

function generateRow(y) {
  for (let x = 0; x < COLS; x++) {
    // Bedrock on sides
    if (x === 0 || x === COLS - 1) {
      setTile(x, y, { type: 'bedrock' });
      continue;
    }

    // Random chance for empty space (caves)
    if (Math.random() < 0.15) {
      setTile(x, y, { type: 'empty' });
      continue;
    }

    // Generate MATH Rock
    // 1. Pick a random drill that CAN break this rock (to ensure passability)
    const validDrill = availableDrills[Math.floor(Math.random() * availableDrills.length)];
    // 2. Generate value: drill * random factor
    // Depth scaling: deeper = bigger numbers
    const depthFactor = Math.floor(y / 20) + 1;
    const multiplier = Math.floor(Math.random() * (5 * depthFactor)) + 1;
    let val = validDrill * multiplier;
    
    // Cap value to keep mental math reasonable for kids
    if (val > 100) val = val - (val % 10); // Round big numbers
    if (val === 0) val = validDrill;

    setTile(x, y, { 
      type: 'rock', 
      value: val, 
      maxHp: 1, // Future: maybe multihit?
      hp: 1,
      shake: 0 // For animation
    });
  }
}

function setTile(x, y, data) {
  map.set(`${x},${y}`, { x, y, ...data });
}

function getTile(x, y) {
  return map.get(`${x},${y}`) || null; // Null means not generated yet
}

// --- Input & Movement ---

function selectDrill(d) {
  currentDrill.value = d;
  // Visual feedback
  createSparkles(player.value.visualX + TILE_SIZE/2, player.value.visualY + TILE_SIZE/2, COLORS.drillActive);
}

function handleInput(dir) {
  if (player.value.actionState !== 'idle') return; // Wait for move to finish

  let dx = 0;
  let dy = 0;

  if (dir === 'left') { dx = -1; player.value.dir = -1; }
  if (dir === 'right') { dx = 1; player.value.dir = 1; }
  if (dir === 'down') { dy = 1; }
  if (dir === 'up') { dy = -1; } // Jetpack logic? Or just climb

  const nextX = player.value.gridX + dx;
  const nextY = player.value.gridY + dy;

  // Check Bounds
  if (nextX < 0 || nextX >= COLS) return;

  // Check Tile Interaction
  // Note: We generate rows on the fly if they don't exist
  if (!getTile(nextX, nextY)) generateRow(nextY);
  
  const tile = getTile(nextX, nextY);

  if (tile.type === 'bedrock') {
    triggerShake(tile);
    return;
  }

  if (tile.type === 'empty') {
    // Move freely
    moveTo(nextX, nextY);
  } else if (tile.type === 'rock') {
    // DRILL IT!
    attemptDrill(tile, nextX, nextY);
  }
}

function attemptDrill(tile, tx, ty) {
  const divisor = currentDrill.value;
  
  if (tile.value % divisor === 0) {
    // SUCCESS
    const result = tile.value / divisor;
    
    // Effects
    createExplosion(tx, ty, COLORS.rock);
    addFloatingText(tx, ty, `${result}`, '#00ff00'); // Show Quotient
    score.value += result; // Score based on complexity
    
    // Destroy block
    setTile(tx, ty, { type: 'empty' });
    
    // Move player into the space
    moveTo(tx, ty);
    
  } else {
    // FAIL
    triggerShake(tile);
    addFloatingText(tx, ty, 'NO!', '#ff0000');
    // Punishment? Maybe slight delay
  }
}

function moveTo(tx, ty) {
  player.value.actionState = 'moving';
  player.value.targetX = tx;
  player.value.targetY = ty;
  player.value.gridX = tx;
  player.value.gridY = ty;
  
  // Generate upcoming rows if moving down
  if (ty > camera.y / TILE_SIZE + 10) {
     // Generation happens lazily in getTile usually, but good to pre-seed
  }
}

function triggerShake(tile) {
  tile.shake = 10;
}

// --- Game Loop ---

function loop(timestamp) {
  if (gameState.value !== 'playing') return;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(dt);
  draw();

  animationFrameId = requestAnimationFrame(loop);
}

function update(dt) {
  // 1. Player Animation (Lerp)
  const targetVisX = player.value.targetX * TILE_SIZE;
  const targetVisY = player.value.targetY * TILE_SIZE;
  
  // Smooth movement speed
  const speed = 15 * TILE_SIZE; // pixels per second
  
  // Simple lerp approach for grid movement
  const diffX = targetVisX - player.value.visualX;
  const diffY = targetVisY - player.value.visualY;
  
  if (Math.abs(diffX) < 5 && Math.abs(diffY) < 5) {
    player.value.visualX = targetVisX;
    player.value.visualY = targetVisY;
    player.value.actionState = 'idle';
    
    // GRAVITY CHECK (Only if idle)
    // Look at tile below
    const belowY = player.value.gridY + 1;
    if (!getTile(player.value.gridX, belowY)) generateRow(belowY);
    const tileBelow = getTile(player.value.gridX, belowY);
    
    if (tileBelow && tileBelow.type === 'empty') {
      // Fall
      moveTo(player.value.gridX, belowY);
    }
    
  } else {
    player.value.visualX += diffX * 10 * dt;
    player.value.visualY += diffY * 10 * dt;
  }

  // 2. Camera Follow
  // Target Y is player Y centered vertically
  const targetCamY = player.value.visualY - (height / 2);
  camera.y += (targetCamY - camera.y) * 5 * dt;
  // Don't scroll up past 0
  // if (camera.y < 0) camera.y = 0; 

  // 3. Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 10 * dt; // Gravity
    p.life -= dt * 2;
    if (p.life <= 0) particles.splice(i, 1);
  }
  
  // 4. Floating Text
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.y -= 30 * dt; // Float up
    t.life -= dt;
    if (t.life <= 0) floatingTexts.splice(i, 1);
  }
  
  // 5. Tile Shake Decay
  // We iterate only visible tiles ideally, but map map iteration is okay for small sets
  // Optimization: Only update tiles near player if map gets huge
}

// --- Rendering ---

function draw() {
  if (!ctx) return;
  
  // Clear
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  // Camera Transform
  // Center horizontally: (Width - GridWidth) / 2
  const gridPixelWidth = COLS * TILE_SIZE;
  const offsetX = (width - gridPixelWidth) / 2;
  
  ctx.translate(Math.floor(offsetX), Math.floor(-camera.y));

  // 1. Draw Map
  // Optimization: Draw only visible range
  const startRow = Math.floor(camera.y / TILE_SIZE) - 1;
  const endRow = startRow + Math.ceil(height / TILE_SIZE) + 2;

  for (let y = startRow; y <= endRow; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = getTile(x, y);
      if (tile) drawTile(tile, x, y);
    }
  }

  // 2. Draw Player
  drawPlayer();

  // 3. Particles
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  
  // 4. Floating Text
  ctx.font = 'bold 24px "Courier New"';
  ctx.textAlign = 'center';
  floatingTexts.forEach(t => {
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  });

  ctx.restore();
}

function drawTile(tile, x, y) {
  if (tile.type === 'empty') return;

  let tx = x * TILE_SIZE;
  let ty = y * TILE_SIZE;

  // Shake offset
  if (tile.shake > 0) {
    tx += (Math.random() - 0.5) * tile.shake;
    ty += (Math.random() - 0.5) * tile.shake;
    tile.shake *= 0.9; // Decay
    if (tile.shake < 0.5) tile.shake = 0;
  }

  // Base color
  ctx.fillStyle = tile.type === 'bedrock' ? '#111' : COLORS.rock;
  
  // Bevel effect
  ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
  
  // Inner detail
  if (tile.type === 'rock') {
    ctx.fillStyle = '#4a4357'; // Lighter top
    ctx.fillRect(tx + 2, ty + 2, TILE_SIZE - 4, 4);
    
    // THE NUMBER
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tile.value, tx + TILE_SIZE/2, ty + TILE_SIZE/2);
    
    // Hint: Corner dots representing divisibility roughly? No, too cluttered.
  } else if (tile.type === 'bedrock') {
    ctx.fillStyle = '#333';
    ctx.fillRect(tx+5, ty+5, 10, 10);
    ctx.fillRect(tx+40, ty+40, 10, 10);
  }
}

function drawPlayer() {
  const x = player.value.visualX;
  const y = player.value.visualY;
  const s = TILE_SIZE;
  
  ctx.save();
  ctx.translate(x + s/2, y + s/2);
  
  // Flip if left
  if (player.value.dir === -1) ctx.scale(-1, 1);

  // Body
  ctx.fillStyle = COLORS.player;
  // Robot shape: Rounded box
  ctx.beginPath();
  ctx.roundRect(-20, -20, 40, 40, 5);
  ctx.fill();
  
  // Tracks
  ctx.fillStyle = '#555';
  ctx.fillRect(-15, 15, 30, 10);
  
  // Eye
  ctx.fillStyle = '#00ffff';
  ctx.fillRect(5, -10, 10, 10);
  
  // THE DRILL
  // Drill color matches selection
  ctx.fillStyle = COLORS.drillActive; 
  // Simple cone drill
  ctx.beginPath();
  ctx.moveTo(20, -5);
  ctx.lineTo(40 + (Math.random()*5), 0); // Vibrate drill
  ctx.lineTo(20, 5);
  ctx.fill();
  
  // Drill Text (Show current drill on player too)
  ctx.scale(player.value.dir === -1 ? -1 : 1, 1); // Unflip text
  ctx.fillStyle = '#000';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(currentDrill.value, 0, 5);

  ctx.restore();
}

// --- Effects ---

function createExplosion(gx, gy, color) {
  const cx = gx * TILE_SIZE + TILE_SIZE/2;
  const cy = gy * TILE_SIZE + TILE_SIZE/2;
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: cx, y: cy,
      vx: (Math.random() - 0.5) * 300,
      vy: (Math.random() - 0.5) * 300,
      size: Math.random() * 5 + 2,
      color: color,
      life: 1.0
    });
  }
}

function createSparkles(x, y, color) {
   for (let i = 0; i < 5; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 100,
      vy: (Math.random() - 0.5) * 100,
      size: 2,
      color: color,
      life: 0.5
    });
  }
}

function addFloatingText(gx, gy, text, color) {
  floatingTexts.push({
    x: gx * TILE_SIZE + TILE_SIZE/2,
    y: gy * TILE_SIZE,
    text, color, life: 1.0
  });
}

// --- System ---

function handleKeyDown(e) {
  if (gameState.value !== 'playing') return;
  
  // Movement
  if (['ArrowUp', 'w'].includes(e.key)) handleInput('up');
  if (['ArrowDown', 's'].includes(e.key)) handleInput('down');
  if (['ArrowLeft', 'a'].includes(e.key)) handleInput('left');
  if (['ArrowRight', 'd'].includes(e.key)) handleInput('right');
  
  // Drill Selection (Numbers)
  const num = parseInt(e.key);
  if (availableDrills.includes(num)) {
    selectDrill(num);
  }
  // 0 for 10
  if (e.key === '0' && availableDrills.includes(10)) selectDrill(10);
}

function resize() {
  if (gameContainerRef.value) {
    width = gameContainerRef.value.clientWidth;
    height = gameContainerRef.value.clientHeight;
    gameCanvasRef.value.width = width;
    gameCanvasRef.value.height = height;
    
    // Mobile check
    isMobile.value = width < 768;
  }
}

onMounted(() => {
  ctx = gameCanvasRef.value.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', handleKeyDown);
  
  startGame();
  gameState.value = 'initial'; // Show menu first
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', resize);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;700&display=swap');

.miner-container {
  width: 100%; height: 100%;
  background: #0d0b14;
  position: relative;
  font-family: 'Chakra Petch', sans-serif;
  overflow: hidden;
  user-select: none;
}

canvas { display: block; width: 100%; height: 100%; }

/* UI Overlay */
.ui-layer {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
  display: flex; flex-direction: column; justify-content: space-between;
}

.header {
  display: flex; justify-content: space-between; padding: 20px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent);
}

.score-panel {
  display: flex; flex-direction: column;
  background: rgba(30, 24, 38, 0.8);
  border: 1px solid #555;
  padding: 8px 16px;
  border-radius: 8px;
  min-width: 100px;
}
.label { font-size: 10px; color: #888; letter-spacing: 1px; }
.value { font-size: 24px; font-weight: bold; color: #fff; }
.text-yellow-400 { color: #fbbf24; }

/* Drill Selector */
.drill-selector {
  pointer-events: auto;
  background: rgba(13, 11, 20, 0.95);
  border-top: 2px solid #333;
  padding: 10px 20px 30px 20px; /* Extra bottom pad for mobile home bar */
  display: flex; flex-direction: column; align-items: center;
}

.drill-label { font-size: 12px; color: #aaa; margin-bottom: 8px; }

.drills-row {
  display: flex; gap: 8px; overflow-x: auto; width: 100%; justify-content: center;
}

.drill-btn {
  background: #2a2433; border: 2px solid #444; color: #888;
  width: 50px; height: 60px;
  border-radius: 8px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
}

.drill-btn.active {
  background: #4d4118; border-color: #ffaa00; color: #fff;
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(255, 170, 0, 0.3);
}

.drill-num { font-size: 24px; font-weight: bold; }
.drill-icon { font-size: 10px; margin-top: 2px; }

/* Mobile D-Pad */
.dpad-overlay {
  position: absolute; bottom: 140px; right: 20px;
  pointer-events: auto;
  display: flex; flex-direction: column; align-items: center; gap: 5px;
}
.dpad-row { display: flex; gap: 5px; }
.dpad-btn {
  width: 60px; height: 60px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  color: white; font-size: 24px;
  backdrop-filter: blur(4px);
}
.dpad-btn:active { background: rgba(255,170,0,0.3); }

/* Menu */
.menu-overlay {
  position: absolute; inset: 0; background: rgba(0,0,0,0.9);
  display: flex; align-items: center; justify-content: center; z-index: 10; pointer-events: auto;
}
.menu-content {
  text-align: center; color: #fff; max-width: 400px;
}
.game-title { font-size: 48px; margin: 0; color: #ffaa00; }
.subtitle { color: #666; margin-bottom: 30px; letter-spacing: 4px; }

.tutorial {
  background: #1e1826; padding: 20px; border-radius: 12px; margin-bottom: 30px;
}
.example {
  display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 10px; font-size: 20px;
}
.block-ex, .drill-ex {
  background: #333; padding: 5px 10px; border-radius: 4px; font-weight: bold;
}
.drill-ex { border: 2px solid #ffaa00; }
.ok { color: #0f0; font-weight: bold; }
.bad { color: #f00; font-weight: bold; }

.start-btn {
  background: #ffaa00; color: #000; border: none;
  padding: 16px 48px; font-size: 20px; font-weight: bold; border-radius: 8px; cursor: pointer;
}
.start-btn:hover { background: #ffc040; transform: scale(1.05); }
</style>