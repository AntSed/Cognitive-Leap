<template>
  <div class="relative w-full h-full overflow-hidden bg-black select-none font-mono text-white">
    <!-- Retro Sun Background -->
    <div class="absolute inset-0 bg-[linear-gradient(to_bottom,#2c003e_0%,#000000_100%)]">
      <!-- Sun -->
      <div
        class="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-b from-yellow-400 via-orange-500 to-purple-900 blur-sm shadow-[0_0_50px_rgba(255,165,0,0.6)]">
        <!-- Sun Stripes -->
        <div class="absolute bottom-0 w-full h-1/2 flex flex-col justify-end gap-1">
          <div v-for="n in 6" :key="n" class="w-full bg-[#2c003e]" :style="{ height: `${n * 4}px`, opacity: 0.8 }">
          </div>
        </div>
      </div>
      <!-- Grid Floor -->
      <div class="absolute bottom-0 w-full h-1/2 perspective-grid">
        <div class="grid-lines"></div>
      </div>
      <!-- Horizon Glow -->
      <div class="absolute bottom-1/2 w-full h-2 bg-cyan-500 blur-md shadow-[0_0_20px_#06b6d4]"></div>
    </div>

    <!-- Game HUD -->
    <div class="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-50">
      <!-- Score -->
      <div class="bg-black/50 backdrop-blur border border-cyan-500 px-6 py-2 rounded-lg transform skew-x-[-10deg]">
        <div class="text-cyan-400 text-xs uppercase tracking-widest transform skew-x-[10deg]">{{
          $t('games.neonNumberRacer.score') }}</div>
        <div class="text-3xl font-black text-white transform skew-x-[10deg]">{{ score }}</div>
      </div>

      <!-- The Problem -->
      <div
        class="bg-black/80 border-2 border-purple-500 px-12 py-4 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.5)] transform scale-110">
        <div
          class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 flex gap-4 items-center">
          <span>{{ currentProblem.a }}</span>
          <span>{{ currentProblem.op }}</span>
          <span>{{ currentProblem.b }}</span>
          <span>=</span>
          <span class="text-white animate-pulse">?</span>
        </div>
      </div>

      <!-- Speed/Level -->
      <div class="bg-black/50 backdrop-blur border border-pink-500 px-6 py-2 rounded-lg transform skew-x-[10deg]">
        <div class="text-pink-400 text-xs uppercase tracking-widest transform skew-x-[-10deg]">{{
          $t('games.neonNumberRacer.speed') }}</div>
        <div class="text-3xl font-black text-white transform skew-x-[-10deg]">{{ speedLevel }}x</div>
      </div>
    </div>

    <!-- Game World (3D Perspective) -->
    <div class="absolute inset-0 flex items-end justify-center perspective-container overflow-hidden">

      <!-- Lanes Container -->
      <div class="relative w-full max-w-4xl h-full transform-style-3d">

        <!-- Gates (Obstacles) -->
        <div v-for="gate in gates" :key="gate.id"
          class="absolute bottom-0 w-[33.33%] h-80 transition-transform duration-[50ms] linear" :style="{
            left: '50%',
            transform: `translateX(-50%) translateX(${(gate.lane - 1) * 100}%) translateZ(${gate.z}px)`,
            opacity: getOpacity(gate.z),
            zIndex: Math.floor(gate.z),
            transformOrigin: 'bottom center'
          }">
          <!-- Gate Visual -->
          <div
            class="w-full h-full border-x-4 border-t-8 border-b-0 rounded-t-xl flex items-center justify-center backdrop-blur-sm relative group transition-colors duration-200 box-border"
            :class="[
              gate.passed
                ? (gate.isCorrect ? 'bg-green-500/20 border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.8)]' : 'bg-red-500/20 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.8)]')
                : 'bg-black/60 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            ]">
            <div class="text-9xl font-black text-white drop-shadow-lg">{{ gate.value }}</div>
            <!-- Neon Frame Glow -->
            <div class="absolute inset-0 border-4 border-b-0 opacity-50 blur-sm rounded-t-xl"
              :class="gate.passed ? (gate.isCorrect ? 'border-green-400' : 'border-red-400') : 'border-cyan-400'"></div>
          </div>
        </div>

        <!-- Player Car -->
        <div class="absolute bottom-10 w-40 h-24" :style="{
          left: `calc(50% + ${(carX - 1) * 33.33}%)`,
          transform: 'translateX(-50%)'
        }">
          <!-- Car Model (SVG) - Rear View -->
          <div class="relative w-full h-full filter drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]">
            <svg viewBox="0 0 200 100" class="w-full h-full">
              <!-- Rear Tires -->
              <rect x="10" y="60" width="40" height="40" rx="5" fill="#1a1a1a" stroke="#333" stroke-width="2" />
              <rect x="150" y="60" width="40" height="40" rx="5" fill="#1a1a1a" stroke="#333" stroke-width="2" />

              <!-- Main Body (Rear Diffuser Area) -->
              <path d="M30 70 L170 70 L160 95 L40 95 Z" fill="#111" stroke="#db2777" stroke-width="2" />

              <!-- Upper Body -->
              <path d="M40 70 L160 70 L140 40 L60 40 Z" fill="url(#carGradient)" />

              <!-- Spoiler Struts -->
              <rect x="60" y="25" width="10" height="15" fill="#500724" />
              <rect x="130" y="25" width="10" height="15" fill="#500724" />

              <!-- Spoiler Wing -->
              <path d="M10 20 L190 20 L195 30 L5 30 Z" fill="#db2777" stroke="#ff0066" stroke-width="2" />

              <!-- Taillights -->
              <rect x="45" y="50" width="30" height="10" rx="2" fill="#ff0000" class="animate-pulse"
                filter="drop-shadow(0 0 5px #ff0000)" />
              <rect x="125" y="50" width="30" height="10" rx="2" fill="#ff0000" class="animate-pulse"
                filter="drop-shadow(0 0 5px #ff0000)" />

              <!-- License Plate / Center Detail -->
              <rect x="90" y="55" width="20" height="10" fill="#000" stroke="#06b6d4" stroke-width="1" />

              <!-- Gradients -->
              <defs>
                <linearGradient id="carGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#831843" />
                  <stop offset="50%" stop-color="#500724" />
                  <stop offset="100%" stop-color="#831843" />
                </linearGradient>
              </defs>
            </svg>

            <!-- Exhaust Flames (Synchronized) -->
            <div class="absolute bottom-1 left-12 w-6 h-12 bg-cyan-400 rounded-full blur-sm animate-exhaust origin-top">
            </div>
            <div
              class="absolute bottom-1 right-12 w-6 h-12 bg-cyan-400 rounded-full blur-sm animate-exhaust origin-top">
            </div>
          </div>
        </div>

      </div>

      <!-- Controls Overlay (Mobile/Click) -->
      <div class="absolute inset-0 flex z-40">
        <div class="flex-1 hover:bg-white/5 transition-colors cursor-pointer active:bg-white/10" @click="setLane(0)"
          @touchstart.prevent="setLane(0)"></div>
        <div class="flex-1 hover:bg-white/5 transition-colors cursor-pointer active:bg-white/10" @click="setLane(1)"
          @touchstart.prevent="setLane(1)"></div>
        <div class="flex-1 hover:bg-white/5 transition-colors cursor-pointer active:bg-white/10" @click="setLane(2)"
          @touchstart.prevent="setLane(2)"></div>
      </div>

      <!-- Start Screen -->
      <div v-if="!isPlaying && !gameOver"
        class="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div class="text-center animate-float">
          <h1
            class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mb-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            {{ $t('games.neonNumberRacer.title') }}
          </h1>
          <button @click="startGame" @touchstart.prevent="startGame"
            class="bg-cyan-600 hover:bg-cyan-500 text-white text-2xl font-bold py-4 px-12 rounded-none skew-x-[-10deg] border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] transition-all active:scale-95">
            <span class="block skew-x-[10deg]">{{ $t('games.neonNumberRacer.startEngine') }}</span>
          </button>
          <p class="mt-6 text-cyan-300 text-sm uppercase tracking-widest">{{ $t('games.neonNumberRacer.instructions') }}
          </p>
        </div>
      </div>

      <!-- Game Over Screen -->
      <div v-if="gameOver"
        class="absolute inset-0 z-50 flex items-center justify-center bg-red-900/80 backdrop-blur-md">
        <div class="text-center">
          <h2 class="text-5xl font-black text-red-500 mb-4 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]">{{
            $t('games.neonNumberRacer.systemCrash') }}</h2>
          <p class="text-2xl text-white mb-8">{{ $t('games.neonNumberRacer.finalScore', { score }) }}</p>
          <button @click="startGame" @touchstart.prevent="startGame"
            class="bg-white text-red-900 hover:bg-slate-200 text-xl font-bold py-3 px-8 rounded shadow-lg transition-colors active:scale-95">
            {{ $t('games.neonNumberRacer.rebootSystem') }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// Game State
const isPlaying = ref(false)
const gameOver = ref(false)
const score = ref(0)
const speedLevel = ref(1)
const playerLane = ref(1) // Target lane: 0, 1, 2
const carX = ref(1) // Actual interpolated position: 0.0 - 2.0

// Physics
const gates = ref([])
const gameLoopId = ref(null)
const lastTime = ref(0)
const baseSpeed = 800 // pixels per second (Increased from 300)

// Math
const currentProblem = ref({ a: 2, op: '+', b: 2, answer: 4 })

function generateProblemData() {
  const ops = ['+', '-']
  const op = ops[Math.floor(Math.random() * (score.value > 10 ? 2 : 1))] // Introduce subtraction later
  let a, b, answer

  if (op === '+') {
    a = Math.floor(Math.random() * 10) + 1
    b = Math.floor(Math.random() * 10) + 1
    answer = a + b
  } else {
    a = Math.floor(Math.random() * 10) + 5
    b = Math.floor(Math.random() * 5) + 1
    answer = a - b
  }

  return { a, op, b, answer }
}

function spawnGates() {
  const problem = generateProblemData()
  const answer = problem.answer
  const wrong1 = answer + Math.floor(Math.random() * 3) + 1
  const wrong2 = Math.max(0, answer - Math.floor(Math.random() * 3) - 1)

  const values = [answer, wrong1, wrong2].sort(() => Math.random() - 0.5)

  // Create 3 gates for this wave
  // First wave spawns closer (-5000), subsequent waves further (-10000)
  const spawnZ = gates.value.length === 0 ? -5000 : -10000

  for (let i = 0; i < 3; i++) {
    gates.value.push({
      id: Date.now() + i,
      lane: i,
      z: spawnZ,
      value: values[i],
      isCorrect: values[i] === answer,
      passed: false,
      problem: problem // Attach problem to the gate
    })
  }
}

function startGame() {
  isPlaying.value = true
  gameOver.value = false
  score.value = 0
  speedLevel.value = 1
  gates.value = []
  playerLane.value = 1
  carX.value = 1
  lastTime.value = performance.now()
  spawnGates()

  // Set initial problem
  if (gates.value.length > 0) {
    currentProblem.value = gates.value[0].problem
  }

  gameLoopId.value = requestAnimationFrame(gameLoop)
}

function gameLoop(timestamp) {
  if (!isPlaying.value) return

  const dt = timestamp - lastTime.value
  lastTime.value = timestamp

  // Smooth Car Movement
  // Lerp carX towards playerLane
  const lerpSpeed = 0.005 * dt // Slower lerp for smoother, floatier feel
  const diff = playerLane.value - carX.value
  if (Math.abs(diff) > 0.001) {
    carX.value += diff * lerpSpeed
  } else {
    carX.value = playerLane.value
  }

  // Move Gates
  const speed = baseSpeed * (1 + score.value * 0.05)
  speedLevel.value = (1 + score.value * 0.05).toFixed(1)

  gates.value.forEach(gate => {
    gate.z += speed * (dt / 1000)
  })

  // Update HUD Problem
  // Find the nearest active gates (closest Z that hasn't been passed)
  // We sort by Z descending (closest to 0 is highest Z, e.g. -100 > -2000)
  // Actually, we want the set of gates that is closest to the player but NOT passed.
  const activeGates = gates.value.filter(g => !g.passed).sort((a, b) => b.z - a.z)
  if (activeGates.length > 0) {
    // The first one is the closest
    currentProblem.value = activeGates[0].problem
  }

  // Collision Detection & Cleanup
  gates.value = gates.value.filter(gate => {
    if (gate.z > 100) return false // Passed camera

    if (!gate.passed && gate.z > -50) {
      // Check collision based on carX (allow some tolerance)
      // Lane width is 1.0 unit. Car is in lane L if |carX - L| < 0.5
      if (Math.abs(carX.value - gate.lane) < 0.4) {
        if (gate.isCorrect) {
          score.value++
          // Visual feedback could go here
        } else {
          gameOver.value = true
          isPlaying.value = false
        }
        gate.passed = true
      }
    }

    // If we missed the correct gate (it passed us in another lane)
    if (!gate.passed && gate.z > 50 && gate.isCorrect) {
      gameOver.value = true
      isPlaying.value = false
    }

    return true
  })

  // Spawning
  const minZ = gates.value.length ? Math.min(...gates.value.map(g => g.z)) : 0
  if (minZ > -5000) { // Spawn when closest gate is at -5000 (leaving 5000 gap)
    spawnGates()
  }

  if (isPlaying.value) {
    gameLoopId.value = requestAnimationFrame(gameLoop)
  }
}

// Controls
function setLane(lane) {
  if (!isPlaying.value) return
  playerLane.value = lane
}

function handleKeydown(e) {
  if (!isPlaying.value) return
  if (e.key === 'ArrowLeft') {
    if (playerLane.value > 0) playerLane.value--
  }
  if (e.key === 'ArrowRight') {
    if (playerLane.value < 2) playerLane.value++
  }
}

// Visual Helpers
function getOpacity(z) {
  // Fade in from distance
  // -10000 -> 0 opacity
  // -8000 -> 1 opacity
  if (z < -9500) return 0
  if (z > -9500 && z < -8000) return (z + 9500) / 1500
  return 1
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  cancelAnimationFrame(gameLoopId.value)
})
</script>

<style scoped>
.perspective-container {
  perspective: 1000px;
  overflow: hidden;
}

.transform-style-3d {
  transform-style: preserve-3d;
}

.perspective-grid {
  transform: perspective(500px) rotateX(60deg);
  transform-origin: bottom center;
  overflow: hidden;
}

.grid-lines {
  width: 200%;
  height: 200%;
  margin-left: -50%;
  background-image:
    linear-gradient(to right, rgba(6, 182, 212, 0.5) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(168, 85, 247, 0.5) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: grid-move 0.3s linear infinite;
}

@keyframes grid-move {
  0% {
    transform: translateY(0);
  }

  100% {
    transform: translateY(50px);
  }
}

.animate-float {
  animation: float 4s ease-in-out infinite;
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

.animate-exhaust {
  animation: exhaust 0.1s ease-in-out infinite alternate;
}

@keyframes exhaust {
  0% {
    transform: scaleY(1);
    opacity: 0.8;
  }

  100% {
    transform: scaleY(1.5);
    opacity: 0.4;
  }
}
</style>
