<template>
  <div class="relative w-full h-full overflow-hidden bg-black select-none font-mono text-cyan-300">
    <!-- Space Background (Persistent) -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1a237e_0%,#000000_100%)] opacity-50"></div>
      <div class="stars"></div>
    </div>

    <!-- Main Content Area -->
    <div class="relative z-10 w-full h-full flex flex-col">

      <!-- Navigation / Header (Visible on all screens except Intro maybe? Let's keep it simple for now) -->
      <div v-if="currentStage !== 'intro'"
        class="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
        <div class="text-xs font-bold text-slate-500 uppercase tracking-widest">{{
          $t('multiplication_galaxy.mission_header') }}</div>
        <div class="flex gap-2">
          <div v-for="stage in ['intro', 'grouping', 'grid', 'challenge']" :key="stage"
            class="w-2 h-2 rounded-full transition-colors duration-300"
            :class="currentStage === stage ? 'bg-cyan-400' : 'bg-slate-700'">
          </div>
        </div>
      </div>

      <!-- STAGE: INTRO -->
      <transition name="fade" mode="out-in">
        <div v-if="currentStage === 'intro'" key="intro"
          class="flex-1 flex flex-col items-center justify-center p-4 md:p-8 text-center space-y-8">
          <div class="space-y-4 animate-float">
            <h1
              class="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-purple-400 to-pink-500 drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]"
              v-html="$t('multiplication_galaxy.title').replace(' ', '<br>')">
            </h1>
            <p class="text-lg sm:text-xl md:text-2xl text-cyan-100 max-w-2xl mx-auto leading-relaxed px-2">
              {{ $t('multiplication_galaxy.mission_intro') }}
            </p>
          </div>

          <button @click="nextStage"
            class="group relative px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xl uppercase tracking-widest rounded-full transition-all transform hover:scale-105 hover:shadow-[0_0_40px_rgba(34,211,238,0.6)]">
            <span class="relative z-10 flex items-center gap-2">
              {{ $t('multiplication_galaxy.start_mission') }}
              <svg class="w-6 h-6 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6">
                </path>
              </svg>
            </span>
            <div class="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity">
            </div>
          </button>
        </div>

        <!-- STAGE: FUELING (Repeated Addition) -->
        <div v-else-if="currentStage === 'grouping'" key="grouping"
          class="flex-1 flex flex-col items-center justify-between py-8">
          <!-- Instruction -->
          <div class="text-center space-y-2 animate-slide-down">
            <h2 class="text-3xl font-bold text-white">{{ $t('multiplication_galaxy.mission_fueling') }}</h2>
            <p class="text-xl text-cyan-200" v-html="$t('multiplication_galaxy.fueling_instruction', {
              pods: `<span class='text-yellow-400 font-bold'>4</span>`,
              stars: `<span class='text-purple-400 font-bold'>3</span>`
            })">
            </p>
          </div>

          <!-- Equation Display -->
          <div class="h-24 flex items-center justify-center">
            <div class="text-4xl md:text-6xl font-bold text-white font-mono transition-all duration-500">
              <span v-if="fuelingState === 'complete'"
                class="animate-pop-in text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]">
                4 x 3 = 12
              </span>
              <span v-else>
                <span v-for="(pod, idx) in fuelPods" :key="idx">
                  <span v-if="pod.filled" class="animate-pop-in inline-block">
                    <span class="text-yellow-400">3</span>
                    <span v-if="idx < 3" class="text-slate-500 mx-2">+</span>
                  </span>
                  <span v-else class="opacity-0">3 + </span>
                </span>
                <span v-if="fuelPods.every(p => p.filled)" class="animate-pop-in text-slate-300"> = 12</span>
              </span>
            </div>
          </div>

          <!-- Fuel Pods Area -->
          <div class="flex-1 w-full flex items-center justify-center gap-4 md:gap-8 px-4">
            <div v-for="(pod, idx) in fuelPods" :key="idx" @click="fillPod(idx)"
              class="relative w-24 h-32 md:w-32 md:h-48 border-4 rounded-2xl flex flex-col items-center justify-end overflow-hidden transition-all duration-300 cursor-pointer group"
              :class="pod.filled ? 'border-yellow-400 bg-yellow-900/20 shadow-[0_0_20px_rgba(250,204,21,0.3)]' : 'border-slate-700 bg-slate-800/50 hover:border-cyan-400'">
              <!-- Label -->
              <div class="absolute top-2 text-xs font-bold uppercase tracking-wider text-slate-500">{{
                $t('multiplication_galaxy.pod_label', { n: idx + 1 }) }}
              </div>

              <!-- Stars inside -->
              <div class="grid grid-cols-2 gap-1 mb-4 p-2 transition-all duration-500"
                :class="pod.filled ? 'opacity-100 scale-100' : 'opacity-0 scale-50'">
                <div v-for="n in 3" :key="n" class="w-8 h-8">
                  <svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">
                    <path d="M50 10 L61 35 L88 35 L68 57 L79 82 L50 65 L21 82 L32 57 L12 35 L39 35 Z" fill="#FDE047" />
                  </svg>
                </div>
              </div>

              <!-- Fill Progress (Visual liquid) -->
              <div class="absolute bottom-0 left-0 right-0 bg-yellow-500/20 transition-all duration-500"
                :style="{ height: pod.filled ? '100%' : '0%' }"></div>

              <!-- Hover hint -->
              <div v-if="!pod.filled"
                class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <span class="text-2xl">➕</span>
              </div>
            </div>
          </div>

          <!-- Next Button -->
          <div class="h-16 flex items-center justify-center">
            <transition name="fade">
              <button v-if="fuelingState === 'complete'" @click="nextStage"
                class="px-8 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-full animate-bounce shadow-[0_0_20px_rgba(74,222,128,0.5)]">
                {{ $t('multiplication_galaxy.engage') }} 🚀
              </button>
            </transition>
          </div>
        </div>

        <!-- STAGE: MATRIX (10x10 Grid) -->
        <div v-else-if="currentStage === 'grid'" key="grid"
          class="flex-1 flex flex-col items-center justify-between py-8">
          <!-- Instruction -->
          <div class="text-center space-y-2 animate-slide-down">
            <h2 class="text-3xl font-bold text-white">{{ $t('multiplication_galaxy.mission_matrix') }}</h2>
            <p class="text-xl text-cyan-200"
              v-html="$t('multiplication_galaxy.matrix_instruction', { target: `<span class='text-yellow-400 font-bold text-3xl'>${matrixTarget}</span>` })">
            </p>
            <div class="text-sm text-slate-400">{{ $t('multiplication_galaxy.drag_instruction') }}</div>
          </div>

          <!-- The Matrix Grid -->
          <div class="flex-1 flex items-center justify-center p-4 w-full max-w-2xl">
            <div
              class="grid gap-1 p-4 bg-slate-900/80 rounded-xl border border-slate-700 shadow-2xl select-none touch-none"
              style="grid-template-columns: repeat(10, 1fr); grid-template-rows: repeat(10, 1fr);"
              @mousedown="startDrag" @mousemove="onDrag" @mouseup="endDrag" @mouseleave="endDrag"
              @touchstart.prevent="startTouch" @touchmove.prevent="onTouch" @touchend="endDrag">
              <div v-for="i in 100" :key="i"
                class="w-6 h-6 md:w-8 md:h-8 rounded-sm transition-all duration-100 flex items-center justify-center text-[10px] text-black font-bold"
                :class="getCellClass(i)" :data-index="i">
                <span v-if="isSelected(i)" class="animate-pop-in">{{ getSelectionNumber(i) }}</span>
              </div>
            </div>
          </div>

          <!-- Feedback Panel -->
          <div
            class="w-full max-w-2xl bg-slate-900/80 backdrop-blur border border-slate-700 rounded-2xl p-6 flex items-center justify-between gap-8">
            <div class="text-center flex-1">
              <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">{{
                $t('multiplication_galaxy.dimensions') }}</div>
              <div class="text-2xl font-bold text-cyan-400 font-mono">
                {{ selectedRect.w }} x {{ selectedRect.h }}
              </div>
            </div>

            <div class="text-center flex-1 border-l border-slate-700">
              <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">{{
                $t('multiplication_galaxy.total_power') }}</div>
              <div class="text-4xl font-bold font-mono"
                :class="selectedArea === matrixTarget ? 'text-green-400' : 'text-white'">
                {{ selectedArea }}
              </div>
            </div>

            <div class="flex-1 flex justify-end">
              <button v-if="selectedArea === matrixTarget" @click="nextMatrixLevel"
                class="px-6 py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-full animate-bounce shadow-[0_0_20px_rgba(74,222,128,0.5)]">
                {{ $t('multiplication_galaxy.engage') }}!
              </button>
            </div>
          </div>
        </div>

        <!-- STAGE: WARP JUMP (Fluency) -->
        <div v-else-if="currentStage === 'challenge'" key="challenge"
          class="flex-1 flex flex-col items-center justify-between py-8 relative overflow-hidden">

          <!-- Warp Effect (Background) -->
          <div v-if="warpState === 'warping'" class="absolute inset-0 z-0">
            <div class="absolute inset-0 bg-cyan-500/20 animate-pulse"></div>
            <div class="stars-warp"></div>
          </div>

          <div v-if="!challengeVictory" class="relative z-10 w-full h-full flex flex-col items-center justify-between">
            <!-- Instruction -->
            <div class="text-center space-y-2 animate-slide-down">
              <h2 class="text-3xl font-bold text-white">{{ $t('multiplication_galaxy.mission_warp') }}</h2>
              <p class="text-xl text-cyan-200"
                v-html="$t('multiplication_galaxy.warp_target', { target: `<span class='text-yellow-400 font-bold text-4xl'>${warpTarget}</span>` })">
              </p>
              <p class="text-sm text-slate-400">{{ $t('multiplication_galaxy.warp_instruction', { target: warpTarget })
              }}</p>
            </div>

            <!-- The Gate Visual -->
            <div class="flex-1 flex items-center justify-center my-4">
              <div
                class="relative w-64 h-64 rounded-full border-8 border-slate-700 flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-1000"
                :class="{ 'border-cyan-400 shadow-[0_0_100px_rgba(34,211,238,0.6)]': warpState === 'open' }">
                <div class="absolute inset-0 rounded-full border-4 border-dashed border-slate-600 animate-spin-slow">
                </div>
                <div class="text-6xl font-black text-white z-10">{{ warpTarget }}</div>
                <!-- Energy Beams -->
                <div v-if="warpState === 'open'" class="absolute inset-0 bg-cyan-400/20 rounded-full animate-ping">
                </div>
              </div>
            </div>

            <!-- Controls (Equations) -->
            <div class="w-full max-w-4xl px-4">
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <button v-for="(opt, idx) in warpOptions" :key="idx" @click="toggleWarpOption(idx)"
                  class="p-4 rounded-xl font-bold text-xl transition-all duration-200 transform hover:scale-105 border-2"
                  :class="getWarpBtnClass(opt)">
                  {{ opt.a }} x {{ opt.b }}
                </button>
              </div>
            </div>

            <!-- Engage Button -->
            <div class="h-24 flex items-center justify-center mt-4">
              <button @click="checkWarpGate"
                class="px-12 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-2xl uppercase tracking-widest rounded-full shadow-[0_0_30px_rgba(234,179,8,0.5)] transition-all transform active:scale-95"
                :disabled="warpState !== 'selecting'">
                {{ $t('multiplication_galaxy.engage') }}
              </button>
            </div>
          </div>

          <!-- Victory Screen -->
          <div v-else
            class="relative z-10 flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-zoom-in">
            <div class="text-8xl animate-bounce">🏆</div>
            <h2
              class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
              {{ $t('multiplication_galaxy.mission_accomplished') }}</h2>
            <p class="text-2xl text-slate-300">{{ $t('multiplication_galaxy.victory_text') }}</p>
            <button @click="restartGame"
              class="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xl rounded-full shadow-[0_0_30px_rgba(34,211,238,0.6)] animate-pulse">
              {{ $t('multiplication_galaxy.play_again') }}
            </button>
          </div>
        </div>
      </transition>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const stages = ['intro', 'grouping', 'grid', 'challenge']
const currentStage = ref('intro')

// Fueling Stage Logic
const fuelPods = ref([])
const fuelingState = ref('filling') // 'filling', 'calculating', 'complete'

const initGroupingStage = () => {
  // Initialize 4 empty pods
  fuelPods.value = Array.from({ length: 4 }, () => ({ filled: false }))
  fuelingState.value = 'filling'
}

const fillPod = (index) => {
  // Only allow filling in order for better flow, or any order? 
  // Let's enforce order to match the equation building from left to right.
  const firstEmptyIndex = fuelPods.value.findIndex(p => !p.filled)
  if (index === firstEmptyIndex) {
    fuelPods.value[index].filled = true

    // Check if all filled
    if (fuelPods.value.every(p => p.filled)) {
      setTimeout(() => {
        fuelingState.value = 'complete'
      }, 1500) // Delay to show the full addition equation before transforming
    }
  } else if (!fuelPods.value[index].filled) {
    // Shake effect for wrong pod (todo)
  }
}

// Matrix Stage Logic
const matrixTarget = ref(15)
const matrixLevels = [15, 24, 64, 81, 100]
const currentMatrixLevelIndex = ref(0)
const isDragging = ref(false)
const startCell = ref(null) // {r, c} 0-9
const currentCell = ref(null) // {r, c} 0-9

const selectedRect = computed(() => {
  if (!startCell.value || !currentCell.value) return { r: 0, c: 0, w: 0, h: 0 }
  const r1 = Math.min(startCell.value.r, currentCell.value.r)
  const c1 = Math.min(startCell.value.c, currentCell.value.c)
  const r2 = Math.max(startCell.value.r, currentCell.value.r)
  const c2 = Math.max(startCell.value.c, currentCell.value.c)
  return { r: r1, c: c1, w: c2 - c1 + 1, h: r2 - r1 + 1 }
})

const selectedArea = computed(() => selectedRect.value.w * selectedRect.value.h)

const getCellCoords = (i) => {
  const idx = i - 1
  return { r: Math.floor(idx / 10), c: idx % 10 }
}

const isSelected = (i) => {
  const { r, c } = getCellCoords(i)
  const rect = selectedRect.value
  return r >= rect.r && r < rect.r + rect.h && c >= rect.c && c < rect.c + rect.w
}

const getSelectionNumber = (i) => {
  if (!isSelected(i)) return ''
  const { r, c } = getCellCoords(i)
  const rect = selectedRect.value
  const relRow = r - rect.r
  const relCol = c - rect.c
  return (relRow * rect.w) + relCol + 1
}

const getCellClass = (i) => {
  if (isSelected(i)) return 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] scale-95 text-black font-bold'
  return 'bg-slate-800 hover:bg-slate-700'
}

const startDrag = (e) => {
  isDragging.value = true
  const i = parseInt(e.target.dataset.index)
  if (i) {
    startCell.value = getCellCoords(i)
    currentCell.value = startCell.value
  }
}

const onDrag = (e) => {
  if (!isDragging.value) return
  // For mouse events, target might change if we move fast, but usually we want the element under cursor
  // But since we have mouseover on cells (wait, I didn't add mouseover, I used mousemove on container)
  // Actually mousemove on container is tricky to get the cell. 
  // Better to use mouseenter on cells or calculate from coords.
  // Let's use mouseover on cells if possible, or elementFromPoint.
  // Re-implementing with simpler logic: mouseover on cells.
  // But I put mousemove on container. Let's fix that in template or here.
  // Actually, `e.target` in mousemove will be the cell if we are over it.
  const i = parseInt(e.target.dataset.index)
  if (i) {
    currentCell.value = getCellCoords(i)
  }
}

const endDrag = () => {
  isDragging.value = false
}

// Touch support helpers
const startTouch = (e) => {
  const touch = e.touches[0]
  const el = document.elementFromPoint(touch.clientX, touch.clientY)
  if (el && el.dataset.index) {
    startDrag({ target: el })
  }
}

const onTouch = (e) => {
  const touch = e.touches[0]
  const el = document.elementFromPoint(touch.clientX, touch.clientY)
  if (el && el.dataset.index) {
    onDrag({ target: el })
  }
}

const initMatrixStage = () => {
  currentMatrixLevelIndex.value = 0
  matrixTarget.value = matrixLevels[0]
  startCell.value = null
  currentCell.value = null
}

const nextMatrixLevel = () => {
  if (currentMatrixLevelIndex.value < matrixLevels.length - 1) {
    currentMatrixLevelIndex.value++
    matrixTarget.value = matrixLevels[currentMatrixLevelIndex.value]
    startCell.value = null
    currentCell.value = null
  } else {
    nextStage()
  }
}

// Warp Jump Stage Logic
const warpLevels = [12, 24, 36]
const currentWarpLevelIndex = ref(0)
const warpTarget = ref(12)
const warpOptions = ref([])
const warpState = ref('selecting') // 'selecting', 'open', 'warping'
const challengeVictory = ref(false)

const initWarpStage = () => {
  currentWarpLevelIndex.value = 0
  challengeVictory.value = false
  setupWarpLevel()
}

const setupWarpLevel = () => {
  warpState.value = 'selecting'
  warpTarget.value = warpLevels[currentWarpLevelIndex.value]

  // Generate options: correct pairs + distractors
  const correctPairs = getFactorPairs(warpTarget.value)
  const distractors = generateDistractors(warpTarget.value)

  // Combine and shuffle
  const allOptions = [
    ...correctPairs.map(p => ({ ...p, correct: true, selected: false })),
    ...distractors.map(p => ({ ...p, correct: false, selected: false }))
  ].sort(() => Math.random() - 0.5)

  // Ensure not too many options (max 8)
  warpOptions.value = allOptions.slice(0, 8)
}

const getFactorPairs = (num) => {
  const pairs = []
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) {
      pairs.push({ a: i, b: num / i })
      if (i * i !== num) pairs.push({ a: num / i, b: i })
    }
  }
  return pairs
}

const generateDistractors = (target) => {
  const distractors = []
  while (distractors.length < 5) {
    const a = Math.floor(Math.random() * 8) + 2
    const b = Math.floor(Math.random() * 8) + 2
    if (a * b !== target) {
      distractors.push({ a, b })
    }
  }
  return distractors
}

const toggleWarpOption = (index) => {
  if (warpState.value !== 'selecting') return
  warpOptions.value[index].selected = !warpOptions.value[index].selected
}

const getWarpBtnClass = (opt) => {
  if (opt.selected) {
    return 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
  }
  return 'bg-slate-800 text-cyan-400 border-slate-600 hover:border-cyan-400 hover:bg-slate-700'
}

const checkWarpGate = () => {
  // Check if ALL correct options are selected and NO incorrect ones
  const selected = warpOptions.value.filter(o => o.selected)
  const correct = warpOptions.value.filter(o => o.correct)

  const allCorrectSelected = correct.every(c => c.selected)
  const noIncorrectSelected = selected.every(s => s.correct)

  if (allCorrectSelected && noIncorrectSelected) {
    // Success!
    warpState.value = 'open'
    setTimeout(() => {
      warpState.value = 'warping'
      setTimeout(() => {
        if (currentWarpLevelIndex.value < warpLevels.length - 1) {
          currentWarpLevelIndex.value++
          setupWarpLevel()
        } else {
          challengeVictory.value = true
          warpState.value = 'selecting' // Reset for victory screen bg
        }
      }, 2000) // Warp duration
    }, 1000) // Gate open duration
  } else {
    // Error feedback (shake or red flash)
    // For now, just deselect incorrect ones visually or shake
    // Simple reset of incorrect ones
    warpOptions.value.forEach(o => {
      if (o.selected && !o.correct) o.selected = false
    })
    // Could add a toast "Coordinate Mismatch!"
  }
}

const restartGame = () => {
  currentStage.value = 'intro'
}

const nextStage = () => {
  const currentIndex = stages.indexOf(currentStage.value)
  if (currentIndex < stages.length - 1) {
    currentStage.value = stages[currentIndex + 1]
    if (currentStage.value === 'grouping') initGroupingStage()
    if (currentStage.value === 'grid') initMatrixStage()
    if (currentStage.value === 'challenge') initWarpStage()
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-20px);
  }
}

@keyframes float-random {
  0% {
    transform: translate(0, 0);
  }

  100% {
    transform: translate(10px, -20px);
  }
}

.animate-slide-down {
  animation: slide-down 0.5s ease-out;
}

@keyframes slide-down {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.pop-enter-active,
.pop-leave-active {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0);
}

.animate-zoom-in {
  animation: zoom-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes zoom-in {
  from {
    transform: scale(0.5);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Simple Starfield (Preserved) */
.stars {
  width: 1px;
  height: 1px;
  background: transparent;
  box-shadow: 100px 200px #FFF, 300px 500px #FFF, 500px 100px #FFF, 800px 300px #FFF,
    150px 600px #FFF, 400px 400px #FFF, 700px 200px #FFF, 900px 600px #FFF;
  animation: move-stars 100s linear infinite;
}

@keyframes move-stars {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(-1000px);
  }
}

.animate-pop-in {
  animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes pop-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-spin-slow {
  animation: spin 10s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.stars-warp {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 2px;
  background: white;
  box-shadow:
    0 0 0 0 #fff,
    100px 100px 0 0 #fff,
    -200px 200px 0 0 #fff,
    200px -200px 0 0 #fff,
    -100px -300px 0 0 #fff;
  animation: warp-speed 0.5s linear infinite;
}

@keyframes warp-speed {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  100% {
    transform: scale(20);
    opacity: 0;
  }
}
</style>
