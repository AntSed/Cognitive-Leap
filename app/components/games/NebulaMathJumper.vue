<template>
  <div class="jumper-container" ref="gameContainerRef">
    <canvas ref="gameCanvasRef"></canvas>

    <!-- UI Overlay -->
    <div class="ui-overlay">
      <div class="header-stats">
        <div class="score-pill">
          <span class="label">{{ t('nebulaMathJumper.score') }}</span>
          <span class="value">{{ score }}</span>
        </div>
        <div class="height-pill">
          <span class="label">{{ t('nebulaMathJumper.height') }}</span>
          <span class="value">{{ Math.floor(maxHeight / 100) }}m</span>
        </div>
      </div>
      
      <!-- Current Problem Display -->
      <div class="problem-card" :class="{ 'shake-animation': isWrongAnswer }">
        <div class="problem-text">{{ currentProblem.text }} = ?</div>
      </div>
    </div>

    <!-- Start/Menu Overlay -->
    <div v-if="gameState !== 'playing'" class="menu-overlay">
      <div class="menu-content">
        <h1 class="game-title">{{ t('nebulaMathJumper.title') }}</h1>
        <p class="game-subtitle">{{ t('nebulaMathJumper.subtitle') }}</p>
        
        <div v-if="score > 0" class="stats-summary">
          <p>{{ t('nebulaMathJumper.finalScore') }}: {{ score }}</p>
        </div>

        <button @click="startGame" class="play-button">
          {{ gameState === 'initial' ? t('nebulaMathJumper.start') : t('nebulaMathJumper.restart') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18nService } from '~/composables/useI18nService';

const { t } = useI18nService();
const emit = defineEmits(['completed']);

// --- Refs ---
const gameContainerRef = ref(null);
const gameCanvasRef = ref(null);

// --- Game State ---
const gameState = ref('initial'); // initial, playing
const score = ref(0);
const maxHeight = ref(0);
const isWrongAnswer = ref(false);
const hasCompleted = ref(false);
const currentProblem = ref({ text: '2 + 2', answer: 4 });

// --- Engine Variables ---
let ctx = null;
let animationFrameId = null;
let lastTime = 0;

// Camera
let cameraY = 0;
let targetCameraY = 0;

// Physics & Objects
const player = { 
  x: 0, 
  y: 0, 
  radius: 20, 
  state: 'idle', // idle, jumping
  color: '#38bdf8' 
};

let platforms = [];
let particles = [];
let difficultyLevel = 1;

// Configuration
const COLORS = {
  bgTop: '#0f172a',
  bgBottom: '#1e293b',
  platform: '#475569',
  platformHover: '#64748b',
  correct: '#22c55e',
  wrong: '#ef4444',
  star: '#ffffff'
};

// --- Math Logic (Problem Generation) ---
function generateProblem(difficulty) {
  let type = 'add';
  let maxNum = 10;

  // Difficulty Scaling
  if (difficulty > 3) maxNum = 20;
  if (difficulty > 6) { type = Math.random() > 0.5 ? 'sub' : 'add'; }
  if (difficulty > 10) { maxNum = 50; }
  if (difficulty > 15) { 
    type = ['add', 'sub', 'mul'][Math.floor(Math.random() * 3)]; 
    maxNum = 12; 
  }

  let a, b, ans, text;

  switch (type) {
    case 'add':
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      ans = a + b;
      text = `${a} + ${b}`;
      break;
    case 'sub':
      a = Math.floor(Math.random() * maxNum) + 5;
      b = Math.floor(Math.random() * (a - 1)) + 1;
      ans = a - b;
      text = `${a} - ${b}`;
      break;
    case 'mul':
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      ans = a * b;
      text = `${a} × ${b}`;
      break;
    default:
      a = 1; b = 1; ans = 2; text = '1 + 1';
  }
  return { text, answer: ans };
}

function generateAnswers(correctAnswer) {
  const answers = new Set([correctAnswer]);
  // Generate distractions
  let safetyCounter = 0;
  while (answers.size < 3 && safetyCounter < 50) {
    safetyCounter++;
    const offset = Math.floor(Math.random() * 10) - 5; // -5 to +5
    const wrong = correctAnswer + offset;
    if (wrong !== correctAnswer && wrong >= 0) {
      answers.add(wrong);
    }
  }
  // If we failed to generate unique answers quickly, fill with dummy math
  if(answers.size < 3) {
     answers.add(correctAnswer + 1);
     answers.add(correctAnswer + 2);
  }
  
  return Array.from(answers).sort(() => Math.random() - 0.5);
}

// --- Game Logic ---

function initGame() {
  const canvas = gameCanvasRef.value;
  if (!canvas) return;
  resizeCanvas();

  score.value = 0;
  maxHeight.value = 0;
  hasCompleted.value = false;
  difficultyLevel = 1;
  cameraY = 0;
  targetCameraY = 0;
  
  // Reset Player Position
  player.x = canvas.width / 2;
  player.y = canvas.height - 150;
  player.state = 'idle';

  // Clear objects
  platforms = [];
  particles = [];

  // Create Base Platform
  createPlatform(canvas.width / 2, canvas.height - 50, null, true);

  // Create First Question
  spawnNextLevel();

  gameState.value = 'playing';
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function createPlatform(x, y, value, isBase = false) {
  platforms.push({
    x, 
    y,
    width: isBase ? 200 : 100,
    height: 40,
    value: value,
    isBase: isBase,
    scale: isBase ? 1 : 0, // Animation pop-in
    targetScale: 1,
    color: COLORS.platform,
    active: true
  });
}

function spawnNextLevel() {
  const canvas = gameCanvasRef.value;
  
  // Find the highest platform (lowest Y value)
  let highestY = canvas.height;
  if (platforms.length > 0) {
    highestY = Math.min(...platforms.map(p => p.y));
  }
  
  const nextY = highestY - 220; // Distance between rows

  // Generate Math
  const problem = generateProblem(difficultyLevel);
  currentProblem.value = problem;
  const options = generateAnswers(problem.answer);

  // Calculate spacing
  const sectionWidth = canvas.width / 3;
  
  options.forEach((opt, index) => {
    // Center in 1/3 sections
    const x = (sectionWidth * index) + (sectionWidth / 2);
    createPlatform(x, nextY, opt);
  });
}

// --- Input Handling ---

function handleInput(clientX, clientY) {
  if (gameState.value !== 'playing' || player.state !== 'idle') return;

  const canvas = gameCanvasRef.value;
  const rect = canvas.getBoundingClientRect();
  
  // Get mouse pos relative to canvas (0,0 at top-left of visible canvas)
  const screenX = (clientX - rect.left) * (canvas.width / rect.width);
  const screenY = (clientY - rect.top) * (canvas.height / rect.height);

  // Convert to World Coordinates
  // Since we use ctx.translate(0, cameraY), the world moves DOWN.
  // ScreenY = WorldY + CameraY  =>  WorldY = ScreenY - CameraY
  const worldY = screenY - cameraY;

  // Check collisions
  for (const p of platforms) {
    if (!p.active || p.isBase) continue;
    
    // Only allow jumping UP
    if (p.y > player.y) continue;

    // Simple AABB Collision
    const halfW = (p.width * p.scale) / 2 + 20; // +20 padding for easier touch
    const halfH = (p.height * p.scale) / 2 + 20;

    if (screenX > p.x - halfW && screenX < p.x + halfW &&
        worldY > p.y - halfH && worldY < p.y + halfH) {
      
      checkAnswer(p);
      break;
    }
  }
}

function checkAnswer(platform) {
  if (platform.value === currentProblem.value.answer) {
    // Correct
    platform.color = COLORS.correct;
    createParticles(platform.x, platform.y, COLORS.correct, 15);
    score.value += 10;
    difficultyLevel++;

    if (score.value >= 500 && !hasCompleted.value) {
      emit('completed');
      hasCompleted.value = true;
    }

    triggerJump(platform);
  } else {
    // Wrong
    isWrongAnswer.value = true;
    platform.color = COLORS.wrong;
    createParticles(platform.x, platform.y, COLORS.wrong, 5);
    
    // Platform disappears
    platform.targetScale = 0;
    setTimeout(() => {
       platform.active = false; // Disable interaction
       isWrongAnswer.value = false;
    }, 400);
  }
}

function triggerJump(targetPlatform) {
  player.state = 'jumping';

  const startX = player.x;
  const startY = player.y;
  const targetX = targetPlatform.x;
  const targetY = targetPlatform.y - 50; // Land on top

  const duration = 800;
  let startTime = null;

  function animate(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    
    // Ease Out Quad
    const ease = 1 - (1 - progress) * (1 - progress);

    // Linear X movement
    player.x = startX + (targetX - startX) * ease;
    
    // Parabolic Y movement (Jump arc)
    // Base movement + Arc
    const linearY = startY + (targetY - startY) * ease;
    const arcHeight = 150;
    const jumpArc = 4 * arcHeight * progress * (1 - progress);
    
    player.y = linearY - jumpArc;

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      // Landing
      player.y = targetY;
      player.state = 'idle';
      
      // Update Stats
      const heightInMeters = Math.abs(Math.floor((player.y - (gameCanvasRef.value.height - 150)) / 10));
      if (heightInMeters > maxHeight.value) maxHeight.value = heightInMeters;

      // Calculate new Camera Target
      // We want the player to be at roughly 70% of screen height
      const idealScreenY = gameCanvasRef.value.height * 0.7;
      // targetCameraY offset calculation
      targetCameraY = idealScreenY - player.y;

      // Cleanup old platforms (below screen)
      // WorldY > ScreenHeight - CameraY
      const cutOffY = (gameCanvasRef.value.height - targetCameraY) + 200;
      platforms = platforms.filter(p => p.y < cutOffY || p.y < player.y);

      // Spawn next row
      spawnNextLevel();
    }
  }
  
  requestAnimationFrame(animate);
}

function createParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      life: 1.0,
      color
    });
  }
}

// --- Render Loop ---

function update(dt) {
  // Smooth Camera
  cameraY += (targetCameraY - cameraY) * 0.1;

  // Animate Platforms
  platforms.forEach(p => {
    if (Math.abs(p.scale - p.targetScale) > 0.01) {
      p.scale += (p.targetScale - p.scale) * 0.1;
    }
  });

  // Update Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function draw() {
  if (!ctx) return;
  const canvas = gameCanvasRef.value;
  
  // 1. Draw Static Background (Gradient)
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, COLORS.bgTop);
  gradient.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw Stars (Parallax Effect)
  // We shift stars slightly based on cameraY to give depth
  ctx.fillStyle = COLORS.star;
  const starOffset = cameraY * 0.5; 
  for (let i = 0; i < 80; i++) {
    // Deterministic random based on index
    const x = (Math.sin(i * 132.1) * 43758.5453 % canvas.width + canvas.width) % canvas.width;
    const baseY = (Math.cos(i * 432.1) * 12345.231 % canvas.height + canvas.height) % canvas.height;
    
    // Loop stars vertically
    const y = (baseY + starOffset) % canvas.height;
    
    ctx.globalAlpha = (Math.sin(i) + 1) / 2 * 0.5 + 0.2; // Twinkle
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 2, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // --- World Transform Start ---
  ctx.save();
  ctx.translate(0, cameraY);

  // 3. Draw Platforms
  platforms.forEach(p => {
    if (p.scale <= 0.05) return;
    
    const w = p.width * p.scale;
    const h = p.height * p.scale;
    const x = p.x - w/2;
    const y = p.y - h/2;

    // Cloud/Platform Body
    ctx.fillStyle = p.color;
    roundRect(ctx, x, y, w, h, 15);
    ctx.fill();
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + h/2 + 5, w/2.2, 8, 0, 0, Math.PI*2);
    ctx.fill();

    // Text
    if (p.value !== null) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.value, p.x, p.y);
    }
  });

  // 4. Draw Player
  ctx.fillStyle = player.color;
  ctx.shadowColor = player.color;
  ctx.shadowBlur = 20;
  
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI*2);
  ctx.fill();
  
  ctx.shadowBlur = 0;

  // Player Face
  ctx.fillStyle = '#000';
  if (isWrongAnswer.value) {
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('x x', player.x, player.y);
  } else {
    // Eyes
    ctx.beginPath();
    ctx.arc(player.x - 6, player.y - 2, 3, 0, Math.PI*2);
    ctx.arc(player.x + 6, player.y - 2, 3, 0, Math.PI*2);
    ctx.fill();
    // Smile
    ctx.beginPath();
    ctx.arc(player.x, player.y + 2, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  // 5. Draw Particles
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;

  ctx.restore();
  // --- World Transform End ---
}

// Helper for rounded rectangles
function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  if (gameState.value === 'playing') {
    update(dt);
  }
  draw();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
  initGame();
}

function resizeCanvas() {
  const container = gameContainerRef.value;
  const canvas = gameCanvasRef.value;
  if (container && canvas) {
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    // Re-center player horizontally on resize if needed
    if (gameState.value === 'initial') {
        player.x = canvas.width / 2;
    }
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  const canvas = gameCanvasRef.value;
  ctx = canvas.getContext('2d');
  
  window.addEventListener('resize', resizeCanvas);
  
  const container = gameContainerRef.value;
  
  // Handle Inputs
  const onInteract = (e) => {
    // Prevent defaults for touches to stop scrolling
    if(e.type === 'touchstart') e.preventDefault(); 

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    handleInput(clientX, clientY);
  };

  container.addEventListener('mousedown', onInteract);
  container.addEventListener('touchstart', onInteract, { passive: false });

  // Initial Resize & Draw loop for menu background
  resizeCanvas();
  gameLoop(0);
});

onUnmounted(() => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', resizeCanvas);
});
</script>

<style scoped>
.jumper-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0f172a;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  user-select: none;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 20px;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.header-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.score-pill, .height-pill {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  padding: 8px 20px;
  border-radius: 99px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid rgba(255,255,255,0.15);
  min-width: 80px;
}

.label {
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 1px;
}

.value {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
}

.problem-card {
  background: rgba(30, 41, 59, 0.9);
  border: 2px solid #38bdf8;
  padding: 12px 40px;
  border-radius: 20px;
  box-shadow: 0 10px 25px -5px rgba(56, 189, 248, 0.4);
  transition: transform 0.2s, border-color 0.2s;
}

.problem-text {
  font-size: 40px;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(0,0,0,0.3);
}

.shake-animation {
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
  border-color: #ef4444;
  background: rgba(69, 10, 10, 0.9);
}

@keyframes shake {
  10%, 90% { transform: translate3d(-2px, 0, 0); }
  20%, 80% { transform: translate3d(4px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
  40%, 60% { transform: translate3d(6px, 0, 0); }
}

.menu-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.menu-content {
  text-align: center;
  color: white;
  padding: 40px;
  max-width: 400px;
}

.game-title {
  font-size: 48px;
  font-weight: 900;
  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
  letter-spacing: -1px;
}

.game-subtitle {
  color: #cbd5e1;
  font-size: 18px;
  margin-bottom: 40px;
}

.stats-summary {
  margin-bottom: 30px;
  font-size: 24px;
  font-weight: 700;
  color: #fbbf24;
}

.play-button {
  background: linear-gradient(to bottom right, #38bdf8, #2563eb);
  color: white;
  font-weight: 800;
  font-size: 20px;
  padding: 16px 48px;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4), 0 4px 6px -2px rgba(37, 99, 235, 0.2);
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.play-button:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 20px 25px -5px rgba(37, 99, 235, 0.5), 0 10px 10px -5px rgba(37, 99, 235, 0.3);
}

.play-button:active {
  transform: translateY(1px) scale(0.98);
}

/* Mobile Tweaks */
@media (max-width: 600px) {
  .game-title { font-size: 36px; }
  .problem-text { font-size: 32px; }
  .play-button { padding: 14px 32px; font-size: 18px; }
}
</style>