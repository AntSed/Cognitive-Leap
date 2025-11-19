<template>
  <div class="game-container" ref="containerRef">
    <canvas ref="canvasRef"></canvas>

    <!-- UI Overlay -->
    <div class="ui-layer">
      <div class="header">
        <h1 class="title">{{ t('equalizer.title') }} <span class="ver">v1.0</span></h1>
        <div class="level-info">{{ t('equalizer.level') }} {{ currentLevel + 1 }}: {{ currentLevelName }}</div>
      </div>

      <!-- Current Equation Status -->
      <div class="equation-display" :class="{ 'solved': isSolved }">
        <div class="eq-slot" :class="{ 'filled': slotAValue !== null }">
          {{ slotAValue !== null ? slotAValue : '?' }}
        </div>
        <div class="eq-op">+</div>
        <div class="eq-slot" :class="{ 'filled': slotBValue !== null }">
          {{ slotBValue !== null ? slotBValue : '?' }}
        </div>
        <div class="eq-eq">=</div>
        <div class="eq-target">{{ targetValue }}</div>
      </div>

      <!-- Controls Hint -->
      <div class="controls-hint" v-if="!isMobile">
        {{ t('equalizer.controls') }}
      </div>

      <!-- Mobile Controls -->
      <div class="mobile-controls" v-if="isMobile">
        <!-- Left: D-Pad -->
        <div class="dpad-cluster">
          <div class="dpad-row">
            <button class="dpad-btn" @touchstart.prevent="handleInput('up')">▲</button>
          </div>
          <div class="dpad-row middle">
            <button class="dpad-btn" @touchstart.prevent="handleInput('left')">◀</button>
            <div class="dpad-spacer"></div>
            <button class="dpad-btn" @touchstart.prevent="handleInput('right')">▶</button>
          </div>
          <div class="dpad-row">
            <button class="dpad-btn" @touchstart.prevent="handleInput('down')">▼</button>
          </div>
        </div>

        <!-- Right: Actions -->
        <div class="action-cluster">
           <button class="action-btn-mob grab-btn" :class="{ 'active': isGrabbing }" @touchstart.prevent="toggleGrab">
             ✋
           </button>
           <button class="action-btn-mob reset-btn" @touchstart.prevent="resetLevel">
             R
           </button>
        </div>
      </div>

      <!-- Victory Modal -->
      <div v-if="gameState === 'won'" class="modal-overlay">
        <div class="modal-content">
          <div class="success-icon">✔</div>
          <h2>{{ t('equalizer.accessGranted') }}</h2>
          <p>{{ t('equalizer.equationBalanced') }}</p>
          <button @click="nextLevel" class="action-btn">
            {{ isLastLevel ? t('equalizer.completed') : t('equalizer.nextLevel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// --- Emits ---
const emit = defineEmits(['completed']);

// --- Config ---
const TILE_SIZE = 64;
const COLORS = {
  bg: '#0b0e14',
  wall: '#2c3e50',
  wallDark: '#1a252f',
  floor: '#151b24',
  floorGrid: '#1e2733',
  slot: '#2a4d69',
  slotActive: '#00d2ff',
  box: '#d35400',
  boxOnSlot: '#27ae60',
  player: '#f1c40f',
  playerGrab: '#e67e22',
  gateClosed: '#c0392b',
  gateOpen: '#2ecc71'
};

// Levels
const LEVELS = [
  {
    nameKey: "equalizer.levels.initiation",
    target: 12,
    map: [
      "#######",
      "#.....#",
      "#.@...#",
      "#.A.B.#",
      "#.....#",
      "###D###",
      "   #   "
    ],
    boxes: [
      { id: 1, val: 3, x: 3, y: 1 },
      { id: 2, val: 8, x: 5, y: 1 },
      { id: 3, val: 4, x: 1, y: 3 },
      { id: 4, val: 5, x: 5, y: 4 }
    ]
  },
  {
    nameKey: "equalizer.levels.theHall",
    target: 15,
    map: [
      "#########",
      "#.......#",
      "#.A...B.#",
      "#.......#",
      "#...#...#",
      "#...@...#",
      "#.......#",
      "####D####"
    ],
    boxes: [
      { id: 1, val: 7, x: 1, y: 1 },
      { id: 2, val: 8, x: 7, y: 1 },
      { id: 3, val: 5, x: 2, y: 5 },
      { id: 4, val: 10, x: 6, y: 5 },
      { id: 5, val: 2, x: 4, y: 4 }
    ]
  },
  {
    nameKey: "equalizer.levels.complexity",
    target: 20,
    map: [
      "###########",
      "#....#....#",
      "#.A.....B.#",
      "#....#....#",
      "###..#..###",
      "#.........#",
      "#....@....#",
      "#.........#",
      "#####D#####"
    ],
    boxes: [
      { id: 1, val: 10, x: 1, y: 1 },
      { id: 2, val: 10, x: 9, y: 1 },
      { id: 3, val: 5, x: 5, y: 5 },
      { id: 4, val: 15, x: 2, y: 7 },
      { id: 5, val: 5, x: 8, y: 7 },
      { id: 6, val: 8, x: 1, y: 5 },
      { id: 7, val: 12, x: 9, y: 5 }
    ]
  },
  {
    nameKey: "equalizer.levels.theGap",
    target: 25,
    map: [
      "###########",
      "#....#....#",
      "#.A.....B.#",
      "#....#....#",
      "###..#..###",
      "#.........#",
      "#....@....#",
      "#.........#",
      "#####D#####"
    ],
    boxes: [
      { id: 1, val: 10, x: 1, y: 1 },
      { id: 2, val: 15, x: 9, y: 1 },
      { id: 3, val: 5, x: 5, y: 5 },
      { id: 4, val: 20, x: 2, y: 7 },
      { id: 5, val: 5, x: 8, y: 7 },
      { id: 6, val: 8, x: 1, y: 5 },
      { id: 7, val: 12, x: 9, y: 5 }
    ]
  },
  {
    nameKey: "equalizer.levels.symmetry",
    target: 30,
    map: [
      "#############",
      "#.....#.....#",
      "#.A.......B.#",
      "#.....#.....#",
      "###...#...###",
      "#.....@.....#",
      "#...........#",
      "######D######"
    ],
    boxes: [
      { id: 1, val: 15, x: 1, y: 1 },
      { id: 2, val: 15, x: 11, y: 1 },
      { id: 3, val: 10, x: 6, y: 4 },
      { id: 4, val: 5, x: 3, y: 6 },
      { id: 5, val: 5, x: 9, y: 6 },
      { id: 6, val: 20, x: 6, y: 2 }
    ]
  },
  {
    nameKey: "equalizer.levels.theVault",
    target: 50,
    map: [
      "#########",
      "#.......#",
      "#.A...B.#",
      "#.......#",
      "#...#...#",
      "#...@...#",
      "#.......#",
      "####D####"
    ],
    boxes: [
      { id: 1, val: 25, x: 1, y: 1 },
      { id: 2, val: 25, x: 7, y: 1 },
      { id: 3, val: 10, x: 2, y: 5 },
      { id: 4, val: 10, x: 6, y: 5 },
      { id: 5, val: 30, x: 4, y: 4 }
    ]
  },
  {
    nameKey: "equalizer.levels.theBridge",
    target: 40,
    map: [
      "###########",
      "#A.......B#",
      "###.###.###",
      "#.........#",
      "#.#######.#",
      "#....@....#",
      "#.........#",
      "#####D#####"
    ],
    boxes: [
      { id: 1, val: 20, x: 1, y: 3 },
      { id: 2, val: 20, x: 9, y: 3 },
      { id: 3, val: 10, x: 5, y: 5 },
      { id: 4, val: 5, x: 3, y: 6 },
      { id: 5, val: 5, x: 7, y: 6 }
    ]
  },
  {
    nameKey: "equalizer.levels.theMaze",
    target: 35,
    map: [
      "#############",
      "#A#.......#B#",
      "#.#.#...#.#.#",
      "#.#.#...#.#.#",
      "#...#.@.#...#",
      "#.###...###.#",
      "#...........#",
      "######D######"
    ],
    boxes: [
      { id: 1, val: 15, x: 3, y: 1 },
      { id: 2, val: 20, x: 9, y: 1 },
      { id: 3, val: 10, x: 6, y: 3 },
      { id: 4, val: 5, x: 2, y: 6 },
      { id: 5, val: 5, x: 10, y: 6 }
    ]
  },
  {
    nameKey: "equalizer.levels.theTwins",
    target: 60,
    map: [
      "###########",
      "#A.......B#",
      "#.#######.#",
      "#.........#",
      "###.###.###",
      "#.........#",
      "#....@....#",
      "#####D#####"
    ],
    boxes: [
      { id: 1, val: 30, x: 1, y: 3 },
      { id: 2, val: 30, x: 9, y: 3 },
      { id: 3, val: 15, x: 2, y: 5 },
      { id: 4, val: 15, x: 8, y: 5 },
      { id: 5, val: 10, x: 5, y: 6 }
    ]
  },
  {
    nameKey: "equalizer.levels.theCore",
    target: 80,
    map: [
      "#############",
      "#.....#.....#",
      "#.A.......B.#",
      "#.....#.....#",
      "###...#...###",
      "#.....@.....#",
      "#...........#",
      "######D######"
    ],
    boxes: [
      { id: 1, val: 40, x: 1, y: 1 },
      { id: 2, val: 40, x: 11, y: 1 },
      { id: 3, val: 20, x: 6, y: 4 },
      { id: 4, val: 10, x: 3, y: 6 },
      { id: 5, val: 10, x: 9, y: 6 },
      { id: 6, val: 50, x: 6, y: 2 }
    ]
  },
  {
    nameKey: "equalizer.levels.theEnd",
    target: 100,
    map: [
      "###############",
      "#......#......#",
      "#.A.........B.#",
      "#......#......#",
      "####...#...####",
      "#......@......#",
      "#.............#",
      "#######D#######"
    ],
    boxes: [
      { id: 1, val: 50, x: 1, y: 1 },
      { id: 2, val: 50, x: 13, y: 1 },
      { id: 3, val: 25, x: 7, y: 4 },
      { id: 4, val: 15, x: 3, y: 6 },
      { id: 5, val: 10, x: 11, y: 6 },
      { id: 6, val: 60, x: 7, y: 2 }
    ]
  }
];

// --- State ---
const containerRef = ref(null);
const canvasRef = ref(null);
const isMobile = ref(false);
const gameState = ref('playing'); // playing, won

// Game State
const currentLevel = ref(0);
const player = ref({ x: 1, y: 1, dir: 1 });
const isGrabbing = ref(false);
const grabbedBox = ref(null); // The box we are currently holding
const boxes = ref([]);
const grid = ref([]); // Parsed map
const slots = ref({ a: null, b: null }); // Coords of slots

// Computed equation state
const slotAValue = computed(() => getBoxValueAt(slots.value.a?.x, slots.value.a?.y));
const slotBValue = computed(() => getBoxValueAt(slots.value.b?.x, slots.value.b?.y));
const isSolved = computed(() => {
  if (slotAValue.value === null || slotBValue.value === null) return false;
  return (slotAValue.value + slotBValue.value) === targetValue.value;
});
const targetValue = ref(0);
const currentLevelName = computed(() => t(LEVELS[currentLevel.value].nameKey));
const isLastLevel = computed(() => currentLevel.value === LEVELS.length - 1);

// Engine
let ctx = null;
let animationFrameId;
let width = 0;
let height = 0;

// --- Logic ---

function initLevel() {
  gameState.value = 'playing';
  grabbedBox.value = null;
  isGrabbing.value = false;
  
  const levelData = LEVELS[currentLevel.value];
  targetValue.value = levelData.target;

  // Parse Map
  grid.value = levelData.map.map((row, y) => row.split('').map((char, x) => {
    if (char === '@') {
      player.value = { x, y, dir: 1, facing: { x: 0, y: 1 } };
      return '.'; // Replace player spawn with floor
    }
    if (char === 'A') {
      slots.value.a = { x, y };
      return 'A';
    }
    if (char === 'B') {
      slots.value.b = { x, y };
      return 'B';
    }
    return char;
  }));

  // Reset Boxes (Deep copy)
  boxes.value = JSON.parse(JSON.stringify(levelData.boxes));
  
  draw();
}

function getTile(x, y) {
  if (y < 0 || y >= grid.value.length || x < 0 || x >= grid.value[0].length) return '#';
  return grid.value[y][x];
}

function getBoxAt(x, y) {
  return boxes.value.find(b => b.x === x && b.y === y);
}

function getBoxValueAt(x, y) {
  const box = getBoxAt(x, y);
  return box ? box.val : null;
}

function handleInput(dir) {
  if (gameState.value === 'won') return;

  let dx = 0, dy = 0;
  if (dir === 'left') dx = -1;
  if (dir === 'right') dx = 1;
  if (dir === 'up') dy = -1;
  if (dir === 'down') dy = 1;
  
  // Save dir for visuals
  if (dx !== 0) player.value.dir = dx;
  if (dx !== 0 || dy !== 0) {
    player.value.facing = { x: dx, y: dy };
  }

  const nextX = player.value.x + dx;
  const nextY = player.value.y + dy;
  const tile = getTile(nextX, nextY);

  // 1. Check Walls / Closed Door
  if (tile === '#') return;
  if (tile === 'D' && !isSolved.value) {
    // Locked door shake effect could go here
    return; 
  }

  // 2. Check Movement
  // Sticky Grab Logic: If grabbing, we try to move the grabbed box WITH us.
  // If NOT grabbing, we check if we are PUSHING a box.

  if (isGrabbing.value && grabbedBox.value) {
    // --- STICKY MOVE ---
    const box = grabbedBox.value;
    
    // Calculate where the box WANTS to go (relative movement)
    const boxNextX = box.x + dx;
    const boxNextY = box.y + dy;
    
    // Check if Player can move
    const playerTile = getTile(nextX, nextY);
    const playerBlockedByWall = playerTile === '#' || playerTile === 'D';
    // Player blocked by OTHER box? (excluding the one we are holding)
    const playerBlockedByBox = boxes.value.some(b => b.id !== box.id && b.x === nextX && b.y === nextY);
    
    // Check if Box can move
    const boxTile = getTile(boxNextX, boxNextY);
    const boxBlockedByWall = boxTile === '#' || boxTile === 'D';
    // Box blocked by OTHER box?
    const boxBlockedByBox = boxes.value.some(b => b.id !== box.id && b.x === boxNextX && b.y === boxNextY);
    
    // Special Case: Player moving INTO Box (Pushing while grabbing)
    // If nextX == box.x && nextY == box.y -> We are pushing it.
    // The box moves to boxNextX.
    // If we are pulling (moving away), box moves to boxNextX.
    // Basically, both just move by (dx, dy).
    
    if (!playerBlockedByWall && !playerBlockedByBox && !boxBlockedByWall && !boxBlockedByBox) {
      // Move Both
      player.value.x = nextX;
      player.value.y = nextY;
      box.x = boxNextX;
      box.y = boxNextY;
    }
    
  } else {
    // --- NORMAL MOVE / PUSH ---
    const box = getBoxAt(nextX, nextY);
    if (box) {
      // Pushing
      const boxNextX = nextX + dx;
      const boxNextY = nextY + dy;
      const nextTile = getTile(boxNextX, boxNextY);
      
      const isBlockedByWall = nextTile === '#' || nextTile === 'D';
      const isBlockedByBox = !!getBoxAt(boxNextX, boxNextY);
      
      if (!isBlockedByWall && !isBlockedByBox) {
        // Push!
        box.x = boxNextX;
        box.y = boxNextY;
        player.value.x = nextX;
        player.value.y = nextY;
      }
    } else {
      // Just Move
      player.value.x = nextX;
      player.value.y = nextY;
    }
  }

  // 3. Check Win Condition
  if (tile === 'D' && isSolved.value) {
    gameState.value = 'won';
  }
  
  // Update Grabbed Box if we just moved next to one and holding shift?
  // Actually, we only grab when Shift is PRESSED. 
  // But if we are holding shift and move next to a box, should we grab it?
  // Let's keep it simple: Auto-grab if holding shift and adjacent? 
  // Or just stick to the "Toggle" logic.
  // If we are grabbing, we hold onto `grabbedBox`.
  // If we release shift, we nullify `grabbedBox`.
  
  draw();
}

function tryGrab() {
  if (!isGrabbing.value) {
    grabbedBox.value = null;
    return;
  }
  
  // Prioritize the box in front of the player
  const facing = player.value.facing || { x: 0, y: 0 };
  const frontX = player.value.x + facing.x;
  const frontY = player.value.y + facing.y;
  
  const frontBox = getBoxAt(frontX, frontY);
  if (frontBox) {
    grabbedBox.value = frontBox;
    return;
  }

  // If nothing in front, check other neighbors (fallback)
  const neighbors = [
    { x: player.value.x + 1, y: player.value.y },
    { x: player.value.x - 1, y: player.value.y },
    { x: player.value.x, y: player.value.y + 1 },
    { x: player.value.x, y: player.value.y - 1 }
  ];
  
  for (const n of neighbors) {
    // Skip the one we already checked (front)
    if (n.x === frontX && n.y === frontY) continue;
    
    const box = getBoxAt(n.x, n.y);
    if (box) {
      grabbedBox.value = box;
      break;
    }
  }
}

function toggleGrab() {
  isGrabbing.value = !isGrabbing.value;
  if (isGrabbing.value) tryGrab();
  else grabbedBox.value = null;
  draw();
}

function nextLevel() {
  if (currentLevel.value < LEVELS.length - 1) {
    currentLevel.value++;
    initLevel();
  } else {
    emit('completed');
    // Loop back to 0 for now, or stay on win screen
    // currentLevel.value = 0;
    // initLevel();
  }
}

function resetLevel() {
  initLevel();
}

// --- Rendering ---

function draw() {
  if (!ctx) return;
  if (!grid.value || grid.value.length === 0) return; 

  // Clear
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  
  // Scale & Center
  const mapWidth = grid.value[0].length * TILE_SIZE;
  const mapHeight = grid.value.length * TILE_SIZE;
  
  const padding = 40;
  const availableWidth = width - padding;
  const availableHeight = height - padding;
  
  const scale = Math.min(1, Math.min(availableWidth / mapWidth, availableHeight / mapHeight));
  
  const offsetX = (width - mapWidth * scale) / 2;
  const offsetY = (height - mapHeight * scale) / 2;
  
  ctx.translate(Math.floor(offsetX), Math.floor(offsetY));
  ctx.scale(scale, scale);

  // 1. Draw Grid (Floor & Walls)
  grid.value.forEach((row, y) => {
    row.forEach((tile, x) => {
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;
      
      if (tile === '#') {
        // Wall
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        
        // Seamless connections
        const neighbors = {
          n: getTile(x, y-1) === '#',
          s: getTile(x, y+1) === '#',
          e: getTile(x+1, y) === '#',
          w: getTile(x-1, y) === '#'
        };
        
        // Darker center if surrounded
        if (neighbors.n && neighbors.s && neighbors.e && neighbors.w) {
           ctx.fillStyle = COLORS.wallDark;
           ctx.fillRect(px+10, py+10, TILE_SIZE-20, TILE_SIZE-20);
        }
        
        // Bevels based on neighbors
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        if (!neighbors.n) ctx.fillRect(px, py, TILE_SIZE, 4); // Top highlight
        
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        if (!neighbors.s) ctx.fillRect(px, py + TILE_SIZE - 4, TILE_SIZE, 4); // Bottom shadow
        if (!neighbors.e) ctx.fillRect(px + TILE_SIZE - 4, py, 4, TILE_SIZE); // Right shadow
        
      } else if (tile === 'D') {
        // Door
        ctx.fillStyle = isSolved.value ? COLORS.gateOpen : COLORS.gateClosed;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        
        // Door Detail
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(px + 10, py, 4, TILE_SIZE);
        ctx.fillRect(px + TILE_SIZE - 14, py, 4, TILE_SIZE);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isSolved.value ? 'OPEN' : 'LOCKED', px + TILE_SIZE/2, py + TILE_SIZE/2);

      } else {
        // Floor
        ctx.fillStyle = COLORS.floor;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        
        // Grid lines
        ctx.strokeStyle = COLORS.floorGrid;
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
        
        // Subtle pattern
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.02)';
          ctx.fillRect(px + 10, py + 10, TILE_SIZE - 20, TILE_SIZE - 20);
        }

        // Slots
        if (tile === 'A' || tile === 'B') {
          const isActive = (tile === 'A' && slotAValue.value !== null) || 
                           (tile === 'B' && slotBValue.value !== null);
                           
          ctx.fillStyle = isActive ? COLORS.slotActive : COLORS.slot;
          ctx.beginPath();
          ctx.arc(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE/3, 0, Math.PI*2);
          ctx.fill();
          
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tile, px + TILE_SIZE/2, py + TILE_SIZE/2);
          
          // Glow if active
          if (isActive) {
             ctx.shadowColor = COLORS.slotActive;
             ctx.shadowBlur = 15;
             ctx.strokeStyle = '#fff';
             ctx.lineWidth = 2;
             ctx.stroke();
             ctx.shadowBlur = 0;
          }
        }
      }
    });
  });

  // 2. Draw Operator between A and B (Visual hack)
  if (slots.value.a && slots.value.b) {
     const midX = (slots.value.a.x + slots.value.b.x) / 2 * TILE_SIZE + TILE_SIZE/2;
     const midY = (slots.value.a.y + slots.value.b.y) / 2 * TILE_SIZE + TILE_SIZE/2;
     
     ctx.fillStyle = '#fff';
     ctx.font = 'bold 30px sans-serif';
     ctx.textAlign = 'center';
     ctx.textBaseline = 'middle';
     // Only draw if they are adjacent horizontally
     if (slots.value.a.y === slots.value.b.y && Math.abs(slots.value.a.x - slots.value.b.x) === 2) {
        ctx.fillText('+', midX, midY);
     }
  }

  // 3. Draw Boxes
  boxes.value.forEach(box => {
    const px = box.x * TILE_SIZE;
    const py = box.y * TILE_SIZE;
    
    // Check if box is on a slot
    const isOnSlot = (box.x === slots.value.a?.x && box.y === slots.value.a?.y) ||
                     (box.x === slots.value.b?.x && box.y === slots.value.b?.y);

    ctx.fillStyle = isOnSlot ? COLORS.boxOnSlot : COLORS.box;
    
    // Box Shape
    const pad = 8;
    ctx.fillRect(px + pad, py + pad, TILE_SIZE - pad*2, TILE_SIZE - pad*2);
    
    // Bevel
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(px + pad, py + pad, TILE_SIZE - pad*2, 4);
    
    // Number
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px "Courier New"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(box.val, px + TILE_SIZE/2, py + TILE_SIZE/2 + 2);
  });

  // 4. Draw Player
  const px = player.value.x * TILE_SIZE;
  const py = player.value.y * TILE_SIZE;
  const cx = px + TILE_SIZE/2;
  const cy = py + TILE_SIZE/2;
  
  ctx.save();
  ctx.translate(cx, cy);

  // Connection Line to Grabbed Box (Draw BEFORE scaling)
  if (isGrabbing.value && grabbedBox.value) {
    const b = grabbedBox.value;
    const bpx = (b.x - player.value.x) * TILE_SIZE;
    const bpy = (b.y - player.value.y) * TILE_SIZE;
    
    ctx.strokeStyle = COLORS.playerGrab;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bpx, bpy);
    ctx.stroke();
  }

  if (player.value.dir === -1) ctx.scale(-1, 1);
  
  // Robot Body
  ctx.fillStyle = isGrabbing.value ? COLORS.playerGrab : COLORS.player;
  ctx.beginPath();
  ctx.arc(0, -5, 18, 0, Math.PI*2);
  ctx.fill();
  
  // Base
  ctx.fillStyle = '#7f8c8d';
  ctx.fillRect(-14, 10, 28, 8);
  // Eye
  ctx.fillStyle = '#333';
  ctx.fillRect(5, -10, 8, 8);
  
  ctx.restore();

  ctx.restore();
}

// --- Setup ---

function handleKeyDown(e) {
  if (['ArrowUp', 'w'].includes(e.key)) handleInput('up');
  if (['ArrowDown', 's'].includes(e.key)) handleInput('down');
  if (['ArrowLeft', 'a'].includes(e.key)) handleInput('left');
  if (['ArrowRight', 'd'].includes(e.key)) handleInput('right');
  if (['r', 'R'].includes(e.key)) resetLevel();
  if (e.key === 'Shift' && !isGrabbing.value) {
    isGrabbing.value = true;
    tryGrab();
    draw();
  }
}

function handleKeyUp(e) {
  if (e.key === 'Shift') {
    isGrabbing.value = false;
    grabbedBox.value = null;
    draw();
  }
}

function resize() {
  if (containerRef.value) {
    width = containerRef.value.clientWidth;
    height = containerRef.value.clientHeight;
    canvasRef.value.width = width;
    canvasRef.value.height = height;
    isMobile.value = width < 768;
    draw();
  }
}

onMounted(() => {
  ctx = canvasRef.value.getContext('2d');
  initLevel(); 
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
  window.removeEventListener('resize', resize);
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;600;700&display=swap');

.game-container {
  width: 100%; height: 100%;
  background: #11151c;
  position: relative;
  font-family: 'Chakra Petch', sans-serif;
  overflow: hidden;
  user-select: none;
}

.ui-layer {
  position: absolute; inset: 0; pointer-events: none;
  display: flex; flex-direction: column; align-items: center;
  padding: 20px;
}

.header { text-align: center; margin-bottom: 20px; color: #fff; }
.title { margin: 0; font-size: 32px; letter-spacing: 4px; color: #3498db; }
.ver { font-size: 12px; color: #666; vertical-align: super; }
.level-info { font-size: 14px; color: #95a5a6; margin-top: 5px; }

/* Equation HUD */
.equation-display {
  background: rgba(20, 20, 30, 0.9);
  border: 2px solid #34495e;
  border-radius: 12px;
  padding: 15px 30px;
  display: flex; align-items: center; gap: 15px;
  transition: all 0.3s;
}

.equation-display.solved {
  border-color: #2ecc71;
  box-shadow: 0 0 20px rgba(46, 204, 113, 0.3);
}

.eq-slot {
  width: 50px; height: 50px;
  border: 2px dashed #555;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; color: #777; font-weight: bold;
  background: rgba(0,0,0,0.3);
}

.eq-slot.filled {
  border-style: solid; border-color: #e67e22;
  color: #fff; background: #d35400;
}

.eq-op, .eq-eq { font-size: 32px; color: #fff; font-weight: bold; }
.eq-target {
  font-size: 42px; color: #2ecc71; font-weight: bold;
  text-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
}

.controls-hint {
  position: absolute; bottom: 20px;
  color: #555; font-size: 14px;
}

/* Mobile Controls */
.mobile-controls {
  position: absolute; bottom: 30px; left: 20px; right: 20px;
  pointer-events: none; /* Let clicks pass through to buttons */
  display: flex; justify-content: space-between; align-items: flex-end;
}

.dpad-cluster {
  pointer-events: auto;
}

.dpad-row { display: flex; justify-content: center; gap: 8px; margin-bottom: 8px; }
.dpad-spacer { width: 60px; }

.dpad-btn {
  width: 60px; height: 60px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px; color: #fff; font-size: 24px;
  backdrop-filter: blur(4px); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  user-select: none;
}
.dpad-btn:active { background: rgba(52, 152, 219, 0.5); }

.action-cluster {
  pointer-events: auto;
  display: flex; flex-direction: column; gap: 15px; align-items: center;
  margin-bottom: 8px;
}

.action-btn-mob {
  width: 70px; height: 70px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(4px); cursor: pointer;
  font-size: 32px; color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}

.grab-btn { background: rgba(230, 126, 34, 0.3); }
.grab-btn.active { background: rgba(230, 126, 34, 0.8); border-color: #fff; }

.reset-btn { 
  width: 50px; height: 50px; font-size: 20px;
  background: rgba(231, 76, 60, 0.3); 
}
.reset-btn:active { background: rgba(231, 76, 60, 0.8); }

/* Win Modal */
.modal-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
  pointer-events: auto; z-index: 10;
}
.modal-content {
  background: #fff; color: #111;
  padding: 40px; border-radius: 16px;
  text-align: center; max-width: 300px;
}
.success-icon {
  font-size: 64px; color: #2ecc71; margin-bottom: 10px;
}
h2 { margin: 0; color: #2c3e50; }
p { color: #7f8c8d; margin-bottom: 25px; }
.action-btn {
  background: #3498db; color: #fff; border: none;
  padding: 12px 24px; border-radius: 6px;
  font-size: 18px; font-weight: bold; cursor: pointer;
}
</style>