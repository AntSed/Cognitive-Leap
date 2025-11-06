<template>
  <div class="game-container relative" ref="containerRef">
    <div v-if="gameState === 'playing'" class="w-full h-full">
      <canvas ref="gameCanvas" class="w-full h-full"></canvas>

      <div
        class="absolute top-0 left-0 w-full p-4 text-center pointer-events-none"
      >
        <div class="flex justify-between items-center">
          <div class="flex gap-1">
            <svg
              v-for="i in lives"
              :key="'life-' + i"
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="#ef4444"
              style="filter: drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.3))"
            >
              <path
                d="M12 4.248c-3.148-5.402-12-3.825-12 2.942 0 4.661 5.571 9.427 12 15.81 6.43-6.383 12-11.149 12-15.81 0-6.792-8.875-8.306-12-2.942z"
              />
            </svg>
          </div>
          <div
            class="bg-white/30 px-4 py-2 rounded-xl text-2xl font-bold text-shadow"
          >
            {{ score }}
          </div>
        </div>
        <h2 class="text-5xl mt-4 font-black text-shadow text-white">
          {{ currentProblem.question }}
        </h2>
      </div>

      <div
        @click="handleInput('left')"
        class="absolute top-0 left-0 h-full w-1/2 z-10"
      ></div>
      <div
        @click="handleInput('right')"
        class="absolute top-0 right-0 h-full w-1/2 z-10"
      ></div>

      <div
        v-if="screenFlash"
        class="absolute inset-0 transition-opacity duration-300 pointer-events-none"
        :class="{
          'bg-green-500/30': screenFlash === 'green',
          'bg-red-500/30': screenFlash === 'red',
          'opacity-0': !screenFlash,
        }"
      ></div>
    </div>

    <div
      v-if="gameState === 'start'"
      class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4 text-center fade-in"
    >
      <h1 class="text-5xl md:text-6xl font-black mb-4 text-shadow">
        {{ t('mathJump.title') }}
      </h1>
      <p class="text-lg text-gray-200 mb-2">
        {{ t('mathJump.character') }}
      </p>
      <div class="flex items-center justify-center mb-6">
        <canvas
          ref="previewCanvas"
          width="80"
          height="80"
          class="bg-white/20 rounded-lg"
        ></canvas>
      </div>
      <button
        @click="startGame"
        class="btn-3d bg-blue-600 text-white font-bold py-4 px-10 text-2xl border-b-4 border-blue-800"
      >
        {{ t('mathJump.startBtn') }}
      </button>
    </div>

    <div
      v-if="gameState === 'gameOver'"
      class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4 text-center fade-in"
    >
      <h2 class="text-5xl font-black mb-2 text-shadow">
        {{ t('mathJump.gameOverTitle') }}
      </h2>
      <p class="text-2xl mb-4">{{ t('mathJump.yourScore') }}</p>
      <p class="text-7xl font-black text-yellow-300 mb-8 text-shadow">
        {{ score }}
      </p>
      <button
        @click="startGame"
        class="btn-3d bg-green-500 text-white font-bold py-4 px-10 text-2xl border-b-4 border-green-700"
        style="box-shadow: 0 6px 0 #15803d"
      >
        {{ t('mathJump.tryAgainBtn') }}
      </button>
    </div>

    <div
      v-if="gameState === 'win'"
      class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4 text-center fade-in"
    >
      <h2 class="text-5xl font-black mb-2 text-shadow">
        {{ t('mathJump.winTitle') }}
      </h2>
      <p class="text-2xl mb-4">{{ t('mathJump.yourScore') }}</p>
      <p class="text-7xl font-black text-yellow-300 mb-8 text-shadow">
        {{ score }}
      </p>
      <button
        @click="startGame"
        class="btn-3d bg-blue-600 text-white font-bold py-4 px-10 text-2xl border-b-4 border-blue-800"
      >
        {{ t('mathJump.playAgainBtn') }}
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import {
  ref,
  reactive,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'

// --- Types ---

type GameState = 'start' | 'playing' | 'gameOver' | 'win'
type Direction = 'left' | 'right'

interface Platform {
  x: number
  y: number
  width: number
  isBase?: boolean
  answer?: number
  isCorrect?: boolean
  direction?: Direction
}

interface Player {
  x: number
  y: number
  baseWidth: number
  baseHeight: number
  scaleX: number
  scaleY: number
  isJumping: boolean
  startX: number
  startY: number
  targetX: number
  targetY: number
  jumpProgress: number
  isReturning: boolean
  isMovingToCenter: boolean
  // Animation state
  animationTimer: number
  isBlinking: boolean
}

interface Problem {
  question: string
  correctAnswer: number
  incorrectAnswer: number
}

// --- Props & Emits ---

const props = withDefaults(
  defineProps<{
    targetScore?: number
  }>(),
  {
    targetScore: 500,
  }
)

const emit = defineEmits<{
  (e: 'completed'): void
}>()

// --- Composables ---

const { t } = useI18n()

// --- Refs & State ---

const gameState = ref<GameState>('start')
const score = ref(0)
const lives = ref(3)
const cameraY = ref(0)
const currentProblem = reactive<Problem>({
  question: '',
  correctAnswer: 0,
  incorrectAnswer: 0,
})
const screenFlash = ref<'red' | 'green' | null>(null)

const player = reactive<Player>({
  x: 0,
  y: 0,
  baseWidth: 50,
  baseHeight: 50,
  scaleX: 1,
  scaleY: 1,
  isJumping: false,
  startX: 0,
  startY: 0,
  targetX: 0,
  targetY: 0,
  jumpProgress: 0,
  isReturning: false,
  isMovingToCenter: false,
  animationTimer: 0,
  isBlinking: false,
})

const platforms = ref<Platform[]>([])
const containerRef = ref<HTMLElement | null>(null)
const gameCanvas = ref<HTMLCanvasElement | null>(null)
const previewCanvas = ref<HTMLCanvasElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)
const lastTime = ref(0)

// --- Game Settings ---
const PLATFORM_HEIGHT = 180
const PLATFORM_WIDTH = 120
const JUMP_APEX = 100
const JUMP_DURATION = 0.45 // seconds
const PLAYER_Y_OFFSET = -30 // How high player stands above platform
const SQUASH_DURATION = 0.1 // seconds
const STRETCH_DURATION = 0.15 // seconds
let animationFrameId: number | null = null

// --- Game Logic ---
function startGame() {
  score.value = 0
  lives.value = 3
  platforms.value = []
  cameraY.value = 0
  gameState.value = 'playing'
}

function initializeCanvasAndStart() {
  if (
    !gameCanvas.value ||
    !containerRef.value ||
    gameState.value !== 'playing'
  ) {
    return
  }

  const canvas = gameCanvas.value
  ctx.value = canvas.getContext('2d')
  if (!ctx.value) return

  // Логика, которая РАНЬШЕ была в nextTick()
  canvas.width = containerRef.value.clientWidth
  canvas.height = containerRef.value.clientHeight

  const startPlatform: Platform = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: PLATFORM_WIDTH,
    isBase: true,
  }
  platforms.value.push(startPlatform)

  player.x = startPlatform.x
  player.y = startPlatform.y + PLAYER_Y_OFFSET
  player.isJumping = false
  player.isReturning = false
  player.isMovingToCenter = false
  player.scaleX = 1
  player.scaleY = 1

  generateNewProblemAndPlatforms()

  lastTime.value = performance.now()
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  gameLoop()
}

watch(gameCanvas, (newCanvas) => {
  if (newCanvas && gameState.value === 'playing') {
    initializeCanvasAndStart()
  }
})

function gameLoop() {
  if (gameState.value !== 'playing') {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    return
  }

  const currentTime = performance.now()
  const deltaTime = (currentTime - lastTime.value) / 1000
  lastTime.value = currentTime

  update(deltaTime)
  draw()

  animationFrameId = requestAnimationFrame(gameLoop)
}

// --- Update Logic ---

function update(deltaTime: number) {
  if (!ctx.value || !gameCanvas.value) return

  // Update player jump
  if (player.isJumping) {
    player.jumpProgress += deltaTime / JUMP_DURATION
    if (player.jumpProgress >= 1) {
      player.jumpProgress = 1
      player.isJumping = false
      // Land
      player.x = player.targetX
      player.y = player.targetY
      triggerSquashAndStretch('land')
      onJumpComplete()
    } else {
      // Ease out (cubic)
      const easeProgress = 1 - Math.pow(1 - player.jumpProgress, 3)
      player.x = player.startX + (player.targetX - player.startX) * easeProgress
      const verticalProgress =
        player.startY + (player.targetY - player.startY) * easeProgress

      // Parabolic arc (Y is inverted)
      const arc = JUMP_APEX * Math.sin(player.jumpProgress * Math.PI)
      player.y = verticalProgress - arc

      // Flap wings during jump
      player.animationTimer += deltaTime * 20 // Faster flapping
    }
  } else {
    // Animate player scale (squash/stretch) if not jumping
    if (player.scaleX !== 1) {
      player.scaleX += (1 - player.scaleX) * deltaTime * 15 // Snap back
    }
    if (player.scaleY !== 1) {
      player.scaleY += (1 - player.scaleY) * deltaTime * 15 // Snap back
    }

    // Procedural animation (blinking, breathing)
    player.animationTimer += deltaTime
    // Blink every ~3-5 seconds
    if (player.animationTimer % 4 < 0.1) {
      player.isBlinking = true
    } else {
      player.isBlinking = false
    }
  }

  // Camera follows player
  cameraY.value = player.y - gameCanvas.value.height / 2
}

// --- Draw Logic ---

function draw() {
  if (!ctx.value || !gameCanvas.value) return
  const canvas = gameCanvas.value
  const c = ctx.value

  c.clearRect(0, 0, canvas.width, canvas.height)
  c.save()
  c.translate(0, -cameraY.value)

  // Draw Platforms
  platforms.value.forEach((p) => {
    c.fillStyle = p.isBase ? '#68d391' : '#a0aec0'
    c.strokeStyle = '#4a5568'
    c.lineWidth = 4
    c.beginPath()
    // Use canvas's built-in roundRect
    c.roundRect(p.x - p.width / 2, p.y, p.width, 20, [10])
    c.fill()
    c.stroke()

    if (p.answer !== undefined) {
      c.fillStyle = 'white'
      c.font = 'bold 28px Nunito'
      c.textAlign = 'center'
      c.fillText(String(p.answer), p.x, p.y - 20)
    }
  })

  // Draw Player
  drawOwl(c, player.x, player.y, player)

  c.restore()
}

// --- Player Drawing ---

function drawOwl(c: CanvasRenderingContext2D, x: number, y: number, p: Player) {
  c.save()
  c.translate(x, y + 25) // Center point is now feet

  // Squash/Stretch + Breathing
  const breath = p.isJumping ? 1 : 1 + Math.sin(p.animationTimer * 2) * 0.03
  c.scale(p.scaleX, p.scaleY * breath)
  c.translate(0, -p.baseHeight / 2) // Move to center of body

  // Body
  c.fillStyle = '#a0522d' // Brown
  c.beginPath()
  c.moveTo(0, -25)
  c.bezierCurveTo(-30, -25, -30, 15, 0, 25)
  c.bezierCurveTo(30, 15, 30, -25, 0, -25)
  c.fill()

  // Belly
  c.fillStyle = '#f5deb3' // Cream
  c.beginPath()
  c.moveTo(0, 0)
  c.bezierCurveTo(-15, 0, -20, 20, 0, 20)
  c.bezierCurveTo(20, 20, 15, 0, 0, 0)
  c.fill()

  // Wings (Flapping)
  if (p.isJumping) {
    c.fillStyle = '#a0522d'
    const wingAngle = Math.sin(p.animationTimer) * 0.4 // Flap angle
    // Left Wing
    c.save()
    c.translate(-25, 0)
    c.rotate(-wingAngle)
    c.beginPath()
    c.moveTo(0, 0)
    c.quadraticCurveTo(-15, -10, -10, 15)
    c.closePath()
    c.fill()
    c.restore()
    // Right Wing
    c.save()
    c.translate(25, 0)
    c.rotate(wingAngle)
    c.beginPath()
    c.moveTo(0, 0)
    c.quadraticCurveTo(15, -10, 10, 15)
    c.closePath()
    c.fill()
    c.restore()
  }

  // Eyes
  c.fillStyle = 'white'
  c.beginPath()
  c.arc(-10, -5, 10, 0, 2 * Math.PI) // Left eye circle
  c.arc(10, -5, 10, 0, 2 * Math.PI) // Right eye circle
  c.fill()

  if (p.isBlinking) {
    // Draw eyelids
    c.fillStyle = '#a0522d'
    c.beginPath()
    c.arc(-10, -5, 10, 0, Math.PI)
    c.arc(10, -5, 10, 0, Math.PI)
    c.fill()
  } else {
    // Draw pupils
    c.fillStyle = 'black'
    c.beginPath()
    c.arc(-8, -3, 5, 0, 2 * Math.PI) // Left pupil
    c.arc(12, -3, 5, 0, 2 * Math.PI) // Right pupil
    c.fill()
  }

  // Beak
  c.fillStyle = '#ffc107'
  c.beginPath()
  c.moveTo(0, 2)
  c.lineTo(-5, 8)
  c.lineTo(5, 8)
  c.closePath()
  c.fill()

  c.restore()
}

// --- Player Actions ---

function handleInput(direction: Direction) {
  if (player.isJumping || !gameCanvas.value) return

  const targetPlatform = platforms.value.find(
    (p) => p.direction === direction
  )
  if (!targetPlatform) return

  // Trigger "Squash" before jumping
  triggerSquashAndStretch('jump')

  // Set jump parameters after short delay
  setTimeout(() => {
    player.isJumping = true
    player.jumpProgress = 0
    player.startX = player.x
    player.startY = player.y
    player.targetX = targetPlatform.x
    player.targetY = targetPlatform.y + PLAYER_Y_OFFSET
  }, SQUASH_DURATION * 1000)
}

function onJumpComplete() {
  if (player.isReturning) {
    player.isReturning = false
    generateNewProblemAndPlatforms(true) // Retry same problem
    return
  }

  if (player.isMovingToCenter) {
    player.isMovingToCenter = false
    const newBasePlatform = platforms.value.find(
      (p) => p.x === player.targetX
    )
    if (newBasePlatform) {
      newBasePlatform.isBase = true
    }
    platforms.value = [newBasePlatform].filter(Boolean) as Platform[]
    generateNewProblemAndPlatforms()
    return
  }

  const landedPlatform = platforms.value.find((p) => p.x === player.targetX)
  if (!landedPlatform) return

  if (landedPlatform.isCorrect) {
    // --- CORRECT ANSWER ---
    score.value += 10

    // Check for WIN condition
    if (score.value >= props.targetScore) {
      gameState.value = 'win'
      emit('completed')
      return
    }

    // Move to a new center platform
    if (!gameCanvas.value) return // Guard
    const nextCenterPlatform: Platform = {
      x: gameCanvas.value.width / 2,
      y: landedPlatform.y - PLATFORM_HEIGHT / 2,
      width: PLATFORM_WIDTH,
      isBase: false,
    }
    platforms.value = [landedPlatform, nextCenterPlatform]

    player.isMovingToCenter = true
    player.isJumping = true
    player.jumpProgress = 0
    player.startX = player.x
    player.startY = player.y
    player.targetX = nextCenterPlatform.x
    player.targetY = nextCenterPlatform.y + PLAYER_Y_OFFSET
    currentProblem.question = '' // Clear question
  } else {
    // --- WRONG ANSWER ---
    lives.value--
    triggerScreenFlash('red')

    if (lives.value <= 0) {
      gameState.value = 'gameOver'
      return
    }

    // Return to base
    const basePlatform = platforms.value.find((p) => p.isBase)
    const incorrectPlatform = platforms.value.find(
      (p) => !p.isBase && !p.isCorrect
    )
    platforms.value = [basePlatform, incorrectPlatform].filter(
      Boolean
    ) as Platform[]

    if (basePlatform) {
      player.isReturning = true
      player.isJumping = true 
      player.jumpProgress = 0
      player.startX = player.x
      player.startY = player.y
      player.targetX = basePlatform.x
      player.targetY = basePlatform.y + PLAYER_Y_OFFSET
    }
  }
}

function triggerSquashAndStretch(type: 'jump' | 'land') {
  if (type === 'jump') {
    player.scaleX = 1.3
    player.scaleY = 0.7
  } else {
    // 'land'
    player.scaleX = 1.2
    player.scaleY = 0.8
  }

  // Reset scale back to normal
  setTimeout(
    () => {
      player.scaleX = 1
      player.scaleY = 1
    },
    (type === 'jump' ? SQUASH_DURATION : STRETCH_DURATION) * 1000
  )
}

function triggerScreenFlash(color: 'red' | 'green') {
  screenFlash.value = color
  setTimeout(() => {
    screenFlash.value = null
  }, 200)
}

// --- Problem Generation ---

function generateNewProblemAndPlatforms(isRetry = false) {
  if (!gameCanvas.value) return

  if (!isRetry) {
    generateMathProblem()
  }

  const basePlatform = platforms.value.find((p) => p.isBase)
  if (!basePlatform) return

  const correctIsLeft = Math.random() < 0.5

  const leftPlatform: Platform = {
    x: gameCanvas.value.width * 0.25,
    y: basePlatform.y - PLATFORM_HEIGHT,
    width: PLATFORM_WIDTH,
    answer: correctIsLeft
      ? currentProblem.correctAnswer
      : currentProblem.incorrectAnswer,
    isCorrect: correctIsLeft,
    direction: 'left',
  }

  const rightPlatform: Platform = {
    x: gameCanvas.value.width * 0.75,
    y: basePlatform.y - PLATFORM_HEIGHT,
    width: PLATFORM_WIDTH,
    answer: !correctIsLeft
      ? currentProblem.correctAnswer
      : currentProblem.incorrectAnswer,
    isCorrect: !correctIsLeft,
    direction: 'right',
  }

  platforms.value = [basePlatform, leftPlatform, rightPlatform]
}

function generateMathProblem() {
  // Simplified: Only addition
  // Difficulty scales slightly with score
  const level = Math.floor(score.value / 50)
  const maxNum = (level + 1) * 10
  const num1 = Math.floor(Math.random() * maxNum) + 1
  const num2 = Math.floor(Math.random() * maxNum) + 1
  const correctAnswer = num1 + num2

  let incorrectAnswer
  do {
    const offset = Math.floor(Math.random() * 5) + 1
    incorrectAnswer = correctAnswer + (Math.random() < 0.5 ? -offset : offset)
  } while (incorrectAnswer === correctAnswer || incorrectAnswer < 0)

  currentProblem.question = `${num1} + ${num2}`
  currentProblem.correctAnswer = correctAnswer
  currentProblem.incorrectAnswer = incorrectAnswer
}

// --- Preview & Listeners ---

function drawPreview() {
  nextTick(() => {
    if (!previewCanvas.value) return
    const pCtx = previewCanvas.value.getContext('2d')
    if (!pCtx) return
    pCtx.clearRect(0, 0, 80, 80)

    // Draw a static, non-animated owl for the preview
    const staticPlayer: Player = {
      ...player,
      y: 55,
      isBlinking: false,
      animationTimer: 0,
      isJumping: false,
    }
    drawOwl(pCtx, 40, 55, staticPlayer)
  })
}

function keydownHandler(e: KeyboardEvent) {
  if (gameState.value !== 'playing') return
  if (e.key === 'ArrowLeft') handleInput('left')
  else if (e.key === 'ArrowRight') handleInput('right')
}

function resizeHandler() {
  // If we are playing, restart the game to recalibrate canvas
  if (gameState.value === 'playing') {
    // 5. ИЗМЕНЕНО: Вызываем 'initializeCanvasAndStart'
    // для перерисовки и перезапуска логики с новыми размерами
    initializeCanvasAndStart()
  } else {
    // 6. УЛУЧШЕНИЕ: Перерисовываем превью, если мы на стартовом экране
    drawPreview()
  }
}

onMounted(() => {
  window.addEventListener('keydown', keydownHandler)
  window.addEventListener('resize', resizeHandler)
  drawPreview()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', keydownHandler)
  window.removeEventListener('resize', resizeHandler)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style>
.game-container {
  width: 500px; 
  height: 800px; 
  max-width: 100%; 
  max-height: 100%;
  background: linear-gradient(to bottom, #87ceeb 0%, #a0d8ef 50%, #d1ecf9 100%);
  box-shadow: 0 0 20px rgba(135, 206, 235, 0.5);
  overflow: hidden;
  font-family: 'Nunito', sans-serif;
  color: white;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.text-shadow {
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4);
}
.btn-3d {
  transition: all 0.15s ease-in-out;
  border-radius: 1.25rem;
  box-shadow: 0 6px 0 #1e40af;
  transform: translateY(0);
}
.btn-3d:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 0 #1e40af;
}
.btn-3d:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #1e40af;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}
</style>