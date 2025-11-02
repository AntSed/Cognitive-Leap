// app/components/games/MathRadar4.vue
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
      <h1 class="text-7xl font-bold tracking-widest uppercase">{{ t('mathRadar.title') }}</h1>
      <p class="text-2xl text-gray-400 my-4">{{ t('mathRadar.description') }}</p>
      <button @click="startGame" class="mt-8 py-4 px-12 themed-button rounded-lg text-3xl transition-transform transform hover:scale-105">
        {{ t('mathRadar.play') }}
      </button>
    </div>

    <div v-if="gameStatus === 'playing'" class="flex flex-col md:flex-row w-full h-full p-4 md:p-8 gap-6 z-10">

        <div class="w-full md:w-64 order-3 md:order-1 flex-shrink-0 space-y-3">
        
        <div class="game-panel p-3">
          <div class="flex flex-wrap justify-around items-center gap-x-4 gap-y-2 md:flex-col md:gap-y-4">
            
            <div class="text-center">
              <h2 class="panel-title-sm">{{ t('mathRadar.score') }}</h2>
              <p class="panel-value-lg leading-tight">{{ score }}</p>
            </div>
            
            <div class="text-center">
              <h2 class="panel-title-sm">{{ t('mathRadar.lives') }}</h2>
              <div class="flex justify-center items-center gap-1.5 mt-1">
                <svg v-for="n in lives" :key="n" class="w-7 h-7 text-red-500 drop-shadow-[0_0_5px_rgba(255,0,0,0.7)]" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path></svg>
              </div>
            </div>
            
            <div class="text-center">
              <h2 class="panel-title-sm">{{ t('mathRadar.level') }}</h2>
              <p class="panel-value-md leading-tight">{{ level }}</p>
            </div>
            
            <div class="text-center">
              <h2 class="panel-title-sm">{{ t('mathRadar.highscore') }}</h2>
              <p class="panel-value-md leading-tight">{{ highscore }}</p>
            </div>

            <button @click="toggleMusicMute" :title="t(isMusicMuted ? 'mathRadar.unmuteMusic' : 'mathRadar.muteMusic')" class="themed-icon-button">
              <svg v-if="!isMusicMuted" class="w-6 h-6" viewBox="0 -960 960 960" fill="currentColor">
                <path d="M400-120q-66 0-113-47t-47-113q0-66 47-113t113-47q23 0 42.5 5.5T480-418v-422h240v160H560v400q0 66-47 113t-113 47Z"/>
              </svg>
              <svg v-else class="w-6 h-6" viewBox="0 -960 960 960" fill="currentColor">
                <path d="M792-56 56-792l56-56 736 736-56 56ZM560-514l-80-80v-246h240v160H560v166ZM400-120q-66 0-113-47t-47-113q0-66 47-113t113-47q23 0 42.5 5.5T480-418v-62l80 80v120q0 66-47 113t-113 47Z"/>
              </svg>
            </button>
            
            <button @click="toggleSfxMute" :title="t(isSfxMuted ? 'mathRadar.unmuteSfx' : 'mathRadar.muteSfx')" class="themed-icon-button">
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
            <p class="text-xl text-yellow-400 mb-2">{{ t('mathRadar.targetLocked') }}</p>
            <p class="text-4xl font-bold tracking-widest mb-3">{{ activeBlip.equation.text }} = ?</p>
            <input type="number" 
                v-model="playerAnswer" 
                @keyup.enter="submitAnswer"
                ref="answerInput"
                :placeholder="t('mathRadar.answerPlaceholder')"
                class="w-full p-2 rounded-md themed-input">
          </div>
          <div v-else class="engagement-placeholder">
            <p class="text-xl text-gray-500">{{ t('mathRadar.targetPlaceholder') }}</p>
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
              <div class="warning-text">{{ t('mathRadar.warning') }}</div>
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
        
      </div>
    </div>

    <div v-if="gameStatus === 'over'" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div class="w-full max-w-lg p-8 rounded-lg text-center">
        <h2 class="text-5xl font-bold text-red-500 mb-4">{{ t('mathRadar.gameOver') }}</h2>
        <p v-if="gameOverReason" class="text-xl text-yellow-300 mb-4">{{ gameOverReason }}</p>
        <p class="text-2xl mb-2">{{ t('mathRadar.finalScore') }}</p>
        <p class="text-7xl font-bold mb-6">{{ score }}</p>
        <p v-if="score >= highscore && highscore > 0" class="text-2xl text-yellow-400 mb-6">{{ t('mathRadar.newHighscore') }}</p>
        <button @click="startGame" class="w-1/2 py-3 px-4 themed-button rounded-lg text-2xl">
            {{ t('mathRadar.playAgain') }}
        </button>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
// 1. ИМПОРТИРУЕМ useI18n
import { useI18n } from 'vue-i18n';

// 2. ИНИЦИАЛИЗИРУЕМ
const { t } = useI18n();

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
const highscore = ref(0);
const level = ref(5); // Fixed at 5
const lives = ref(3);
const blips = ref([]);
const activeBlip = ref(null);
const playerAnswer = ref('');
const gameStatus = ref('menu');
const gameOverReason = ref('');
const lastEquationText = ref('');
const showWarning = ref(false);
const missiles = ref([]);
const playerMissiles = ref([]);

// --- Internal Refs ---
let missileInterval = null;
let gameLoopId = null;
let gameStartTime = 0;
const answerInput = ref(null);

// --- Lifecycle ---
onMounted(() => {
  highscore.value = parseInt(localStorage.getItem('mathRadarHighscore_v1') || 0);
});

onUnmounted(() => {
  clearInterval(missileInterval);
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  stopMusic(); 
  gameStatus.value = 'menu'; // Reset status to stop recursive loops
});

// --- Game Core Functions ---

async function startGame() {
  score.value = 0;
  level.value = 5; // Always 5
  lives.value = 1;
  blips.value = [];
  playerMissiles.value = [];
  activeBlip.value = null;
  gameOverReason.value = '';
  hasCompleted.value = false;
  gameStatus.value = 'playing';

  playSfx('start');
  playMusic();

  if(missileInterval) clearInterval(missileInterval);
  missileInterval = setInterval(launchMissile, 4500);
  
  gameStartTime = Date.now();
  if(gameLoopId) cancelAnimationFrame(gameLoopId);
  gameLoop();
  
  generateBlip();
  scheduleNextBlip();
};

function gameLoop() {
  if (gameStatus.value !== 'playing') {
    if(gameLoopId) cancelAnimationFrame(gameLoopId);
    return;
  }
  
  const elapsedTime = (Date.now() - gameStartTime);
  const currentAngleCSS = (elapsedTime / 3000) * 360 % 360; 
  const detectionWidth = 15;

  [...blips.value].forEach(blip => {
    if (blip.isDetected && !blip.isDestroying) {
      const speed = (0.0005 + (level.value * 0.0001)) / 2;
      blip.x += (50 - blip.x) * speed;
      blip.y += (50 - blip.y) * speed;
      
      const distance = Math.sqrt(Math.pow(blip.x - 50, 2) + Math.pow(blip.y - 50, 2));
      if (distance < 5) {
        gameOver('mathRadar.reasonCore');
      }
    }
    if (blip.isDetected) return; 
    
    const blipAngleCSS = (blip.angle + 90 + 360) % 360;
    let angleDifference = currentAngleCSS - blipAngleCSS;
    if (angleDifference < -180) angleDifference += 360;
    if (angleDifference > 180) angleDifference -= 360;
    
    if (angleDifference >= 0 && angleDifference < detectionWidth) {
      blip.isDetected = true;
    }
  });
  
  gameLoopId = requestAnimationFrame(gameLoop);
};


function scheduleNextBlip() {
  if (gameStatus.value !== 'playing') return;

  const baseInterval = 6000;
  let delay = baseInterval;

  const blipCount = blips.value.length;

  if (blipCount >= 7) {
    delay = baseInterval * 1.5; 
  } else if (blipCount >= 4) {
    delay = baseInterval; 
  } else if (blipCount >= 1) {
    delay = baseInterval * 0.65; 
  } else {
    delay = baseInterval * 0.35; 
  }

  setTimeout(() => {
    if (gameStatus.value !== 'playing') return;
    generateBlip();
    scheduleNextBlip(); 
  }, delay);
}

function generateBlip() {
  if (gameStatus.value !== 'playing' || blips.value.length >= 10) return;

  const angleRad = Math.random() * 2 * Math.PI;
  const radius = Math.random() * 30;
  const angleDeg = (angleRad * (180 / Math.PI) + 360) % 360;

  const blip = {
    id: Date.now(),
    x: 50 + (radius + 15) * Math.cos(angleRad),
    y: 50 + (radius + 15) * Math.sin(angleRad),
    angle: angleDeg,
    rotation: angleDeg + 180,
    isDetected: false,
    isDestroying: false,
    equation: generateEquation()
  };
  blips.value.push(blip);

  showWarning.value = true;
  setTimeout(() => showWarning.value = false, 2000);
};


function generateEquation() {
  const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  let a, b, answer, text;
  let isValid = false;

  do {
    isValid = true; 

    const opRoll = Math.random();

    if (opRoll < 0.25) {
      
      a = getRandomInt(21, 129); 
      b = getRandomInt(21, 149 - a);
      answer = a + b; 


      if (answer < 50 || a % 10 === 0 || b % 10 === 0 || answer % 10 === 0) {
        isValid = false;
        continue;
      }
      text = `${a} + ${b}`;

    } else if (opRoll < 0.5) {

      
      a = getRandomInt(50, 150); 
      
      const bMin = 11;
      const bMax = a - 11; 
      
      if (bMax < bMin) {
        isValid = false;
        continue;
      }
      
      b = getRandomInt(bMin, bMax);
      answer = a - b;

      if (a % 10 === 0 || b % 10 === 0 || answer % 10 === 0) {
        isValid = false;
        continue;
      }
      text = `${a} - ${b}`;

    } else if (opRoll < 0.75) {
      
      a = getRandomInt(3, 9);
      b = getRandomInt(3, 9);
      answer = a * b;

      // Исключаем 5x5, 6x6
      if (a === b && (a === 5 || a === 6)) {
        isValid = false;
        continue;
      }
      text = `${a} × ${b}`;

    } else {
      
      b = getRandomInt(3, 9); 
      answer = getRandomInt(3, 9); 
      a = b * answer; 

      if (b === answer && (b === 5 || b === 6)) {
        isValid = false;
        continue;
      }
      text = `${a} ÷ ${b}`;
    }

    if (text === lastEquationText.value) {
      isValid = false;
    }

  } while (!isValid);

  lastEquationText.value = text;
  
  return { text, answer };
};

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
  
  nextTick(() => {
    answerInput.value?.focus();
  });
};

function submitAnswer() {
  if (playerAnswer.value === '' || !activeBlip.value) return;
  
  const isCorrect = parseInt(playerAnswer.value) === activeBlip.value.equation.answer;
  
  if (isCorrect) {
    score.value += 10 * level.value; 
    
    if (!hasCompleted.value && score.value >= 500) {
      hasCompleted.value = true;
      emit('completed'); 
    }
    
    playSfx('fire');
    launchPlayerMissile(activeBlip.value);
    activeBlip.value = null;
    playerAnswer.value = '';

  } else {
    lives.value--;
    playerAnswer.value = '';
    playSfx('error');
    
    if(answerInput.value) {
      answerInput.value.classList.add('error');
      setTimeout(() => answerInput.value?.classList.remove('error'), 500);
    }

    if (lives.value <= 0) {
      gameOver('mathRadar.reasonLives');
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

  nextTick(() => {
    setTimeout(() => {
      const launchedMissile = playerMissiles.value.find(m => m.id === missile.id);
      if (launchedMissile) {
        launchedMissile.x = target.x;
        launchedMissile.y = target.y;
      }
    }, 20); 
  });

  setTimeout(() => {
    missileHit(missile);
  }, 500);
};

function missileHit(missile) {
  const targetBlip = blips.value.find(b => b.id === missile.targetId);
  if (targetBlip) {
    targetBlip.isDestroying = true;
    playSfx('hit');
    
    setTimeout(() => {
      blips.value = blips.value.filter(b => b.id !== missile.targetId);
    }, 500);
  }
  playerMissiles.value = playerMissiles.value.filter(m => m.id !== missile.id);
};


function gameOver(reasonKey = 'mathRadar.reasonCore') {
  if (gameStatus.value === 'over') return; 
  
  gameStatus.value = 'over';
  gameOverReason.value = t(reasonKey); 
  
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  clearInterval(missileInterval);
  
  playSfx('gameOver');
  stopMusic();
  
  if (score.value > highscore.value) {
    highscore.value = score.value;
    localStorage.setItem('mathRadarHighscore_v1', score.value.toString());
  }
};
</script>

<style scoped>
.math-radar-game {
  font-family: 'Orbitron', sans-serif;
  background-color: #000000;
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
  flex-shrink: 0;
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
  animation: blip-explode 0.5s ease-out forwards;
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
.engagement-active, .engagement-placeholder {
  min-height: 130px; 
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
    transform: scale(1.5);
    opacity: 1;
  }
  100% {
    transform: scale(6);
    opacity: 0;
  }
}
</style>
