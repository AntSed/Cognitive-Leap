// app/composables/useGlyphRise.ts
import { ref, reactive, computed } from 'vue'
import type { Ref } from 'vue'
import { nanoid } from 'nanoid'

// --- Game Configuration ---
export const BLOCKS_PER_ROW = 5
const BLOCK_SPEED = 0.5
const GRAVITY_SPEED = 2.5
const SPAWN_BUFFER_ROWS = 5
export const BLOCK_3D_OFFSET = 8
export const CLEAR_ANIMATION_DURATION = 400

// --- Types ---
interface GameBlock {
  id: string
  x: number
  y: number
  size: number
  content: string
  isClearing: boolean
  clearStartTime: number
  originalX: number
  originalY: number
  targetY?: number
}

interface Princess {
  x: number
  y: number
  width: number
  height: number
  animation: 'happy_idle' | 'scared_idle' | 'gameover'
}

interface StageSize {
  width: number
  height: number
}

// --- Static Helper Functions (Pure) ---

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle(a: any[]): any[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateEquation(): string[] {
  const operators = ['+', '-', '*']
  const operator = operators[getRandomInt(0, operators.length - 1)]!
  let num1, num2, answer

  switch (operator) {
    case '+': 
      num1 = getRandomInt(1, 9)
      num2 = getRandomInt(1, 9)
      answer = num1 + num2
      break
    case '-': 
      num1 = getRandomInt(5, 10)
      num2 = getRandomInt(1, num1 - 1)
      answer = num1 - num2
      break
    case '*': 
      num1 = getRandomInt(1, 5)
      num2 = getRandomInt(1, 5)
      answer = num1 * num2
      break
  }
  return [String(num1), operator, String(num2), '=', String(answer)]
}

function isValidEquation(parts: string[]): boolean {
  if (parts.length !== BLOCKS_PER_ROW) return false

  const eqIndex = parts.indexOf('=')
  let expected: number | undefined

  if (eqIndex === 3) {
    const n1 = parseInt(parts[0])
    const op = parts[1]
    const n2 = parseInt(parts[2])
    const ans = parseInt(parts[4])
    if (isNaN(n1) || isNaN(n2) || isNaN(ans)) return false
    
    if (op === '+') expected = n1 + n2
    else if (op === '-') expected = n1 - n2
    else if (op === '*') expected = n1 * n2
    
    return expected === ans

  } else if (eqIndex === 1) {
    const ans = parseInt(parts[0])
    const n1 = parseInt(parts[2])
    const op = parts[3]
    const n2 = parseInt(parts[4])
    if (isNaN(n1) || isNaN(n2) || isNaN(ans)) return false
    
    if (op === '+') expected = n1 + n2
    else if (op === '-') expected = n1 - n2
    else if (op === '*') expected = n1 * n2
    
    return expected === ans
  }

  return false
}


// --- The Composable ---

export function useGlyphRise(stageSize: Ref<StageSize>) {
  
  // --- Game State ---
  const score = ref(0)
  const isPlaying = ref(false)
  const gameEnded = ref(false)
  const blocks = reactive<GameBlock[]>([])
  const draggedBlock = ref<GameBlock | null>(null)
  const layerY = ref(0)
  const currentSpawnY = ref(0)

  const princess = reactive<Princess>({
    x: 0,
    y: 0,
    width: 64,
    height: 64,
    animation: 'happy_idle',
  })

  // --- Computed Properties (Integer Grid) ---
  const blockSize = computed(() => {
    return Math.floor(
      (stageSize.value.width / BLOCKS_PER_ROW) - (BLOCK_3D_OFFSET / BLOCKS_PER_ROW)
    )
  })

  const blockSpacing = computed(() => {
    return Math.floor(
      (stageSize.value.width - (blockSize.value * BLOCKS_PER_ROW)) / (BLOCKS_PER_ROW + 1)
    )
  })
  
  const rowHeight = computed(() => {
    return Math.floor(blockSize.value + (BLOCK_3D_OFFSET / 2))
  })

  // --- Private Game Logic ---

  function spawnWave() {
    if (blockSize.value <= 0) return

    const y = currentSpawnY.value
    const size = blockSize.value
    const spacing = blockSpacing.value
    
    let components: string[] = generateEquation()
    shuffle(components)
    
    for (let i = 0; i < BLOCKS_PER_ROW; i++) {
      const x = (i * (size + spacing)) + spacing
      blocks.push({
        id: nanoid(5),
        x: x,
        y: y,
        size: size,
        content: components[i],
        isClearing: false,
        clearStartTime: 0,
        originalX: x,
        originalY: y,
      })
    }
    
    currentSpawnY.value += rowHeight.value
  }
  
  function applyGravity(clearedRowYCoords: Set<number>) {
    if (clearedRowYCoords.size === 0) return

    const sortedClearedRows = Array.from(clearedRowYCoords).sort((a, b) => a - b)
    
    blocks.forEach(block => {
      if (block.isClearing || block.targetY) {
        return
      }

      const blockY = block.y
      const rowsToDrop = sortedClearedRows.filter(clearedY => clearedY > blockY).length
      
      if (rowsToDrop > 0) {
        block.targetY = block.y + (rowsToDrop * rowHeight.value)
      }
    })
  }
  
  function checkAndClearRows() {
    const rows: { [key: string]: GameBlock[] } = {}
    
    blocks.forEach(block => {
      if (block.isClearing || block.targetY || block.id === draggedBlock.value?.id) {
        return
      }
      const yKey = String(block.y)
      if (!rows[yKey]) rows[yKey] = []
      rows[yKey].push(block)
    })
    
    const clearedRowYCoords = new Set<number>()
    
    for (const yKey in rows) {
      const row = rows[yKey]
      
      if (row.length === BLOCKS_PER_ROW) {
        row.sort((a, b) => a.x - b.x)
        const parts = row.map(b => b.content)
        
        if (isValidEquation(parts)) {
          row.forEach(block => {
            block.isClearing = true
            block.clearStartTime = Date.now()
          })
          
          clearedRowYCoords.add(Number(yKey))
          score.value++
        }
      }
    }
    
    if (clearedRowYCoords.size > 0) {
      applyGravity(clearedRowYCoords)
    }
  }

  function applyBlockGravity() {
    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i]
      
      if (block.isClearing || block.id === draggedBlock.value?.id) {
        continue
      }
      
      if (block.targetY && block.y < block.targetY) {
        block.y += GRAVITY_SPEED
        
        if (block.y >= block.targetY) {
          block.y = block.targetY
          delete block.targetY
          block.originalY = block.y 
          
          checkAndClearRows()
        }
      }
    }
  }

  function removeClearedBlocks() {
    const now = Date.now()
    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i]
      if (block.isClearing && now - block.clearStartTime > CLEAR_ANIMATION_DURATION) {
        blocks.splice(i, 1)
      }
    }
  }

  function updatePrincess() {
    const nonMovingBlocks = blocks.filter(b => !b.isClearing && !b.targetY)
    
    let highestBlockY: number
    let highestBlockX: number
    let highestBlockSize: number
    
    if (nonMovingBlocks.length > 0) {
      const highestBlock = nonMovingBlocks.reduce((prev, curr) => (prev.y < curr.y ? prev : curr))
      highestBlockY = highestBlock.y
      highestBlockX = highestBlock.x
      highestBlockSize = highestBlock.size
    } else {
      highestBlockY = 0 
      highestBlockX = stageSize.value.width / 2
      highestBlockSize = 0
    }

    princess.y = highestBlockY - princess.height
    princess.x = highestBlockX + (highestBlockSize / 2) - (princess.width / 2)

    const princessScreenY = princess.y - layerY.value
    const screenHeight = stageSize.value.height

    if (gameEnded.value) {
      princess.animation = 'gameover'
    } else if (princessScreenY < screenHeight * (1 / 16)) {
      princess.animation = 'gameover'
    } else if (princessScreenY < screenHeight * (1 / 2)) {
      princess.animation = 'scared_idle'
    } else {
      princess.animation = 'happy_idle'
    }
    }

  function checkGameOver() {
    if (gameEnded.value) return

    const activeBlocks = blocks.filter(b => !b.isClearing)
    if (activeBlocks.length === 0) {
      return
    }

    const highestBlock = activeBlocks.reduce((prev, curr) => (prev.y < curr.y ? prev : curr))
    const highestBlockScreenY = highestBlock.y - layerY.value
    
    if (highestBlockScreenY < 0) {
      endGame()
    }
  }

  function updateCamera() {
    layerY.value += BLOCK_SPEED
  }

  function updateSpawner() {
    const cameraBottom = layerY.value + stageSize.value.height
    const spawnBuffer = SPAWN_BUFFER_ROWS * rowHeight.value
    
    if (cameraBottom > (currentSpawnY.value - spawnBuffer)) {
      spawnWave()
    }
  }

  function updateGame() {
    if (!isPlaying.value) return

    updateCamera()
    removeClearedBlocks()
    applyBlockGravity()
    updatePrincess()
    updateSpawner()
    checkGameOver()
  }


  // --- Public API ---

  function startGame() { 
    if (stageSize.value.height === 0 || rowHeight.value === 0) {
      setTimeout(startGame, 100)
      return
    }

    score.value = 0
    isPlaying.value = true
    gameEnded.value = false
    blocks.length = 0
    currentSpawnY.value = 0
    layerY.value = -stageSize.value.height 
    
    const initialRows = Math.ceil(stageSize.value.height / rowHeight.value) + SPAWN_BUFFER_ROWS
    for (let i = 0; i < initialRows; i++) {
      spawnWave()
    }

    princess.y = 0 - princess.height
    princess.x = (stageSize.value.width / 2) - (princess.width / 2)
  }

  function endGame() {
    isPlaying.value = false
    gameEnded.value = true
  }

  // --- Drag & Drop Handlers ---
  
  function handleDragStart(blockId: string) {
    const block = blocks.find(b => b.id === blockId)
    if (!block || block.isClearing || block.targetY) return
    
    draggedBlock.value = block
    block.originalX = block.x
  }

  /**
   * Called continuously by the component's @dragmove event.
   * Clamps the X position and updates the state.
   */
  function handleDragMove(newX: number) {
    if (!draggedBlock.value) return

    // Calculate horizontal boundaries
    const minX = blockSpacing.value
    const maxX = ((BLOCKS_PER_ROW - 1) * (blockSize.value + blockSpacing.value)) + blockSpacing.value
    
    // Clamp the x position
    const clampedX = Math.max(minX, Math.min(newX, maxX))
    
    // Update the reactive state
    draggedBlock.value.x = clampedX
  }
  
  /**
   * Handles the "drop" logic. Uses the state (block.x)
   * which was updated by handleDragMove.
   */
  function handleDragEnd() {
    const block = draggedBlock.value
    if (!block) return
    draggedBlock.value = null
    
    // Use the final, clamped X position from the state
    const blockCenterX = block.x + block.size / 2
    const rowY = block.originalY

    const rowPeers = blocks.filter(b => 
      b.id !== block.id &&
      !b.isClearing &&
      b.y === rowY
    )

    if (rowPeers.length === 0) {
      block.x = block.originalX
      return
    }

    let closestBlock: GameBlock = rowPeers[0]
    let minDistance = Infinity

    for (const peer of rowPeers) {
      const targetCenterX = peer.x + peer.size / 2
      const distance = Math.abs(blockCenterX - targetCenterX)
      
      if (distance < minDistance) {
        minDistance = distance
        closestBlock = peer
      }
    }
    
    const targetBlock = closestBlock

    if (targetBlock) {
      const tempX = block.originalX
      block.x = targetBlock.originalX 
      targetBlock.x = tempX
      
      block.originalX = block.x
      targetBlock.originalX = targetBlock.x
      
      checkAndClearRows()
      
    } else {
      block.x = block.originalX
    }
    
    updatePrincess()
  }

  // --- Return Public API ---
  return {
    // State
    score,
    isPlaying,
    gameEnded,
    blocks,
    princess,
    layerY,
    draggedBlock,

    // Computed
    blockSize,
    blockSpacing,

    // Methods
    startGame,
    endGame,
    updateGame,
    handleDragStart,
    handleDragMove, // <-- New function added
    handleDragEnd,
  }
}