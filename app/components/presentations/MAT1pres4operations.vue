<template>
  <div class="math-demo-container">
    
    <div class="controls">
      <button @click="play('add')" :class="{ active: currentOperation === 'add' }">+</button>
      <button @click="play('subtract')" :class="{ active: currentOperation === 'subtract' }">−</button>
      <button @click="play('multiply')" :class="{ active: currentOperation === 'multiply' }">×</button>
      <button @click="play('divide')" :class="{ active: currentOperation === 'divide' }">÷</button>
    </div>

    <div class="stage-wrapper">
      <transition-group 
        tag="div" 
        class="animation-stage" 
        :class="stageClasses"
        name="circle-anim"
      >
        <div 
          v-for="item in items" 
          :key="item.id" 
          class="circle"
          :class="item.colorClass"
        >
        </div>
      </transition-group>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue';

// --- Emit ---
const emit = defineEmits(['completed']);
const pressedOperations = ref(new Set());
const hasCompleted = ref(false);
// ---

const items = ref([]);
const currentOperation = ref('add');
let animationTimer = null;

const stageClasses = computed(() => {
  return 'operation-' + currentOperation.value;
});

const createItems = (count, colorClass, startId = 0) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${colorClass}-${startId + i}`,
    colorClass: colorClass
  }));
};

const play = async (op) => {
  if (animationTimer) clearTimeout(animationTimer);
  
  // Если мы кликаем на ту же операцию, просто перезапускаем ее
  // не сбрасывая `currentOperation` (чтобы grid не "моргал")
  if (currentOperation.value !== op) {
    currentOperation.value = op;
  }
  
  items.value = [];
  await nextTick();

  pressedOperations.value.add(op);
  if (!hasCompleted.value && pressedOperations.value.size === 4) {
    emit('completed');
    hasCompleted.value = true;
    console.log('Material completed event emitted.');
  }

  switch (op) {
    case 'add':
      items.value = createItems(2, 'color-a');
      animationTimer = setTimeout(() => {
        items.value = [...items.value, ...createItems(3, 'color-b')];
      }, 800);
      animationTimer = setTimeout(() => {
        items.value = items.value.map(item => ({ ...item, colorClass: 'color-result' }));
      }, 1800);
      break;
      
    case 'subtract':
      items.value = createItems(5, 'color-initial');
      animationTimer = setTimeout(() => {
        items.value.splice(3, 2);
      }, 1500);
      break;
      
    case 'multiply':
      // FIX: Пошаговое добавление (4 группы по 3)
      // Сцена 'operation-multiply' - это grid (3 колонки)
      
      // 1. Появляются 3
      items.value = createItems(3, 'color-b', 0);
      
      // 2. Появляются еще 3 (итого 6)
      animationTimer = setTimeout(() => {
        items.value = [...items.value, ...createItems(3, 'color-b', 3)];
      }, 800);

      // 3. Появляются еще 3 (итого 9)
      animationTimer = setTimeout(() => {
        items.value = [...items.value, ...createItems(3, 'color-b', 6)];
      }, 1600);
      
      // 4. Появляются еще 3 (итого 12)
      animationTimer = setTimeout(() => {
        items.value = [...items.value, ...createItems(3, 'color-b', 9)];
      }, 2400);
      break;
      
    case 'divide':
      // 'operation-divide' - это 6x2 grid (куча)
      items.value = createItems(12, 'color-initial');
      
      // Через 1.5с меняем класс сцены на 'operation-divide-result' (4x3)
      animationTimer = setTimeout(() => {
        currentOperation.value = 'divide-result';
      }, 1500);
      break;
  }
};

onMounted(() => {
  play('add');
});
</script>

<style scoped>
.math-demo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 1rem;
  background: #2d2d2d;
  border-radius: 12px;
  border: 1px solid #444;
  box-sizing: border-box;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.controls button {
  font-size: 1.5rem;
  font-weight: bold;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid #555;
  background: #3a3a3a;
  color: #eee;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.controls button:hover {
  background: #4a4a4a;
  border-color: #777;
}

.controls button.active {
  background: #3b82f6;
  color: white;
  border-color: #60a5fa;
  box-shadow: 0 0 10px #3b82f6;
}

/* 2. Обертка для Сцены */
.stage-wrapper {
  width: 100%;
  /* FIX: Увеличил min и max height.
     320px минимум, 800px максимум.
  */
  min-height: 20rem; /* 320px */
  max-height: 800px;
  background: #1e1e1e;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem; /* Чуть больше отступ */
  box-sizing: border-box;
  overflow: hidden;
}

/* 3. Сцена Анимации (Главная логика) */
.animation-stage {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.75rem; /* Чуть больше отступ */
  transition: all 0.4s ease;
}

/* 4. Макеты для Операций (CSS Grid) */

/* Умножение: 3 колонки (для групп по 3) */
.animation-stage.operation-multiply {
  display: grid;
  /* 3 колонки */
  grid-template-columns: repeat(3, auto);
  gap: 0.75rem;
  justify-content: center;
}

/* Деление (Начало): 6x2 grid (куча) */
.animation-stage.operation-divide {
  display: grid;
  grid-template-columns: repeat(6, auto);
  gap: 0.5rem;
  max-width: 18rem; 
  justify-content: center;
}

/* Деление (Результат): 4 колонки (4 группы по 3) */
.animation-stage.operation-divide-result {
  display: grid;
  grid-template-columns: repeat(4, auto);
  gap: 1.5rem; /* Увеличил отступ между группами */
  justify-content: center;
}


/* 5. Круги */
.circle {
  /* Адаптивный размер круга.
    Мин. 1.25rem, макс. 2.25rem.
  */
  width: clamp(1.25rem, 4vw, 2.25rem);
  height: clamp(1.25rem, 4vw, 2.25rem);
  border-radius: 50%;
  flex-shrink: 0;
}

/* 6. Анимации Vue <transition-group> */

.circle-anim-move {
  transition: transform 0.8s cubic-bezier(0.5, 0, 0.5, 1);
}

.circle-anim-enter-active,
.circle-anim-leave-active {
  transition: all 0.5s ease;
}
.circle-anim-enter-from,
.circle-anim-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
.circle-anim-leave-active {
  position: absolute; 
}

/* 7. Цвета */
.circle.color-a { background-color: #3b82f6; } /* blue */
.circle.color-b { background-color: #22c55e; } /* green */
.circle.color-result { background-color: #8b5cf6; } /* purple */
.circle.color-initial { background-color: #ef4444; } /* red */
</style>