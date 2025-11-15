<template>
  <div class="how-many-game" @click="focusInput">
    <div class="game-world" ref="worldEl">
      <div
        class="ball"
        v-for="ball in balls"
        :key="ball.id"
        :style="ball.style"
      ></div>
    </div>

    <div class="game-ui">
      <div class="score-display" :style="{ color: scoreColor }">
        {{ score }}
      </div>
      <div
        class="input-area"
        ref="inputAreaEl"
        v-if="
          gameState === 'awaitingInput' ||
          gameState === 'feedback'
        "
      >
        <h2>{{ t('howMany.question') }}</h2>
        <input
          type="number"
          v-model.number="userGuess"
          @keydown.enter="checkAnswer"
          ref="inputEl"
          :disabled="gameState === 'feedback'"
        />
        <div class="timer-bar-container">
          <div class="timer-bar" :style="{ width: timerProgress + '%' }"></div>
        </div>
      </div>
      
      <!-- New Notification System -->
      <div class="notification-container">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="floating-text"
          :class="n.type"
        >
          {{ n.message }}
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const emit = defineEmits(['completed']);

// --- 1. Типы (для TypeScript) ---

type GameState =
  | 'intro'
  | 'flying'
  | 'grouping'
  | 'awaitingInput'
  | 'feedback'

interface Ball {
  id: number
  style: {
    transform: string
    transition: string
    background: string
  }
}

interface Notification {
  id: number
  message: string
  type: 'correct' | 'incorrect' | 'neutral' | 'milestone'
}

// --- 2. Реактивное состояние ---

const gameState = ref<GameState>('intro')
const balls = ref<Ball[]>([])
const targetCount = ref(0)
const userGuess = ref<number | null>(null)
const roundsPlayed = ref(0);
const score = ref(0);
const scoreColor = ref('white');
const attempts = ref(0);
const isTimeUp = ref(false);

const timerProgress = ref(0);
const roundTimer = ref<number | null>(null);

const notifications = ref<Notification[]>([]);
let notificationIdCounter = 0;


// Ссылки на DOM-элементы
const worldEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const inputAreaEl = ref<HTMLElement | null>(null)

// --- 3. Игровой цикл ---

onMounted(() => {
  setupRound();
});

const focusInput = () => {
  if (gameState.value === 'awaitingInput') {
    inputEl.value?.focus();
  }
}

/**
 * 1. Настраивает новый раунд
 */
const setupRound = () => {
  stopRoundTimer();
  gameState.value = 'flying'
  userGuess.value = null
  roundsPlayed.value++;
  attempts.value = 0;
  isTimeUp.value = false;

  // Генерируем новое число (с кривой сложности)
  if (score.value < 300) {
    if (roundsPlayed.value <= 5) {
      targetCount.value = Math.floor(Math.random() * 8) + 3; // 3 to 10
    } else {
      targetCount.value = Math.floor(Math.random() * 11) + 5; // 5 to 15 (was 5 to 20)
    }
  } else {
    // After 300 points, only hard examples
    targetCount.value = Math.floor(Math.random() * 10) + 11; // 11 to 20
  }


  // Создаем шары
  balls.value = []
  for (let i = 0; i < targetCount.value; i++) {
    balls.value.push({
      id: i,
      style: {
        transform: 'translate(-50%, -50%)', // Начальная позиция (скрыты)
        transition: 'all 1.5s ease-in-out',
        background: getRandomColor(),
      },
    })
  }

  // Даем Vue один тик на рендер шаров, прежде чем запустить анимацию
  nextTick(() => {
    animateFlying()
  })
}

const animateFlying = () => {
  if (!worldEl.value) return;
  
  const width = worldEl.value.clientWidth;
  const height = worldEl.value.clientHeight;
  const centerX = width / 2;
  const centerY = height / 2;

  balls.value.forEach((ball) => {
    const x = Math.random() * (width - 50);
    const y = Math.random() * (height - 50);
    const translateX = x - centerX;
    const translateY = y - centerY;

    ball.style.transform = `translate(${translateX}px, ${translateY}px) rotate(360deg)`;
    ball.style.transition = 'all 1.5s ease-in-out';
  });

  setTimeout(animateGrouping, 2000);
}

/**
 * 3. Анимация группировки (самая важная логика)
 */
const animateGrouping = () => {
  gameState.value = 'grouping'
  if (!worldEl.value) return

  const width = worldEl.value.clientWidth;
  const height = worldEl.value.clientHeight;
  const centerX = width / 2;
  const centerY = height / 2;

  // Dynamically get the height of the input area to use as a top offset
  const topOffset = (inputAreaEl.value?.offsetHeight || 150) + 20; // Add some padding

  const ballPositions = generateLayoutPositions(
    targetCount.value,
    width,
    height,
    topOffset
  )

  balls.value.forEach((ball, index) => {
    const pos = ballPositions[index] || { x: 50, y: 50 }
    const translateX = pos.x - centerX;
    const translateY = pos.y - centerY;

    ball.style.transform = `translate(${translateX}px, ${translateY}px) rotate(0deg)`
    ball.style.transition = 'all 1s ease-in-out'
  })

  setTimeout(() => {
    gameState.value = 'awaitingInput'
    startRoundTimer();
    nextTick(() => {
      inputEl.value?.focus()
    })
  }, 1500)
}

/**
 * 4. Проверка ответа пользователя
 */
const checkAnswer = () => {
  if (userGuess.value === null || gameState.value === 'feedback') return
  
  const wasOnTime = !isTimeUp.value;
  stopRoundTimer();
  attempts.value++;
  gameState.value = 'feedback';

  const isCorrect = userGuess.value === targetCount.value;

      if (isCorrect) {
        const oldScore = score.value;
        if (wasOnTime && attempts.value === 1) {
          const points = score.value >= 300 && targetCount.value > 15 ? 30 : (targetCount.value > 10 ? 20 : 10);
          score.value += points;
          spawnNotification(`+${points}`, 'correct');
          scoreColor.value = '#2ecc71';
        } else {
          spawnNotification(t('howMany.feedback.correct'), 'neutral');
          scoreColor.value = 'white';
        }
  
        // Milestone check
        if (score.value > oldScore && Math.floor(oldScore / 100) < Math.floor(score.value / 100)) {
          if (score.value >= 1000) {
            spawnNotification(t('howMany.feedback.win'), 'milestone');
            emit('completed');
          } else {
            spawnNotification(t('howMany.feedback.milestone', { remaining: 1000 - score.value }), 'milestone');
          }
        }
        
        setTimeout(setupRound, 2000);
  
      } else {
        // Incorrect answer
        score.value -= 20;
        spawnNotification('-20', 'incorrect');
        scoreColor.value = '#e74c3c';
        
        if (isTimeUp.value) { // If time was already up, move to next round after feedback
          setTimeout(setupRound, 2000);
        } else { // Otherwise, let user try again
          setTimeout(() => {
            gameState.value = 'awaitingInput';
            userGuess.value = null;
            startRoundTimer(); // Restart timer for another try
            nextTick(() => {
              inputEl.value?.focus();
            });
          }, 1500);
        }
      }
  setTimeout(() => { scoreColor.value = 'white'; }, 1500);
};

// --- 5. Вспомогательные функции ---

const spawnNotification = (message: string, type: Notification['type']) => {
  const id = notificationIdCounter++;
  notifications.value.push({ id, message, type });
  setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  }, 1900); // Should be slightly less than animation duration
};

const TIME_LIMIT = 10000; // 10 seconds

const stopRoundTimer = () => {
  if (roundTimer.value) {
    clearInterval(roundTimer.value);
    roundTimer.value = null;
  }
};

const startRoundTimer = () => {
  stopRoundTimer();
  timerProgress.value = 0;
  isTimeUp.value = false;
  const interval = 100; // ms

  roundTimer.value = window.setInterval(() => {
    timerProgress.value += (interval / TIME_LIMIT) * 100;
    if (timerProgress.value >= 100) {
      handleTimeUp();
    }
  }, interval);
};

const handleTimeUp = () => {
  stopRoundTimer();
  isTimeUp.value = true;
  
  // Penalty for time up
  score.value -= 20;
  scoreColor.value = 'red';
  setTimeout(() => { scoreColor.value = 'white'; }, 1500);
  spawnNotification(t('howMany.feedback.timeUp', { points: 20 }), 'incorrect');
  
  // Make balls black
  balls.value.forEach(ball => {
    ball.style.background = '#333';
    ball.style.transition = 'background 0.5s';
  });
};

function generateLayoutPositions(
  count: number,
  worldWidth: number,
  worldHeight: number,
  topOffset: number
): { x: number; y: number }[] {
  const ballSize = 40;
  const padding = 10;
  const totalSize = ballSize + padding;
  const groupSizes = decomposeNumber(count);
  const groupCenters = getGroupCenters(groupSizes.length, worldWidth, worldHeight, topOffset);
  const allPositions: { x: number; y: number }[] = [];

  groupSizes.forEach((size, groupIndex) => {
    const center = groupCenters[groupIndex];
    const cols = Math.ceil(Math.sqrt(size));
    const rows = Math.ceil(size / cols);
    const groupWidth = cols * totalSize - padding;
    const groupHeight = rows * totalSize - padding;
    const startX = center.x - groupWidth / 2;
    const startY = center.y - groupHeight / 2;

    for (let i = 0; i < size; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      allPositions.push({
        x: startX + col * totalSize,
        y: startY + row * totalSize,
      });
    }
  });

  for (let i = allPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]];
  }

  return allPositions;
}

function decomposeNumber(n: number): number[] {
  const maxGroups = Math.min(5, n);
  const numGroups = Math.floor(Math.random() * maxGroups) + 1;

  if (numGroups === 1) {
    return [n];
  }

  const splitPoints = new Set<number>();
  while (splitPoints.size < numGroups - 1) {
    splitPoints.add(Math.floor(Math.random() * (n - 1)) + 1);
  }

  const sortedSplits = Array.from(splitPoints).sort((a, b) => a - b);

  const parts: number[] = [];
  let lastSplit = 0;
  for (const split of sortedSplits) {
    parts.push(split - lastSplit);
    lastSplit = split;
  }
  parts.push(n - lastSplit);

  return parts;
}

function getGroupCenters(numGroups: number, worldWidth: number, worldHeight: number, topOffset: number): { x: number; y: number }[] {
  const centers: { x: number; y: number }[] = [];
  const centerX = worldWidth / 2;

  // The top boundary is the bottom of the input area UI.
  const topBoundary = topOffset; 
  // The bottom boundary is the vertical midpoint of the screen.
  const bottomBoundary = worldHeight / 2;

  // The available space is between these two boundaries.
  const availableHeight = bottomBoundary - topBoundary;

  // The vertical center for patterns is the middle of that available space.
  const centerY = topBoundary + (availableHeight / 2); 
  
  const offsetX = worldWidth / 4;
  // Make offsetY relative to the new available height to prevent overlap
  const offsetY = availableHeight / 3;

  switch (numGroups) {
    case 1:
      centers.push({ x: centerX, y: centerY });
      break;
    case 2:
      centers.push({ x: centerX - offsetX, y: centerY });
      centers.push({ x: centerX + offsetX, y: centerY });
      break;
    case 3:
      centers.push({ x: centerX, y: centerY - offsetY * 0.75 });
      centers.push({ x: centerX - offsetX, y: centerY + offsetY * 0.75 });
      centers.push({ x: centerX + offsetX, y: centerY + offsetY * 0.75 });
      break;
    case 4:
      centers.push({ x: centerX - offsetX, y: centerY - offsetY });
      centers.push({ x: centerX + offsetX, y: centerY - offsetY });
      centers.push({ x: centerX - offsetX, y: centerY + offsetY });
      centers.push({ x: centerX + offsetX, y: centerY + offsetY });
      break;
    case 5:
      centers.push({ x: centerX, y: centerY });
      centers.push({ x: centerX - offsetX * 1.2, y: centerY - offsetY });
      centers.push({ x: centerX + offsetX * 1.2, y: centerY - offsetY });
      centers.push({ x: centerX - offsetX * 1.2, y: centerY + offsetY });
      centers.push({ x: centerX + offsetX * 1.2, y: centerY + offsetY });
      break;
  }
  return centers;
}

function getRandomColor(): string {
  const hue = Math.floor(Math.random() * 360)
  return `hsl(${hue}, 80%, 70%)`
}
</script>

<style scoped>
.how-many-game {
  position: relative;
  width: 100%;
  height: 100%;
  background: #2c3e50;
  overflow: hidden;
  border-radius: 8px;
  font-family: 'Nunito', sans-serif;
  color: white;
}

.game-world {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.ball {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  left: 50%;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(255, 255, 255, 0.5);
}

.game-ui {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.score-display {
  position: absolute;
  top: 15px;
  left: 15px;
  font-size: 2.5rem; /* Larger font */
  font-weight: 900; /* Bolder */
  transition: color 0.3s;
  z-index: 20; /* Ensure score is above input area */
  width: 200px; /* Wider area */
  text-align: left;
  -webkit-text-stroke: 1px rgba(0,0,0,0.3); /* Add a subtle outline */
}

.input-area {
  pointer-events: auto;
  margin-top: 10px;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(5px);
  padding: 10px;
  padding-bottom: 20px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  z-index: 10;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative; /* For timer positioning */
  width: 130px; /* More square-like */
}

.input-area h2 {
  margin: 0;
  font-weight: bold;
  font-size: 1.2rem;
}

.input-area input {
  font-size: 2.5rem;
  width: 100px;
  text-align: center;
  background: rgba(51, 51, 51, 0.5);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 5px;
  -moz-appearance: textfield; /* Firefox */
}
.input-area input::-webkit-outer-spin-button,
.input-area input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.input-area button {
  display: none; /* Button is removed */
}

.timer-bar-container {
  width: 100%;
  height: 4px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  position: absolute;
  bottom: 10px;
  left: 0;
}

.timer-bar {
  height: 100%;
  background-color: #e74c3c;
  border-radius: 2px;
  transition: width 0.1s linear;
}

/* --- Notification System Styles --- */
.notification-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  z-index: 100;
}

.floating-text {
  position: absolute;
  font-size: 4rem;
  font-weight: 900;
  -webkit-text-stroke: 2px black;
  text-shadow: 0 0 15px black;
  animation: shoot-out 2s forwards ease-out;
}

.floating-text.correct {
  color: #2ecc71;
}
.floating-text.incorrect {
  color: #e74c3c;
}
.floating-text.neutral {
  color: #bdc3c7;
  font-size: 2.5rem;
}
.floating-text.milestone {
  color: #f1c40f;
  font-size: 2rem;
  animation-duration: 3s; /* Longer animation for milestones */
}

@keyframes shoot-out {
  0% {
    transform: translateY(0) scale(0.5);
    opacity: 1;
  }
  100% {
    transform: translateY(-150px) scale(1.2);
    opacity: 0;
  }
}
</style>
