<template>
  <div class="math-bubbles-game">
    <div class="game-ui">
      <div class="score">{{ t('mathBubbles.score') }}: {{ score }}</div>
      <div class="round">{{ t('mathBubbles.round') }}: {{ round }}</div>
    </div>

    <div class="target-container">
      <div class="target-prompt">{{ t('mathBubbles.prompt') }}</div>
      <div class="target-number">{{ targetNumber }}</div>
    </div>

    <div
      v-for="bubble in bubbles"
      :key="bubble.id"
      :id="`bubble-${bubble.id}`"
      class="bubble"
      :class="{ 
        popping: bubble.popping,
        merging: bubble.isMerging,
        'ghost-source': draggedBubbleInfo && draggedBubbleInfo.id === bubble.id
      }"
      :style="{ 
        top: bubble.y + 'px', 
        left: bubble.x + 'px',
        width: bubble.radius * 2 + 'px',
        height: bubble.radius * 2 + 'px',
        '--float-duration-x': bubble.floatX.duration,
        '--float-translate-x': bubble.floatX.translate,
        '--float-duration-y': bubble.floatY.duration,
        '--float-translate-y': bubble.floatY.translate,
      }"
      @pointerdown="dragStart($event, bubble)"
    >
      <span class="bubble-value">{{ bubble.value }}</span>
    </div>
    
    <div class="notification-container">
      <div
        v-for="n in notifications"
        :key="n.id"
        class="floating-text"
        :class="n.type"
        :style="{ top: n.y + 'px', left: n.x + 'px' }"
      >
        {{ n.message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAudio } from '~/composables/useAudio';

const { t } = useI18n();
const { playSfx } = useAudio();
const emit = defineEmits(['completed']);

const score = ref(0);
const round = ref(0);
const targetNumber = ref(0);
const bubbles = ref([]);
const roundOver = ref(false);

const notifications = ref([]);
let notificationIdCounter = 0;

let draggedBubbleInfo = ref(null);
let ghostElement = null;
let initialDragPosition = { x: 0, y: 0 };
let initialElementRect = { left: 0, top: 0 };

let nextId = 0;
let isMerging = false;

const isSmallScreen = () => window.innerWidth <= 768;

const getRandomFloatProps = () => ({
    duration: `${Math.random() * 8 + 7}s`,
    translate: `${Math.random() * 60 - 30}px`,
});

const getBubbleRadius = (value) => {
    const minRadius = isSmallScreen() ? 25 : 30;
    const sizeMultiplier = isSmallScreen() ? 1.2 : 2.5;
    return minRadius + value * sizeMultiplier;
}

const isColliding = (newBubble, existingBubbles) => {
    const buffer = isSmallScreen() ? 30 : 20;
    for (const existing of existingBubbles) {
        const dx = newBubble.x - existing.x;
        const dy = newBubble.y - existing.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < newBubble.radius + existing.radius + buffer) {
            return true;
        }
    }
    return false;
};

const generateBubble = (value, existingBubbles, optionalCoords = null) => {
    const radius = getBubbleRadius(value);
    let newBubble;
    
    if (optionalCoords) {
        newBubble = { id: nextId++, value, x: optionalCoords.x, y: optionalCoords.y, radius };
    } else {
        let attempts = 0;
        do {
            const x = Math.random() * (window.innerWidth - radius * 2 - 40) + 20;
            const y = Math.random() * (window.innerHeight - radius * 2 - 200) + 180;
            newBubble = { id: nextId++, value, x, y, radius };
            attempts++;
        } while (isColliding(newBubble, existingBubbles) && attempts < 50);
    }
    
    return {
        ...newBubble,
        popping: false, isMerging: false,
        floatX: getRandomFloatProps(), floatY: getRandomFloatProps(),
    };
};

const startRound = () => {
    round.value++;
    
    const progress = Math.min(score.value, 3000) / 3000;
    const minTarget = Math.floor(8 + (82 * progress));
    const maxTarget = Math.floor(10 + (90 * progress));
    targetNumber.value = Math.floor(Math.random() * (maxTarget - minTarget + 1)) + minTarget;

    bubbles.value = [];
    roundOver.value = false;
    isMerging = false;

    let remaining = targetNumber.value;
    const solutionValues = [];
    while (remaining > 0) {
        let val = Math.floor(Math.random() * (targetNumber.value / 2 - 1)) + 1;
        if (val <= 0) val = 1;
        if (remaining - val < 0) continue;
        
        solutionValues.push(val);
        remaining -= val;
        if (remaining <= 4 && remaining > 0) {
            solutionValues.push(remaining);
            break;
        }
    }

    const maxDistractors = isSmallScreen() ? 2 : 4;
    const numBubbles = solutionValues.length + Math.floor(Math.random() * maxDistractors) + 3;
    const allValues = [...solutionValues];
    while(allValues.length < numBubbles) {
        const distractor = Math.floor(Math.random() * (targetNumber.value - 1)) + 1;
        if (distractor > 0) allValues.push(distractor);
    }

    allValues.forEach(val => {
        const newBubble = generateBubble(val, bubbles.value);
        bubbles.value.push(newBubble);
    });
};

const isSolutionPossible = (currentBubbles, target) => {
    const nums = currentBubbles.map(b => b.value);
    const dp = new Set([0]);
    for (const num of nums) {
        const next = new Set(dp);
        for (const val of dp) {
            if (val + num === target) return true;
            if (val + num < target) {
                next.add(val + num);
            }
        }
        if (next.size > 2000) break; // Increased safety break
        dp.clear();
        next.forEach(v => dp.add(v));
    }
    return false;
};

const spawnNotification = (message, type, coords = { x: window.innerWidth / 2, y: window.innerHeight / 2 }) => {
  const id = notificationIdCounter++;
  notifications.value.push({ id, message, type, ...coords });
  setTimeout(() => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  }, 2900);
};

const dragStart = (event, bubble) => {
  if (roundOver.value || isMerging || !event.isPrimary) return;
  event.preventDefault();
  playSfx('start');
  
  draggedBubbleInfo.value = bubble;
  const sourceElement = event.currentTarget;
  
  ghostElement = sourceElement.cloneNode(true);
  ghostElement.classList.add('drag-ghost');
  document.body.appendChild(ghostElement);

  initialElementRect = sourceElement.getBoundingClientRect();
  initialDragPosition = { x: event.clientX, y: event.clientY };

  ghostElement.style.left = `${initialElementRect.left}px`;
  ghostElement.style.top = `${initialElementRect.top}px`;
  ghostElement.style.transform = 'scale(1.1)';

  document.addEventListener('pointermove', dragMove);
  document.addEventListener('pointerup', dragEnd, { once: true });
};

const dragMove = (event) => {
  if (!ghostElement || !event.isPrimary) return;
  event.preventDefault();
  
  const dx = event.clientX - initialDragPosition.x;
  const dy = event.clientY - initialDragPosition.y;
  
  ghostElement.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.1)`;
};

const dragEnd = (event) => {
  if (!draggedBubbleInfo.value) return;

  const dx = event.clientX - initialDragPosition.x;
  const dy = event.clientY - initialDragPosition.y;
  const finalX = initialElementRect.left + dx;
  const finalY = initialElementRect.top + dy;
  
  const sourceBubble = draggedBubbleInfo.value;
  sourceBubble.x = finalX;
  sourceBubble.y = finalY;

  document.body.removeChild(ghostElement);
  ghostElement = null;
  
  const targetBubble = bubbles.value.find(b => {
    if (b.id === sourceBubble.id) return false;
    const dx = (b.x + b.radius) - (finalX + sourceBubble.radius);
    const dy = (b.y + b.radius) - (finalY + sourceBubble.radius);
    return Math.sqrt(dx * dx + dy * dy) < b.radius;
  });

  draggedBubbleInfo.value = null;
  document.removeEventListener('pointermove', dragMove);

  if (targetBubble) {
    mergeBubbles(sourceBubble, targetBubble);
  }
};

const mergeBubbles = (source, target) => {
    if (isMerging) return;
    isMerging = true;
    playSfx('blip');

    target.isMerging = true;
    source.isMerging = true;

    target.x = source.x + source.radius - target.radius;
    target.y = source.y + source.radius - target.radius;

    setTimeout(() => {
        const newValue = source.value + target.value;
        const newX = (source.x + target.x) / 2;
        const newY = (source.y + target.y) / 2;

        const remainingBubbles = bubbles.value.filter(b => b.id !== source.id && b.id !== target.id);
        
        const newBubble = generateBubble(newValue, remainingBubbles, { x: newX, y: newY });
        bubbles.value = [...remainingBubbles, newBubble];

        if (newValue === targetNumber.value) {
            const oldScore = score.value;
            const points = 100;
            score.value += points;
            playSfx('hit');
            spawnNotification(`+${points}`, 'correct', { x: newX, y: newY });
            roundOver.value = true;

            if (oldScore < 3000 && score.value >= 3000) {
                emit('completed');
            }

            const winnerBubble = bubbles.value.find(b => b.id === newBubble.id);
            if(winnerBubble) winnerBubble.popping = true;
            setTimeout(startRound, 2000);
        } else if (newValue > targetNumber.value) {
            playSfx('error');
            score.value = Math.max(0, score.value - 100);
            spawnNotification(t('mathBubbles.fail'), 'incorrect', { x: newX, y: newY });
            const bustBubble = bubbles.value.find(b => b.id === newBubble.id);
            if(bustBubble) bustBubble.popping = true;
            bubbles.value = bubbles.value.filter(b => b.id !== newBubble.id);
            
            setTimeout(() => {
                if (!isSolutionPossible(bubbles.value, targetNumber.value)) {
                    spawnNotification(t('mathBubbles.noMoves'), 'neutral', { x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    setTimeout(startRound, 2000);
                } else {
                    isMerging = false;
                }
            }, 1500);
        } else {
            isMerging = false;
        }
    }, 300);
};

onMounted(() => {
  startRound();
});

onUnmounted(() => {
    document.removeEventListener('pointermove', dragMove);
    document.removeEventListener('pointerup', dragEnd);
    if (ghostElement) {
        document.body.removeChild(ghostElement);
    }
});
</script>

<style>
/* Global styles for the ghost element */
.drag-ghost {
  position: fixed !important;
  pointer-events: none;
  z-index: 9999;
  animation: none !important;
  transition: none !important;
  will-change: transform;
}
</style>

<style scoped>
@keyframes floatX {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(var(--float-translate-x)); }
}

@keyframes floatY {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(var(--float-translate-y)); }
}

@keyframes pop {
    0% { transform: scale(1); opacity: 0.8; }
    100% { transform: scale(1.6); opacity: 0; }
}

@keyframes shoot-out {
  0% {
    transform: translate(-50%, -50%) translateY(0) scale(0.5);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) translateY(-150px) scale(1.2);
    opacity: 0;
  }
}

.math-bubbles-game {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: 'Arial', sans-serif;
  user-select: none;
  -webkit-user-select: none;
  
  background-color: #4a0e60;
  background-image:
    url("data:image/svg+xml,%3Csvg width='150' height='150' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L55.9 44.1 L100 50 L55.9 55.9 L50 100 L44.1 55.9 L0 50 L44.1 44.1 Z' fill='rgba(255,255,255,0.1)'/%3E%3C/svg%3E"),
    radial-gradient(circle at 90% 85%, hsla(300, 80%, 80%, 0.5) 0%, transparent 30%),
    radial-gradient(circle at 10% 10%, hsla(240, 80%, 80%, 0.5) 0%, transparent 30%),
    radial-gradient(circle at 50% 50%, hsla(50, 80%, 80%, 0.3) 0%, transparent 25%),
    radial-gradient(circle at 15% 75%, hsla(190, 70%, 70%, 0.4) 0%, transparent 20%);
}

.game-ui {
  position: absolute;
  top: 10px;
  left: 15px;
  color: white;
  font-size: 1.2em;
  font-weight: bold;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.6);
  z-index: 100;
}

.target-container {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    color: white;
    z-index: 100;
    pointer-events: none;
    width: 90%;
}

.target-prompt {
    font-size: 1.2em;
    font-weight: 300;
    text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
}

.target-number {
    font-size: 3em;
    font-weight: bold;
    text-shadow: 2px 4px 6px rgba(0,0,0,0.5);
}

.bubble {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.1) 80%);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -5px 10px rgba(0,0,0,0.2);
  cursor: grab;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.9;
  transition: transform 0.3s ease-out, width 0.4s ease, height 0.4s ease, opacity 0.05s linear;
  animation: floatX var(--float-duration-x) ease-in-out infinite, floatY var(--float-duration-y) ease-in-out infinite;
  will-change: transform, opacity;
  touch-action: none;
}

.bubble.ghost-source {
  opacity: 0;
  transition: opacity 0s, transform 0.1s;
  transform: scale(0.8);
  animation: none;
  pointer-events: none;
}

.bubble::before {
    content: '';
    position: absolute;
    top: 15%;
    left: 10%;
    width: 20%;
    height: 20%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
    filter: blur(3px);
}

.bubble:active {
    cursor: grabbing;
}

.bubble.popping {
    animation: pop 0.4s ease-out forwards;
}

.bubble.merging {
    opacity: 0;
    transform: scale(0.7);
    animation: none;
    transition: transform 0.3s, opacity 0.3s, top 0.3s, left 0.3s;
}

.bubble-value {
  font-size: calc(1.2em + 0.6vw);
  font-weight: bold;
  color: #1e3a8a;
  text-shadow: 0 0 2px rgba(255,255,255,0.8);
}

.notification-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}

.floating-text {
  position: absolute;
  font-size: 4rem;
  font-weight: 900;
  -webkit-text-stroke: 2px black;
  text-shadow: 0 0 15px black;
  animation: shoot-out 3s forwards ease-out;
  transform: translate(-50%, -50%); /* Center the notification on its coordinates */
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


/* Responsive Adjustments */
@media (max-width: 768px) {
  .game-ui {
    top: 5px;
    left: 10px;
    font-size: 1em;
  }
  .target-prompt {
    font-size: 1em;
  }
  .target-number {
    font-size: 2.5em;
  }
}

@media (max-width: 480px) {
  .game-ui {
    display: flex;
    gap: 10px;
    width: calc(100% - 20px);
  }
  .target-container {
    top: 40px;
  }
}

</style>