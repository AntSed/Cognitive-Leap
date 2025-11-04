<template>
  <div class="w-full max-w-lg mx-auto bg-amber-300 rounded-lg border-4 border-amber-800 relative overflow-hidden">
    
    <div 
      ref="stageContainer" 
      class="overflow-hidden bg-[#4a2c2a]"
      style="height: 80vh;"
    >
      <v-stage :config="stageConfig" ref="stageRef">
        
        <v-layer ref="mainLayerRef" :config="mainLayerConfig">
          
          <v-group
            v-for="block in blocks"
            :key="block.id"
            :config="getBlockConfig(block)"
            @dragstart="onBlockDragStart(block.id)"
            @dragmove="onBlockDragMove"
            @dragend="onBlockDragEnd"
          >
            <v-rect :config="{ 
              width: block.size, 
              height: block.size, 
              fill: '#BDB76B', 
              x: BLOCK_3D_OFFSET, 
              y: BLOCK_3D_OFFSET 
            }" />
            <v-rect :config="{ 
              width: block.size, 
              height: block.size, 
              fill: '#F0E68C' 
            }" />
            <v-text :config="{
              text: block.content,
              fontSize: block.size / 2.5,
              fontFamily: 'Cinzel',
              fill: '#5D4037',
              width: block.size,
              height: block.size,
              align: 'center',
              verticalAlign: 'middle',
              fontStyle: 'bold'
            }" />
          </v-group>
          
          <v-sprite
            v-if="princessImage"
            :config="princessSpriteConfig"
            ref="princessSpriteRef"
          />

        </v-layer>
        
        <v-layer v-if="gameEnded">
           <v-rect :config="{ 
             width: stageConfig.width, 
             height: stageConfig.height, 
             fill: 'rgba(0, 0, 0, 0.75)' 
           }" />
           <v-text :config="{
             text: 'Tomb Sealed!',
             fontSize: 48,
             fontFamily: 'Cinzel',
             fill: 'white',
             width: stageConfig.width,
             align: 'center',
             y: stageConfig.height / 2 - 60,
             fontStyle: 'bold'
           }" />
           <v-text :config="{
             text: `Your final score: ${score}`,
             fontSize: 24,
             fontFamily: 'Cinzel',
             fill: 'white',
             width: stageConfig.width,
             align: 'center',
             y: stageSize.height / 2
           }" />
        </v-layer>

      </v-stage>
    </div>

    <div 
      v-if="isPlaying && !gameEnded" 
      class="absolute top-0 left-0 w-full p-4 pointer-events-none"
      style="font-family: 'Cinzel', serif;"
    >
      <div class="text-2xl font-bold text-white" style="text-shadow: 2px 2px #000000a0;">
        Score: <span class="text-green-300">{{ score }}</span>
      </div>
    </div>

    <div class="absolute bottom-6 left-0 w-full text-center">
      <button
        v-if="!isPlaying"
        @click="onStartClick"
        class="bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-lg text-xl shadow-lg transform hover:scale-105 transition-transform duration-200 border-2 border-amber-900"
        style="font-family: 'Cinzel', serif;"
      >
        {{ gameEnded ? 'Play Again?' : 'Start Game' }}
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'

import { 
  useGlyphRise, 
  BLOCK_3D_OFFSET, 
  CLEAR_ANIMATION_DURATION 
} from '~/composables/useGlyphRise'

// --- Stage Sizing ---
const stageContainer = ref(null)
const stageRef = ref(null) 
const { width, height } = useElementSize(stageContainer)

const stageSize = computed(() => ({
  width: width.value > 0 ? width.value : 400, 
  height: height.value > 0 ? height.value : 600,
}))

const stageConfig = computed(() => ({
  width: stageSize.value.width,
  height: stageSize.value.height,
}))

// --- Game Loop Management ---
let gameLoop: Konva.Animation | null = null

// --- Game Logic ---
const {
  score,
  isPlaying,
  gameEnded,
  blocks,
  princess,
  layerY,
  draggedBlock,
  // No longer need blockSize/blockSpacing here
  startGame,
  endGame,
  updateGame,
  handleDragStart,
  handleDragMove, // <-- Now imported
  handleDragEnd,
} = useGlyphRise(stageSize)

// --- Layer Config ---
const mainLayerRef = ref(null) 
const mainLayerConfig = computed(() => ({
  y: -layerY.value
}))

// --- Block Config ---
/**
 * Gets the config for a block.
 * ALWAYS binds to the reactive state (block.x, block.y)
 * to ensure vue-konva has a single source of truth.
 */
function getBlockConfig(block: any) { // block is implicitly GameBlock
  const config: any = {
    x: block.x,
    y: block.y,
    draggable: isPlaying.value && !gameEnded.value && !block.isClearing && !block.targetY,
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  }

  // Handle the 'clearing' animation
  if (block.isClearing) {
    const elapsedTime = Date.now() - block.clearStartTime
    const progress = Math.min(elapsedTime / CLEAR_ANIMATION_DURATION, 1)
    
    config.opacity = 1 - progress
    config.scaleX = 1 - progress
    config.scaleY = 1 - progress
    config.offsetX = block.size / 2
    config.offsetY = block.size / 2
    config.x = block.x + block.size / 2
    config.y = block.y + block.size / 2
  }
  
  return config
}

// --- Princess Sprite Logic ---
const princessImage = ref<HTMLImageElement | null>(null)
const princessSpriteRef = ref(null)

const princessAnimations = {
  'happy_idle': [384, 128, 64, 64, 448, 128, 64, 64, 512, 128, 64, 64],
  'scared_idle': [384, 192, 64, 64, 448, 192, 64, 64, 512, 192, 64, 64],
  'gameover': [384, 384, 64, 64, 448, 384, 64, 64, 512, 384, 64, 64]
}

const princessSpriteConfig = computed(() => ({
  x: princess.x,
  y: princess.y,
  width: princess.width,
  height: princess.height,
  image: princessImage.value,
  animations: princessAnimations,
  animation: princess.animation,
  frameRate: 5,
  frameIndex: 0
}))

onMounted(() => {
  const img = new Image()
  img.onload = () => {
    princessImage.value = img
  }
  img.src = 'https://previews.cognitiveleap.app/assets/pixel_princess_sideviewactor_rmmv.png'
})

// Controls the *sprite* animation (play/pause)
watch(isPlaying, (playing) => {
  const sprite = (princessSpriteRef.value as any)?.getStage()
  if (!sprite) return
  
  if (playing) {
    sprite.start()
  } else {
    sprite.stop()
  }
})

// Stops the main *game loop* when the game ends
watch(gameEnded, (hasEnded) => {
  if (hasEnded && gameLoop) {
    gameLoop.stop()
  }
})

// --- Event Handlers ---

function onStartClick() {
  if (mainLayerRef.value) {
    const konvaLayer = (mainLayerRef.value as any).getNode()
    
    startGame()

    if (gameLoop) gameLoop.stop()

    gameLoop = new (window as any).Konva.Animation(() => {
      updateGame()
    }, konvaLayer) 

    gameLoop.start()
  }
}

function onBlockDragStart(blockId: string) {
  handleDragStart(blockId)
}

/**
 * The "bridge" between imperative drag and reactive state.
 * 1. Reads raw drag position.
 * 2. Tells composable to update state (which clamps X).
 * 3. Forces the node's position to match the new state.
 */
function onBlockDragMove(e: KonvaEventObject<DragEvent>) {
  if (!draggedBlock.value) return

  // 1. Get raw X position from the drag event
  const newX = e.target.x()

  // 2. Pass to composable to clamp and update state
  handleDragMove(newX)

  // 3. Imperatively force the node's position
  //    to match the (now clamped) state and lock Y.
  e.target.y(draggedBlock.value.originalY)
  e.target.x(draggedBlock.value.x)
}

/**
 * Tells the composable to finalize the drag and swap blocks.
 */
function onBlockDragEnd(e: KonvaEventObject<DragEvent>) {
  // Composable already has the final X, just tell it to swap.
  handleDragEnd()
  
  // After handleDragEnd, the reactive state (block.x) is updated
  // by the swap logic. The :config binding
  // will automatically snap the node to its new final home.
}

</script>

<style scoped>
/* Global font style for the component */
.game-title, p, div, button {
  font-family: 'Cinzel', serif;
}
</style>