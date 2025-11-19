<template>
  <div class="game-container" ref="containerRef">
    <canvas ref="canvasRef"></canvas>

    <!-- UI Layer -->
    <div class="ui-layer">
      <!-- Header -->
      <div class="header">
        <div class="score-box">
          <span class="label">{{ t('sumtris.score') }}</span>
          <span class="value">{{ score }}</span>
        </div>
        <div class="target-box">
          <span class="label">{{ t('sumtris.target') }}</span>
          <span class="target-num">10</span>
        </div>
        <div class="score-box">
          <span class="label">{{ t('sumtris.level') }}</span>
          <span class="value">{{ level }}</span>
        </div>
      </div>

      <!-- Game Over -->
      <div v-if="gameState === 'gameover'" class="modal-overlay">
        <div class="modal box-pop">
          <h1>{{ t('sumtris.gridFull') }}</h1>
          <p>{{ t('sumtris.finalScore') }} <span class="text-yellow">{{ score }}</span></p>
          <button @click="startGame" class="btn-primary">{{ t('sumtris.tryAgain') }}</button>
        </div>
      </div>

      <!-- Start Menu -->
      <div v-if="gameState === 'menu'" class="modal-overlay">
        <div class="modal">
          <h1 class="title">{{ t('sumtris.title') }}</h1>
          <p class="desc" v-html="t('sumtris.description')"></p>
          <div class="tutorial-viz">
            <span class="b b-3">3</span> + <span class="b b-5">5</span> + <span class="b b-2">2</span> = <span class="text-green">10!</span>
          </div>
          <button @click="startGame" class="btn-primary">{{ t('sumtris.play') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18nService } from '~/composables/useI18nService';

const { t } = useI18nService();
const emit = defineEmits(['completed']);

// --- Config ---
const COLS = 6;
const ROWS = 9; 
const TILE_SIZE = 60; 
const COLORS = {
  bg: '#1a1a2e',
  gridBg: '#16213e',
  lineDefault: '#ffffff',
  lineSuccess: '#00ff88',
  lineFail: '#ff3366',
  blocks: [
    '#ff6b6b', // 1 - Red
    '#feca57', // 2 - Yellow
    '#48dbfb', // 3 - Cyan
    '#ff9ff3', // 4 - Pink
    '#54a0ff', // 5 - Blue
    '#5f27cd', // 6 - Purple
    '#c8d6e5', // 7 - Grey
    '#1dd1a1', // 8 - Green
    '#ff9f43', // 9 - Orange
  ]
};

// --- State ---
const containerRef = ref(null);
const canvasRef = ref(null);
const gameState = ref('menu'); 
const score = ref(0);
const level = ref(1);

let ctx = null;
let width = 0, height = 0;
let grid = []; 
let particles = [];
let floatingTexts = [];
let selection = []; 
let currentSum = 0;
let spawnTimer = 0;
let spawnInterval = 3000; 
let lastTime = 0;
let tileW = 0;
let offsetX = 0, offsetY = 0;
let dragActive = false;
const lastScoreMilestone = ref(0);

// --- WEIGHTED RANDOM POOL ---
// More small numbers, fewer big numbers to prevent grid lock
const NUMBER_POOL = [
  1, 1, 1, 1, 1, 1, 1, // 1: High freq
  2, 2, 2, 2, 2, 2, // 2: High freq
  3, 3, 3, 3, 3,    // 3: High freq
  4, 4, 4, 4,     // 4: Med-High
  5, 5, 5,        // 5: Med
  6, 6,          // 6: Low
  7,           // 7: Low
  8,              // 8: Rare
  9,              // 9: Rare
];

function getWeightedNumber() {
  const idx = Math.floor(Math.random() * NUMBER_POOL.length);
  return NUMBER_POOL[idx];
}

// --- Core Logic ---

function initGrid() {
  grid = Array.from({ length: COLS }, () => Array(ROWS).fill(null));
}

function startGame() {
  score.value = 0;
  level.value = 1;
  lastScoreMilestone.value = 0;
  spawnInterval = 3000;
  initGrid();
  particles = [];
  floatingTexts = [];
  selection = [];
  currentSum = 0;
  
  // Spawn initial setup: Bottom 4 rows
  for(let r = ROWS - 1; r >= ROWS - 4; r--) {
    for(let c = 0; c < COLS; c++) {
      spawnBlockAt(c, r);
    }
  }

  gameState.value = 'playing';
  lastTime = performance.now();
  loop(lastTime);
}

function spawnBlockAt(c, r) {
  const val = getWeightedNumber();
  
  grid[c][r] = {
    val,
    visualY: -TILE_SIZE, 
    targetY: r * tileW,
    color: COLORS.blocks[val - 1],
    scale: 1,
    id: Math.random()
  };
  
  // Instant placement if menu/init
  if (gameState.value === 'menu') grid[c][r].visualY = r * tileW;
}

function spawnNewRow() {
  // Drop logic: Pick a random column that isn't full
  const availableCols = [];
  for(let c=0; c<COLS; c++) {
    // Check top row. If occupied, column is full
    if (!grid[c][0]) availableCols.push(c);
  }

  if (availableCols.length === 0) {
    gameState.value = 'gameover';
    return;
  }

  const c = availableCols[Math.floor(Math.random() * availableCols.length)];
  
  // Find lowest empty spot
  let r = 0;
  while (r < ROWS - 1 && !grid[c][r+1]) {
    r++;
  }
  
  spawnBlockAt(c, r);
  grid[c][r].visualY = -tileW; // Start above screen
}

// --- Interaction ---

function getCoords(e) {
  const rect = canvasRef.value.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x = clientX - rect.left - offsetX;
  const y = clientY - rect.top - offsetY;
  const c = Math.floor(x / tileW);
  const r = Math.floor(y / tileW);
  return { c, r, x, y };
}

function handleStart(e) {
  if (gameState.value !== 'playing') return;
  e.preventDefault(); 
  dragActive = true;
  const { c, r } = getCoords(e);
  attemptSelect(c, r);
}

function handleMove(e) {
  if (!dragActive || gameState.value !== 'playing') return;
  e.preventDefault();
  const { c, r } = getCoords(e);
  attemptSelect(c, r);
}

function handleEnd(e) {
  if (!dragActive) return;
  dragActive = false;
  
  if (currentSum === 10) {
    // SUCCESS
    const oldScore = score.value;
    const comboSize = selection.length;
    const points = comboSize * 10 + (comboSize > 2 ? (comboSize-2)*20 : 0);
    score.value += points;
    
    // Level Curve
    if (Math.floor(score.value / 500) > level.value - 1) {
      level.value++;
      // Cap speed at 500ms
      spawnInterval = Math.max(500, 3000 - ((level.value-1) * 300));
      addFloatingText(width/2, height/2, t('sumtris.speedUp'), "#fff");
    }

    // Milestone & Win
    if (Math.floor(oldScore / 500) < Math.floor(score.value / 500)) {
        lastScoreMilestone.value = Math.floor(score.value / 500) * 500;
    }
    if (oldScore < 3000 && score.value >= 3000) {
      addFloatingText(width/2, height/2, t('sumtris.win'), "#f1c40f"); // Win message
      emit('completed');
    } else if (score.value < 3000 && lastScoreMilestone.value > 0) {
      addFloatingText(width/2, height/2, t('sumtris.milestone', { remaining: 3000 - score.value }), "#f1c40f");
      lastScoreMilestone.value = 0; // Reset after showing
    }

    // Effects
    const center = selection[selection.length-1];
    createExplosion(center.c, center.r);
    addFloatingText(
      center.c * tileW + tileW/2 + offsetX, 
      center.r * tileW + offsetY, 
      `+${points}`, "#00ff88"
    );

    // Clear blocks
    selection.forEach(p => {
      grid[p.c][p.r] = null;
    });
    
    applyGravity();

  } 
  
  selection = [];
  currentSum = 0;
}

function attemptSelect(c, r) {
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
  if (!grid[c][r]) return; 

  // Start new
  if (selection.length === 0) {
    addToSelection(c, r);
    return;
  }

  const last = selection[selection.length - 1];
  
  // Undo (backtrack)
  if (selection.length > 1) {
    const prev = selection[selection.length - 2];
    if (prev.c === c && prev.r === r) {
      selection.pop();
      currentSum -= grid[last.c][last.r].val;
      return;
    }
  }

  // No duplicates
  if (selection.find(s => s.c === c && s.r === r)) return;

  // Adjacency Check (Allows Diagonals)
  const dc = Math.abs(c - last.c);
  const dr = Math.abs(r - last.r);
  
  if (dc <= 1 && dr <= 1 && (dc + dr > 0)) {
     addToSelection(c, r);
  }
}

function addToSelection(c, r) {
  // If adding implies going over 10 significantly, we still allow it visually
  // so user realizes their mistake (Red Line)
  selection.push({ c, r });
  currentSum += grid[c][r].val;
  
  // Animation pop
  grid[c][r].scale = 1.25;
}

function applyGravity() {
  for (let c = 0; c < COLS; c++) {
    let writePtr = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[c][r]) {
        if (r !== writePtr) {
            grid[c][writePtr] = grid[c][r];
            grid[c][r] = null;
            grid[c][writePtr].targetY = writePtr * tileW;
        }
        writePtr--;
      }
    }
  }
}

// --- Loop ---

function loop(timestamp) {
  if (gameState.value !== 'playing') {
    if (gameState.value === 'gameover') draw();
    return;
  }
  
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

function update(dt) {
  spawnTimer += dt;
  if (spawnTimer > spawnInterval) {
    spawnTimer = 0;
    spawnNewRow();
  }

  // Animations
  for(let c=0; c<COLS; c++) {
    for(let r=0; r<ROWS; r++) {
      const b = grid[c][r];
      if (b) {
        b.targetY = r * tileW;
        // Gravity
        if (b.visualY < b.targetY) {
           b.visualY += (b.targetY - b.visualY) * 0.15;
           if (Math.abs(b.visualY - b.targetY) < 1) b.visualY = b.targetY;
        }
        // Scale decay
        if (b.scale > 1) b.scale += (1 - b.scale) * 0.15;
      }
    }
  }
  
  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;
    if (p.life <= 0) particles.splice(i, 1);
  }
  
  // Floating Text
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].y -= 1.5;
    floatingTexts[i].life -= 0.02;
    if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
  }
}

// --- Rendering ---

function draw() {
  if (!ctx) return;
  
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);
  
  ctx.fillStyle = COLORS.gridBg;
  ctx.fillRect(offsetX, offsetY, COLS * tileW, ROWS * tileW);

  // Draw Line
  if (selection.length > 1) {
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tileW * 0.15; // Responsive line width
    
    let lineCol = COLORS.lineDefault;
    if (currentSum === 10) lineCol = COLORS.lineSuccess;
    else if (currentSum > 10) lineCol = COLORS.lineFail;
    
    ctx.strokeStyle = lineCol;
    
    const start = grid[selection[0].c][selection[0].r];
    // Safe check in case block was removed (rare async bug)
    if (start) {
        ctx.moveTo(offsetX + selection[0].c * tileW + tileW/2, offsetY + start.visualY + tileW/2);
        
        for(let i=1; i<selection.length; i++) {
           const curr = grid[selection[i].c][selection[i].r];
           if(curr) ctx.lineTo(offsetX + selection[i].c * tileW + tileW/2, offsetY + curr.visualY + tileW/2);
        }
        ctx.stroke();
    }
  }

  // Draw Blocks
  for(let c=0; c<COLS; c++) {
    for(let r=0; r<ROWS; r++) {
      const b = grid[c][r];
      if (b) {
        const x = offsetX + c * tileW;
        const y = offsetY + b.visualY;
        const s = tileW;
        
        const isSelected = selection.some(sel => sel.c === c && sel.r === r);
        
        ctx.save();
        ctx.translate(x + s/2, y + s/2);
        ctx.scale(b.scale, b.scale);
        
        // Block Body
        ctx.fillStyle = b.color;
        if (isSelected) ctx.filter = 'brightness(1.2)';
        
        ctx.beginPath();
        // Responsive corner radius
        ctx.roundRect(-s/2 + 4, -s/2 + 4, s - 8, s - 8, s * 0.2);
        ctx.fill();
        
        // Number
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = `bold ${s * 0.5}px "Fredoka"`; // Responsive font
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.val, 0, 2);
        
        ctx.restore();
      }
    }
  }
  
  // Bubble showing current Sum
  if (selection.length > 0 && dragActive) {
    const last = selection[selection.length-1];
    const b = grid[last.c][last.r];
    if(b) {
        const bx = offsetX + last.c * tileW + tileW/2;
        const by = offsetY + b.visualY;
        
        ctx.fillStyle = currentSum === 10 ? '#00ff88' : (currentSum > 10 ? '#ff3366' : '#fff');
        ctx.beginPath();
        ctx.arc(bx, by - tileW * 0.8, tileW * 0.4, 0, Math.PI*2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.font = `bold ${tileW * 0.4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentSum, bx, by - tileW * 0.8);
    }
  }

  // Particles
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  
  // Texts
  floatingTexts.forEach(t => {
    ctx.font = 'bold 24px sans-serif';
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  });
}

// --- FX ---

function createExplosion(c, r) {
  const x = offsetX + c * tileW + tileW/2;
  const y = offsetY + r * tileW + tileW/2;
  for(let i=0; i<12; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      life: 1,
      color: '#fff',
      size: Math.random() * 6 + 2
    });
  }
}

function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x, y, text, color, life: 1.5 });
}

function resize() {
  if (!containerRef.value) return;
  width = containerRef.value.clientWidth;
  height = containerRef.value.clientHeight;
  canvasRef.value.width = width;
  canvasRef.value.height = height;
  
  const wSize = width / (COLS + 1);
  const hSize = height / (ROWS + 3); // More top padding
  tileW = Math.min(wSize, hSize, 70);
  
  offsetX = (width - COLS * tileW) / 2;
  offsetY = (height - ROWS * tileW) / 2 + 20;
  
  if (gameState.value === 'playing') draw();
}

onMounted(() => {
  ctx = canvasRef.value.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  
  const c = canvasRef.value;
  c.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);
  
  c.addEventListener('touchstart', handleStart, { passive: false });
  window.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', handleEnd);
});

onUnmounted(() => {
  window.removeEventListener('resize', resize);
  window.removeEventListener('mousemove', handleMove);
  window.removeEventListener('mouseup', handleEnd);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&display=swap');

.game-container {
  width: 100%; height: 100%;
  background: #1a1a2e;
  position: relative;
  font-family: 'Fredoka', sans-serif;
  user-select: none;
  overflow: hidden;
  touch-action: none;
}

canvas { display: block; width: 100%; height: 100%; }

.ui-layer {
  position: absolute; inset: 0; pointer-events: none;
}

.header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px; width: 100%; max-width: 500px; margin: 0 auto;
}

.score-box {
  text-align: center; color: #fff; min-width: 60px;
}
.label { display: block; font-size: 10px; color: #888; letter-spacing: 1px; }
.value { font-size: 22px; font-weight: bold; }

.target-box {
  background: #fff; color: #1a1a2e;
  border-radius: 50%; width: 64px; height: 64px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  box-shadow: 0 0 15px rgba(255,255,255,0.15);
}
.target-num { font-size: 28px; font-weight: bold; line-height: 1; }

/* Modal */
.modal-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.9);
  display: flex; align-items: center; justify-content: center;
  pointer-events: auto; z-index: 10;
}

.modal {
  background: #fff; color: #333; padding: 30px;
  border-radius: 20px; text-align: center; width: 85%; max-width: 320px;
}

.title { margin: 0 0 10px; font-size: 32px; color: #5f27cd; }
.desc { color: #666; margin-bottom: 20px; font-size: 14px; }

.tutorial-viz {
  background: #f0f0f0; padding: 10px; border-radius: 8px;
  margin-bottom: 20px; font-size: 18px; font-weight: bold;
  display: flex; align-items: center; justify-content: center; gap: 4px;
}

.b {
  display: inline-block; width: 24px; height: 24px; line-height: 24px;
  color: white; border-radius: 4px; font-size: 14px;
}
.b-3 { background: #48dbfb; }
.b-5 { background: #54a0ff; }
.b-2 { background: #feca57; }

.text-green { color: #1dd1a1; }
.text-yellow { color: #ff9f43; }

.btn-primary {
  background: #5f27cd; color: #fff; border: none;
  padding: 12px 30px; font-size: 18px; font-weight: bold;
  border-radius: 50px; cursor: pointer; width: 100%;
}
.btn-primary:active { transform: scale(0.96); }

.box-pop { animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes pop {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>