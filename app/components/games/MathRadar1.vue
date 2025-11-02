<template>
  <div class="math-radar-game">
    
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
      <div v-for="missile in missiles" :key="missile.id"
           class="missile"
           :style="{ top: missile.top + '%', animationDuration: missile.duration + 's' }">
        {{ missile.number }}
      </div>
    </div>

    <div v-if="gameStatus === 'menu'" class="flex flex-col items-center justify-center text-center h-full z-10">
      <h1 class="text-7xl font-bold tracking-widest uppercase">Math Radar</h1>
      <p class="text-2xl text-gray-400 my-4">Defend the core by solving enemy equations!</p>
      <button @click="startGame" class="mt-8 py-4 px-12 themed-button rounded-lg text-3xl transition-transform transform hover:scale-105">
        PLAY GAME
      </button>
    </div>

    <div v-if="gameStatus === 'playing'" class="flex flex-col md:flex-row w-full h-full p-4 md:p-8 gap-6 z-10">

        <div class="w-full md:w-64 order-3 md:order-1 flex-shrink-0 space-y-3">
        
       <div class="game-panel p-3">
            <div class="flex flex-wrap justify-around items-center gap-x-4 gap-y-2 md:flex-col md:gap-y-8">
            
            <div class="text-center">
              <h2 class="panel-title-sm">SCORE</h2>
              <p class="panel-value-lg leading-tight">{{ score }}</p>
            </div>
            
            <div class="text-center">
              <h2 class="panel-title-sm">LIVES</h2>
              <div class="flex justify-center items-center gap-1.5 mt-1">
                <svg v-for="n in lives" :key="n" class="w-7 h-7 text-red-500 drop-shadow-[0_0_5px_rgba(255,0,0,0.7)]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path></svg>
              </div>
            </div>
            
            <div class="text-center">
              <h2 class="panel-title-sm">LEVEL</h2>
              <p class="panel-value-md leading-tight">{{ level }}</p>
            </div>
            
            <div class="text-center">
              <h2 class="panel-title-sm">HIGHSCORE</h2>
              <p class="panel-value-md leading-tight">{{ highscore }}</p>
            </div>

            <button @click="toggleMusicMute" :title="isMusicMuted ? 'Unmute Music' : 'Mute Music'" class="themed-icon-button">
              <svg v-if="!isMusicMuted" class="w-6 h-6" viewBox="0 -960 960 960" fill="currentColor">
                <path d="M400-120q-66 0-113-47t-47-113q0-66 47-113t113-47q23 0 42.5 5.5T480-418v-422h240v160H560v400q0 66-47 113t-113 47Z"/>
              </svg>
              <svg v-else class="w-6 h-6" viewBox="0 -960 960 960" fill="currentColor">
                <path d="M792-56 56-792l56-56 736 736-56 56ZM560-514l-80-80v-246h240v160H560v166ZM400-120q-66 0-113-47t-47-113q0-66 47-113t113-47q23 0 42.5 5.5T480-418v-62l80 80v120q0 66-47 113t-113 47Z"/>
              </svg>
            </button>
            
            <button @click="toggleSfxMute" :title="isSfxMuted ? 'Unmute SFX' : 'Mute SFX'" class="themed-icon-button">
              <svg v-if="!isSfxMuted" class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm7-.17v6.34L7.83 13H5v-2h2.83L10 8.83zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77 0-4.28-2.99-7.86-7-8.77z"/>
              </svg>
              <svg v-else class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.34 2.93L2.93 4.34 7.29 8.7 7 9H3v6h4l5 5v-6.59l4.18 4.18c-.65.49-1.38.88-2.18 1.11v2.06c1.34-.3 2.57-.92 3.61-1.75l2.05 2.05 1.41-1.41L4.34 2.93zM10 15.17L7.83 13H5v-2h2.83l.88-.88L10 11.41v3.76zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zm-7-8l-1.88 1.88L12 7.76zm4.5 8c0-1.77-1.02-3.29-2.5-4.03v1.79l2.48 2.48c.01-.08.02-.16.02-.24z"/>
              </svg>
            </button>
            
          </div>
        </div>
        </div>

      <div class="flex flex-col flex-1 order-1 md:order-2 gap-4">

        <div class="game-panel w-full max-w-sm mx-auto p-4 text-center order-1">
          <div v-if="activeBlip" class="engagement-active">
            <p class="text-xl text-yellow-400 mb-2">TARGET LOCKED</p>
            <p class="text-4xl font-bold tracking-widest mb-3">{{ activeBlip.equation.text }} = ?</p>
            <input type="number" 
                v-model="playerAnswer" 
                @keyup.enter="submitAnswer"
                ref="answerInput"
                placeholder="ANSWER"
                class="w-full p-2 rounded-md themed-input">
          </div>
          <div v-else class="engagement-placeholder">
            <p class="text-xl text-gray-500">LOCK ON A TARGET</p>
          </div>
        </div>
        
        <div class="flex-1 flex items-center justify-center order-2">
          <div class="radar-container">
            <div class="radar-sweep"></div>
            
            <svg class="radar-core-boat" viewBox="0 0 80 30">
              <path d="M40 2 L 78 15 L 40 28 L 2 15 Z" fill="rgba(200, 200, 200, 0.4)"/>
              <rect x="20" y="7" width="38" height="16" fill="rgba(0, 150, 255, 0.7)" rx="2"/>
              <rect x="58" y="10" width="15" height="10" fill="rgba(255, 255, 255, 0.8)" rx="2"/>
              <rect x="5" y="11" width="15" height="8" fill="rgba(139, 69, 19, 0.6)"/>
            </svg>

            <div v-if="showWarning" class="absolute inset-0 flex items-center justify-center">
              <div class="warning-text">! ENEMY DETECTED !</div>
            </div>
            
            <div v-for="blip in blips"
                 :key="blip.id"
                 class="blip"
                 :class="{ 
                    'blip-detected': blip.isDetected, 
                    'blip-active': activeBlip && activeBlip.id === blip.id,
                    'destroying': blip.isDestroying
                 }"
                 :style="{ left: blip.x + '%', top: blip.y + '%', transform: 'translate(-50%, -50%) rotate(' + blip.rotation + 'deg)' }"
                 @click="selectBlip(blip)">
                 <svg viewBox="0 0 40 30">
                    <path d="M20 2 L 38 15 L 20 28 L 2 15 Z" />
                 </svg>
            </div>
            
            <div v-for="pMissile in playerMissiles" :key="pMissile.id"
                class="player-missile"
                :style="{ 
                    left: pMissile.x + '%', 
                    top: pMissile.y + '%', 
                    transform: 'rotate(' + pMissile.angle + 'deg)'
                }">
            </div>
          </div>
        </div>
        
      </div> </div> <div v-if="gameStatus === 'over'" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div class="w-full max-w-lg p-8 rounded-lg text-center">
        <h2 class="text-5xl font-bold text-red-500 mb-4">GAME OVER</h2>
        <p v-if="gameOverReason" class="text-xl text-yellow-300 mb-4">{{ gameOverReason }}</p>
        <p class="text-2xl mb-2">Your final score is:</p>
        <p class="text-7xl font-bold mb-6">{{ score }}</p>
        <p v-if="score >= highscore && highscore > 0" class="text-2xl text-yellow-400 mb-6">New Highscore!</p>
        <button @click="startGame" class="w-1/2 py-3 px-4 themed-button rounded-lg text-2xl">
            Play Again
        </button>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue';

// --- Emits ---
const emit = defineEmits(['completed']);
const hasCompleted = ref(false);

// --- Audio ---
const { 
  isMusicMuted, 
  isSfxMuted, 
  toggleMusicMute, 
  toggleSfxMute, 
  playSfx, 
  playMusic, 
  stopMusic 
} = useAudio();

// --- Game State Refs ---
const score = ref(0);
const highscore = ref(0); // Will be loaded from localStorage
const level = ref(1);
const lives = ref(3);
const blips = ref([]);
const activeBlip = ref(null);
const playerAnswer = ref('');
const gameStatus = ref('menu'); // menu, playing, over
const gameOverReason = ref('');
const showWarning = ref(false);
const missiles = ref([]);
const playerMissiles = ref([]);

// --- Internal Refs ---
let missileInterval = null;
let gameLoopId = null;
let gameStartTime = 0;
const answerInput = ref(null);
const lastEquationText = ref('');

// --- Lifecycle ---
onMounted(() => {
  // Load highscore from local storage
  highscore.value = parseInt(localStorage.getItem('mathRadarHighscore_v1') || 0);
});

onUnmounted(() => {
  // Clean up all intervals and listeners
  clearInterval(missileInterval);
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  stopMusic(); // Stop music when component is unmounted
});



// --- Game Core Functions ---

async function startGame() {
  
  // --- 2. Reset Game State ---
  score.value = 0;
  level.value = 1;
  lives.value = 3;
  blips.value = [];
  playerMissiles.value = [];
  activeBlip.value = null;
  gameOverReason.value = '';
  hasCompleted.value = false;
  gameStatus.value = 'playing';

  // --- 3. Start Audio ---
  playSfx('start');
  playMusic();

  // --- 4. Start Game Loops ---

  
  if(missileInterval) clearInterval(missileInterval);
  missileInterval = setInterval(launchMissile, 4500);
  
  gameStartTime = Date.now();
  if(gameLoopId) cancelAnimationFrame(gameLoopId);
  gameLoop();
  
  // Generate first blip immediately
  generateBlip();
  scheduleNextBlip();
};

function gameLoop() {
  if (gameStatus.value !== 'playing') {
    if(gameLoopId) cancelAnimationFrame(gameLoopId);
    return;
  }
  
  const elapsedTime = (Date.now() - gameStartTime);
  // This is the angle of the radar sweep (0-360)
  const currentAngleCSS = (elapsedTime / 3000) * 360 % 360; 
  const detectionWidth = 15; // Width of the sweep line in degrees

  [...blips.value].forEach(blip => {
    // --- 1. Move Detected Blips ---
    if (blip.isDetected && !blip.isDestroying) {
      // Blips move towards the center (50, 50)
      const speed = (0.0005 + (level.value * 0.0001)) / 2;
      blip.x += (50 - blip.x) * speed;
      blip.y += (50 - blip.y) * speed;
      
      const distance = Math.sqrt(Math.pow(blip.x - 50, 2) + Math.pow(blip.y - 50, 2));
      if (distance < 5) { // Reached the core
        gameOver('An enemy reached the radar core!');
      }
    }

    // --- 2. Detect New Blips ---
    if (blip.isDetected) return; // Already detected, skip
    
    // Calculate the blip's angle relative to the sweep
    const blipAngleCSS = (blip.angle + 90 + 360) % 360;
    let angleDifference = currentAngleCSS - blipAngleCSS;
    if (angleDifference < -180) angleDifference += 360;
    if (angleDifference > 180) angleDifference -= 360;
    
    // Check if the sweep line is passing over the blip
    if (angleDifference >= 0 && angleDifference < detectionWidth) {
      blip.isDetected = true;
    }
  });
  
  gameLoopId = requestAnimationFrame(gameLoop);
};
function scheduleNextBlip() {
  if (gameStatus.value !== 'playing') return;

  const baseInterval = 7000; // 7 секунд (норма)
  let delay = baseInterval;

  const blipCount = blips.value.length;

  if (blipCount >= 7) {
    // СЛОЖНО: Замедляемся
    delay = baseInterval * 1.5; // 10.5 секунд
  } else if (blipCount >= 4) {
    // НОРМА:
    delay = baseInterval; // 7 секунд
  } else if (blipCount >= 1) {
    // ЛЕГКО: Немного ускоряемся
    delay = baseInterval * 0.65; // 4.5 секунды
  } else {
    // ЭКРАН ПУСТ: Агрессивное ускорение
    delay = baseInterval * 0.35; // 2.5 секунды
  }

  // Запланировать следующий вызов
  setTimeout(() => {
    generateBlip();
    scheduleNextBlip(); // Рекурсивный вызов
  }, delay);
}
function generateBlip() {
  if (gameStatus.value !== 'playing' || blips.value.length >= 10) return;

  const angleRad = Math.random() * 2 * Math.PI;
  const radius = Math.random() * 30; // 0-30% from edge
  const angleDeg = (angleRad * (180 / Math.PI) + 360) % 360;

  const blip = {
    id: Date.now(),
    x: 50 + (radius + 15) * Math.cos(angleRad), // Start 15-45% from center
    y: 50 + (radius + 15) * Math.sin(angleRad),
    angle: angleDeg,
    rotation: angleDeg + 180, // Point towards center
    isDetected: false,
    isDestroying: false,
    equation: generateEquation() // Get v1 equation
  };
  blips.value.push(blip);

  // Flash warning text
  showWarning.value = true;
  setTimeout(() => showWarning.value = false, 2000);
};

/**
 * --- MATH RADAR v1 ---
 * Generates simple addition/subtraction problems with answers <= 20.
 */
function generateEquation() {
  let a, b, answer, text, operator;
  let isValid = false;

  do {
    operator = Math.random() < 0.5 ? '+' : '-';

    if (operator === '+') {
      // ... (логика сложения)
      a = Math.floor(Math.random() * 8) + 3; 
      const bRange = (20 - a) - 3 + 1;
      b = Math.floor(Math.random() * bRange) + 3;
      answer = a + b;
    } else {
      // ... (логика вычитания)
      a = Math.floor(Math.random() * 16) + 5;
      const bRange = (a - 1) - 3 + 1;
      b = Math.floor(Math.random() * bRange) + 3;
      answer = a - b;
    }
    
    // Генерируем текст ЗДЕСЬ, для проверки
    text = (operator === '+') ? `${a} + ${b}` : `${a} - ${b}`;

    // --- ПРАВИЛА ВАЛИДАЦИИ ---
    if (answer === 1 || answer === 2) {
      isValid = false;
    } else if (a === 10 || b === 10) {
      isValid = false;
    } else if (operator === '-' && (a % 10 === b % 10)) {
      isValid = false;
    } else if (text === lastEquationText.value) { // ✅ НОВАЯ ПРОВЕРКА
      isValid = false;
    } else {
      isValid = true;
    }

  } while (!isValid); 

  lastEquationText.value = text; // Сохраняем удачный пример в "память"
  return { text, answer };
};

// This is the background missile animation, purely cosmetic
function launchMissile() {
  if (gameStatus.value !== 'playing') return;
  const duration = Math.random() * 3 + 4;
  const missile = {
    id: Date.now() + Math.random(),
    number: Math.floor(Math.random() * 10) + 1,
    top: Math.random() * 90 + 5,
    duration: duration
  };
  missiles.value.push(missile);
  setTimeout(() => missiles.value.shift(), duration * 1000);
};

function selectBlip(blip) {
  if (!blip.isDetected || blip.isDestroying) return;
  activeBlip.value = blip;
  playSfx('blip');
  
  // Focus the input field
  nextTick(() => {
    answerInput.value?.focus();
  });
};

function submitAnswer() {
  if (playerAnswer.value === '' || !activeBlip.value) return;
  
  const isCorrect = parseInt(playerAnswer.value) === activeBlip.value.equation.answer;
  
  if (isCorrect) {
    score.value += 10 * level.value;
    

    // --- EMIT 'completed' LOGIC ---
    if (!hasCompleted.value && score.value >= 1000) {
      hasCompleted.value = true;
      emit('completed');
      // We don't stop the game, just emit the event
    }
    
    playSfx('fire'); // Play sound on successful answer/fire
    launchPlayerMissile(activeBlip.value); // Fire the visual missile
    activeBlip.value = null;
    playerAnswer.value = '';

  } else {
    lives.value--;
    playerAnswer.value = '';
    playSfx('error');
    
    // Add shake animation for error
    if(answerInput.value) {
      answerInput.value.classList.add('error');
      setTimeout(() => answerInput.value?.classList.remove('error'), 500);
    }

    if (lives.value <= 0) {
      gameOver('You ran out of lives!');
    }
  }
};

function launchPlayerMissile(target) {
  const angleRad = Math.atan2(target.y - 50, target.x - 50);
  const angleDeg = angleRad * (180 / Math.PI) + 90;

  const missile = {
    id: Date.now(),
    x: 50,
    y: 50,
    targetId: target.id,
    angle: angleDeg
  };
  playerMissiles.value.push(missile);

  // This is the fix.
  // We wait for the DOM to update (nextTick),
  // THEN we wait for the browser to PAINT (setTimeout),
  // and only THEN we update the coordinates to trigger the transition.
  nextTick(() => {
    setTimeout(() => {
      const launchedMissile = playerMissiles.value.find(m => m.id === missile.id);
      if (launchedMissile) {
        launchedMissile.x = target.x;
        launchedMissile.y = target.y;
      }
    }, 20); // 20ms is enough to force a paint cycle
  });

  // This part remains the same
  setTimeout(() => {
    missileHit(missile);
  }, 500); // 500ms matches the CSS transition duration
};


function missileHit(missile) {
  const targetBlip = blips.value.find(b => b.id === missile.targetId);
  if (targetBlip) {
    targetBlip.isDestroying = true;
    playSfx('hit');
    
    // remove blip after explosion animation
    setTimeout(() => {
      blips.value = blips.value.filter(b => b.id !== missile.targetId);
    }, 500);
  }
  // remove missile
  playerMissiles.value = playerMissiles.value.filter(m => m.id !== missile.id);
};

function gameOver(reason = '') {
  if (gameStatus.value === 'over') return; // Prevent multiple calls
  
  gameStatus.value = 'over';
  gameOverReason.value = reason;
  
  // Stop all game loops
  clearInterval(missileInterval);
  if(gameLoopId) cancelAnimationFrame(gameLoopId);
  
  // Stop audio
  playSfx('gameOver');
  stopMusic();
  
  // Save highscore
  if (score.value > highscore.value) {
    highscore.value = score.value;
    localStorage.setItem('mathRadarHighscore_v1', score.value.toString());
  }

};

</script>

<style scoped>
/* --- Base Game Styles (from original) --- */
.math-radar-game {
  font-family: 'Orbitron', sans-serif;
  background-color: #0d1117;
  color: #00ff41;
  overflow: hidden;
  width: 100%;
  height: 100%;
  position: relative;
}

.radar-container {
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: 
    radial-gradient(ellipse at center, rgba(0, 255, 65, 0.2) 0%, rgba(0, 255, 65, 0) 70%),
    repeating-radial-gradient(
      rgba(0, 255, 65, 0.3) 0px, rgba(0, 255, 65, 0.3) 1px, 
      transparent 1px, transparent 100px
    ),
    repeating-conic-gradient(
      rgba(0, 255, 65, 0.3) 0deg 0.5deg,
      transparent 0.5deg 45deg
    );
  border: 3px solid #00ff41;
  box-shadow: 0 0 25px rgba(0, 255, 65, 0.5), inset 0 0 25px rgba(0, 255, 65, 0.5);
  position: relative;
  flex-shrink: 0; /* Prevent shrinking in flex container */
}

.radar-sweep {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 50%;
  background: linear-gradient(0deg, rgba(0, 255, 65, 0) 50%, rgba(0, 255, 65, 0.4) 100%);
  transform-origin: 50% 50%;
  animation: sweep 3s linear infinite;
}

@keyframes sweep {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.radar-core-boat {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 30px;
  fill: rgba(0, 255, 234, 0.4);
  stroke: #00e5ff;
  stroke-width: 1.5;
  filter: drop-shadow(0 0 8px #00e5ff);
  z-index: 2;
}

.blip {
  width: 20px;
  height: 15px;
  position: absolute;
  cursor: pointer;
  opacity: 0.2;
  z-index: 10;
}

.blip svg {
  width: 100%;
  height: 100%;
  fill: rgba(255, 71, 71, 0.6);
  stroke: #ff4747;
  stroke-width: 1.5;
  filter: drop-shadow(0 0 6px #ff4747);
  transform: scale(0.8);
}

.blip.destroying svg {
  /* This animation will run on the SVG element */
  animation: blip-explode 0.5s ease-out forwards;
  /* Force colors to yellow/white during explosion */
  fill: #ffc700;
  stroke: #ffffff;
}

.blip-detected {
  opacity: 1;
}

.blip-detected svg {
  animation: pulse-red-svg 1.5s infinite;
}

.blip-active svg, .blip-detected:hover svg {
  fill: rgba(255, 199, 0, 0.8);
  stroke: #ffc700;
  filter: drop-shadow(0 0 12px #ffc700);
  transform: scale(1.5);
  transition: all 0.2s ease-out;
}

@keyframes pulse-red-svg {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.warning-text {
  color: #ff4747;
  font-size: 1.25rem;
  font-weight: bold;
  text-shadow: 0 0 10px #ff4747;
  animation: flash-warning 1s infinite;
  text-transform: uppercase;
  pointer-events: none;
}

@keyframes flash-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.player-missile {
  position: absolute;
  width: 4px;
  height: 12px;
  background-color: #00e5ff;
  box-shadow: 0 0 10px #00e5ff;
  border-radius: 2px;
  transform-origin: center;
  transition: top 0.5s linear, left 0.5s linear;
  z-index: 5;
}

.missile {
  position: fixed;
  left: -10%;
  color: #ffc700;
  text-shadow: 0 0 8px #ffc700, 0 0 12px #ff8800;
  font-size: 1.5rem;
  font-weight: bold;
  animation: fly-by linear forwards;
  pointer-events: none;
  z-index: 20;
}

.missile::before {
  content: '►';
  margin-right: 10px;
}

@keyframes fly-by {
  to { left: 110%; }
}

.themed-input {
  background-color: #0d1117;
  border: 1px solid #00ff41;
  color: #00ff41;
  text-align: center;
  font-size: 1.5rem;
}
.themed-input::placeholder {
  color: rgba(0, 255, 65, 0.5);
}
.themed-input:focus {
  outline: none;
  box-shadow: 0 0 10px #00ff41;
}

.themed-input.error {
  border-color: #ff4747;
  animation: shake 0.5s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.themed-button {
  background-color: #0d1117;
  border: 1px solid #00ff41;
  color: #00ff41;
  transition: all 0.3s ease;
}
.themed-button:hover {
  background-color: #00ff41;
  color: #0d1117;
  box-shadow: 0 0 15px #00ff41;
}

/* --- New Mobile-First Styles --- */

.game-panel {
  background-color: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(0, 255, 65, 0.5);
  box-shadow: 0 0 10px rgba(0, 255, 65, 0.2);
  text-align: center;
}

.panel-title {
  font-size: 1.25rem;
  font-weight: bold;
  text-align: center;
}
.panel-value-large {
  font-size: 3rem;
  font-weight: bold;
  text-align: center;
  letter-spacing: 0.1em;
}
.panel-value-medium {
  font-size: 2.25rem;
  font-weight: bold;
  text-align: center;
}

.themed-icon-button {
  background-color: #0d1117;
  border: 1px solid #00ff41;
  color: #00ff41;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.3s ease;
}
.themed-icon-button:hover {
  background-color: #00ff41;
  color: #0d1117;
  box-shadow: 0 0 15px #00ff41;
}

/* These two classes ensure the Engagement block
  has a consistent height whether a target is 
  selected or not, preventing layout jump.
*/
.engagement-active, .engagement-placeholder {
  min-height: 130px; /* Adjust as needed */
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.panel-title-sm {
  font-size: 0.8rem; /* 12px */
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(0, 255, 65, 0.7);
}
.panel-value-md {
  font-size: 2rem; /* 32px */
  font-weight: bold;
  text-align: center;
}
@keyframes blip-explode {
  0% {
    transform: scale(1.5); /* Start at the 'active' size */
    opacity: 1;
  }
  100% {
    transform: scale(6); /* Explode outwards */
    opacity: 0;
  }
}
</style>