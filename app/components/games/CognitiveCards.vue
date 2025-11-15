<template>
  <div class="cognitive-cards-game">
    <div v-if="status === 'playing' || status === 'celebrating'" class="game-screen">
      <div class="game-stats" :class="{ 'fade-out': status === 'celebrating' }">
        <div class="stat">
          <span class="stat-label">{{ t('cognitiveCards.moves') }}:</span>
          <span class="stat-value">{{ moves }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">{{ t('cognitiveCards.time') }}:</span>
          <span class="stat-value">{{ time }}s</span>
        </div>
      </div>
      <div class="cards-grid" :style="gridTemplateStyle">
        <div 
          v-for="card in cards" 
          :key="card.id" 
          class="card-container"
          :class="{ 
            'is-celebrating': status === 'celebrating' && card.id === celebratingCardId,
            'is-hidden': status === 'celebrating' && card.id !== celebratingCardId
          }"
          @click="flipCard(card)"
        >
          <div class="card" :class="{ 'is-flipped': card.isFlipped || (status === 'celebrating' && card.id === celebratingCardId), 'is-matched': card.isMatched }">
            <div class="card-face card-face-front"></div>
            <div class="card-face card-face-back">
              <div v-if="status === 'celebrating' && card.id === celebratingCardId" class="celebration-content">
                <h2 class="finished-title">{{ t('cognitiveCards.winTitle') }}</h2>
                <p class="finished-stats">{{ winMessage }}</p>
                <button @click.stop="startGame" class="play-again-button">{{ t('cognitiveCards.playAgain') }}</button>
              </div>
              <template v-else>{{ card.content }}</template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMediaQuery } from '@vueuse/core';

const { t } = useI18n();
const emit = defineEmits(['completed']);

const status = ref('playing'); // 'playing', 'celebrating'
const cards = ref([]);
const flippedCards = ref([]);
const moves = ref(0);
const time = ref(0);
let timer = null;
const level = ref(1);
const celebratingCardId = ref(null);

// --- Responsive Grid Logic ---
const isMobile = useMediaQuery('(max-width: 768px)');

const GRID_COLS = computed(() => isMobile.value ? 3 : 4);
const GRID_ROWS = computed(() => isMobile.value ? 4 : 3);

const gridTemplateStyle = computed(() => ({
  '--grid-cols': GRID_COLS.value,
  '--grid-rows': GRID_ROWS.value,
  gridTemplateColumns: `repeat(${GRID_COLS.value}, 1fr)`,
  gridTemplateRows: `repeat(${GRID_ROWS.value}, 1fr)`,
}));

const winMessage = computed(() => t('cognitiveCards.winMessage', { moves: moves.value, time: time.value }));

const startGame = () => {
  status.value = 'playing';
  celebratingCardId.value = null;
  moves.value = 0;
  time.value = 0;
  flippedCards.value = [];
  
  generateCards();
  if (timer) clearInterval(timer);
  startTimer();
};

const generateCards = () => {
  const pairs = [];
  const usedAnswers = new Set();
  const numPairs = (GRID_COLS.value * GRID_ROWS.value) / 2;
  
  while (pairs.length < numPairs) {
    const num1 = Math.floor(Math.random() * (10 * level.value - 1)) + 1;
    const num2 = Math.floor(Math.random() * (10 * level.value - 1)) + 1;
    const sum = num1 + num2;

    if (sum <= 10 * level.value && !usedAnswers.has(sum)) {
      const problem = `${num1} + ${num2}`;
      const answer = sum.toString();
      
      if (!pairs.some(p => p.problem === problem)) {
        usedAnswers.add(sum);
        pairs.push({ problem, answer });
      }
    }
  }

  let cardContents = [];
  pairs.forEach((pair, index) => {
    cardContents.push({ content: pair.problem, matchId: index });
    cardContents.push({ content: pair.answer, matchId: index });
  });
  
  for (let i = cardContents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cardContents[i], cardContents[j]] = [cardContents[j], cardContents[i]];
  }
  
  cards.value = cardContents.map((item, index) => ({
    id: index,
    content: item.content,
    matchId: item.matchId,
    isFlipped: false,
    isMatched: false,
  }));
};

const flipCard = (card) => {
  if (status.value === 'celebrating' || card.isFlipped || card.isMatched || flippedCards.value.length === 2) {
    return;
  }
  
  card.isFlipped = true;
  flippedCards.value.push(card);
  
  if (flippedCards.value.length === 2) {
    moves.value++;
    checkForMatch();
  }
};

const checkForMatch = () => {
  const [card1, card2] = flippedCards.value;
  
  if (card1.matchId === card2.matchId) {
    card1.isMatched = true;
    card2.isMatched = true;
    flippedCards.value = [];
    checkIfGameIsFinished();
  } else {
    setTimeout(() => {
      card1.isFlipped = false;
      card2.isFlipped = false;
      flippedCards.value = [];
    }, 1000);
  }
};

const checkIfGameIsFinished = () => {
  const allMatched = cards.value.every(card => card.isMatched);
  if (allMatched) {
    stopTimer();
    if (time.value <= 60) {
      emit('completed');
    }
    // Trigger celebration
    celebratingCardId.value = flippedCards.value.length > 0 ? flippedCards.value[0].id : cards.value[cards.value.length - 1].id;
    // The last card flipped is the second one in the pair that was just matched
    const lastMatchedCard = cards.value.find(c => c.isMatched && !c.wasCelebrating);
    if(lastMatchedCard) celebratingCardId.value = lastMatchedCard.id;
    
    // Find the second card of the last matched pair
    const lastFlipped = flippedCards.value[1];
    celebratingCardId.value = lastFlipped ? lastFlipped.id : cards.value.find(c => c.isMatched).id;


    // Let's just pick the last card in the matched pair
    const lastCardInPair = flippedCards.value[1];
    if (lastCardInPair) {
        celebratingCardId.value = lastCardInPair.id;
    } else {
        // Fallback if something went wrong
        const lastMatched = cards.value.filter(c => c.isMatched);
        celebratingCardId.value = lastMatched.length > 0 ? lastMatched[lastMatched.length - 1].id : 0;
    }
    
    status.value = 'celebrating';
  }
};

const startTimer = () => {
  timer = setInterval(() => {
    time.value++;
  }, 1000);
};

const stopTimer = () => {
  clearInterval(timer);
};

onMounted(() => {
  startGame();
});

onUnmounted(() => {
  stopTimer();
});
</script>

<style scoped>
.cognitive-cards-game {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #2c3e50;
  font-family: 'Arial', sans-serif;
  color: white;
  padding: 1rem;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}

.game-screen {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.game-stats {
  flex-shrink: 0;
  display: flex;
  justify-content: space-around;
  width: 100%;
  max-width: 500px;
  margin-bottom: 1rem;
  font-size: clamp(1.2rem, 5vw, 1.5rem);
  transition: opacity 0.5s ease-out;
}

.game-stats.fade-out {
  opacity: 0;
}

.cards-grid {
  display: grid;
  gap: 1vmin;
  aspect-ratio: var(--grid-cols) / var(--grid-rows);
  margin: auto;
  position: relative;
}

@media (orientation: landscape) {
  .cards-grid { height: 75vmin; width: auto; }
}

@media (orientation: portrait) {
  .cards-grid { width: 85vmin; height: auto; }
}

.card-container {
  perspective: 1000px;
  cursor: pointer;
  transition: opacity 0.5s ease-out;
}

.card-container.is-hidden {
  opacity: 0;
  pointer-events: none;
}

.card-container.is-celebrating {
  position: fixed;
  top: 50%;
  left: 50%;
  width: 40vmin;
  height: calc(40vmin * (var(--grid-rows) / var(--grid-cols)));
  z-index: 100;
  animation: celebrate 1s ease-in-out forwards;
}

@keyframes celebrate {
  0% {
    transform: translate(-50%, -50%) scale(1) rotate(0deg);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.5) rotate(180deg);
  }
  100% {
    transform: translate(-50%, -50%) scale(1.2) rotate(360deg);
  }
}

.card {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s;
}

.card.is-flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: clamp(0.75rem, 4vmin, 2.5rem);
  font-weight: bold;
  padding: 5px;
  box-sizing: border-box;
  text-align: center;
  border: 2px solid #ffffff50;
}

.card-face-front {
  background-color: #3498db;
  background-image:
    radial-gradient(circle at 100% 100%, transparent 10px, #2980b9 10px, #2980b9 12px, transparent 12px),
    radial-gradient(circle at 0 0, transparent 10px, #2980b9 10px, #2980b9 12px, transparent 12px);
  background-size: 24px 24px;
}

.card-face-back {
  background: #ecf0f1;
  color: #2c3e50;
  transform: rotateY(180deg);
}

.card.is-matched .card-face-back {
  background: #2ecc71;
  color: white;
}

.is-celebrating .card-face-back {
  background: #34495e;
  border: 2px solid #3498db;
  box-shadow: 0 0 25px rgba(52, 152, 219, 0.5);
  color: white;
  align-items: stretch; /* Allow content to flow */
}

.celebration-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  animation: fadeInContent 0.5s ease-out 0.8s forwards;
  opacity: 0;
}

@keyframes fadeInContent {
  to { opacity: 1; }
}

.finished-title {
  font-size: clamp(1.5rem, 5vmin, 2rem);
}
.finished-stats {
  font-size: clamp(0.8rem, 3vmin, 1rem);
}
.play-again-button {
  padding: 0.5rem 1rem;
  font-size: clamp(0.8rem, 3vmin, 1rem);
  margin-top: 1rem;
}
</style>
