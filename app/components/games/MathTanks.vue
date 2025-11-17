<template>
  <div class="math-tanks-container" ref="gameContainerRef">
    <canvas ref="gameCanvasRef"></canvas>

    <!-- Math Problem UI -->
    <div ref="problemDisplayRef" class="problem-display"></div>

    <!-- UI Overlay -->
    <div class="ui-overlay">
      <div class="mb-2">
        <span>{{ t('mathTanks.health') }}</span>
        <div class="health-bar-container">
          <div ref="healthBarRef" class="health-bar"></div>
        </div>
      </div>
      <div class="mb-2">{{ t('mathTanks.score') }}: <span ref="scoreRef">0</span></div>
    </div>

    <!-- Game Over Screen (hidden by default) -->
    <div ref="gameOverScreenRef" class="game-over-screen hidden">
      <h1 class="text-6xl font-bold text-red-500 mb-4">{{ t('mathTanks.gameOver') }}</h1>
      <h2 v-if="isNewBestTime" class="text-4xl font-bold text-yellow-400 mb-4">Новый рекорд!</h2>
      <h2 class="text-3xl font-semibold mb-2">{{ t('mathTanks.finalScore') }}: <span ref="finalScoreRef">0</span></h2>
      <h2 class="text-2xl font-semibold mb-6">{{ t('mathTanks.survivedFor') }}: <span ref="finalTimeRef">0</span>s</h2>
      <button @click="handleRestart" @touchend.prevent="handleRestart" class="restart-button">
        {{ t('mathTanks.restart') }}
      </button>
    </div>

    <!-- Touch Controls -->
    <div v-if="showJoystick" class="joystick-container">
        <div ref="moveJoystickRef" class="joystick-base">
            <div ref="moveKnobRef" class="joystick-knob"></div>
        </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useI18nService } from '~/composables/useI18nService';

const { t } = useI18nService();
const emit = defineEmits(['completed']);

// Template Refs
const gameContainerRef = ref(null);
const gameCanvasRef = ref(null);
const problemDisplayRef = ref(null);
const healthBarRef = ref(null);
const scoreRef = ref(null);
const gameOverScreenRef = ref(null);
const finalScoreRef = ref(null);
const finalTimeRef = ref(null);

// Touch Controls Refs
const moveJoystickRef = ref(null);
const moveKnobRef = ref(null);

// Game State
let ctx;
let player;
let enemies = [];
let bullets = [];
let particles = [];
let score = 0;
let gameState = 'playing'; // 'playing', 'gameOver'
let fireCooldown = 0;
let enemySpeedMultiplier = 1;
let aimLockTimer = 0;
let gracePeriod = 0; // Invincibility timer for restart
let shootDelayTimer = 0; // Delay for touch-to-shoot
let wantsSingleShot = false; // Flag for tap-to-shoot
let tapTarget = null;
let currentProblem = { text: '', answer: 0 };
let gameStartTime = 0;
let survivalTime = 0;
let animationFrameId;
let mouseHasMoved = false;
let turretAutoRotateDelay = 0; 
let hasCompletedEmit = false;
let bestSurvivalTime = 0;
const isNewBestTime = ref(false);

// Adaptive Controls State
const showJoystick = ref(false);

const keys = {
    w: false, a: false, s: false, d: false
};

const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    isDown: false
};

// Touch State
const touchState = {
    move: { id: null, x: 0, y: 0, dx: 0, dy: 0, active: false },
    shoot: { id: null, x: 0, y: 0, active: false }
};

// --- Helper Classes ---
class Player {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.baseSpeed = 4;
        this.health = 100;
        this.maxHealth = 100;
        this.angle = 0;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#999';
        ctx.fillRect(this.radius - 5, -4, 15, 8);
        ctx.restore();
    }

    update() {
        // Movement
        let dx = 0;
        let dy = 0;
        if (touchState.move.active) {
            dx = touchState.move.dx;
            dy = touchState.move.dy;
        } else {
            if (keys.w) dy -= 1;
            if (keys.s) dy += 1;
            if (keys.a) dx -= 1;
            if (keys.d) dx += 1;
        }

        const magnitude = Math.sqrt(dx * dx + dy * dy);
        const currentSpeed = this.baseSpeed;
        if (magnitude > 0) {
            this.x += (dx / magnitude) * currentSpeed;
            this.y += (dy / magnitude) * currentSpeed;
        }

        // --- New Aiming Logic ---
        const isMoving = magnitude > 0;

        // Priority 1: Tap-to-shoot lock
        if (aimLockTimer > 0 && tapTarget) {
            this.angle = Math.atan2(tapTarget.y - this.y, tapTarget.x - this.x);
        }
        // Priority 2: Active aiming (touch or mouse)
        else if (touchState.shoot.active) {
            this.angle = Math.atan2(touchState.shoot.y - this.y, touchState.shoot.x - this.x);
        } else if (mouse.isDown) {
            this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        }
        // Priority 3: Movement-based aiming (with delay after tap)
        else if (isMoving && turretAutoRotateDelay <= 0) {
            this.angle = Math.atan2(dy, dx);
        }
        // Priority 4: Passive mouse aiming (when not moving)
        else if (mouseHasMoved && !isMoving) {
            this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        }
        // --- End New Aiming Logic ---

        // Clamp to screen edges
        const canvas = gameCanvasRef.value;
        const joystickExclusionHeight = showJoystick.value ? 150 : 0;
        const bottomBoundary = canvas.height - joystickExclusionHeight;

        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(bottomBoundary - this.radius, this.y));

        this.draw();
    }
}

class Enemy {
    constructor(x, y, radius, color, speed, value, isCorrect) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.baseSpeed = speed;
        this.value = value;
        this.isCorrect = isCorrect;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.value, this.x, this.y);
    }

    update() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const currentSpeed = this.baseSpeed;
        this.x += Math.cos(angle) * currentSpeed;
        this.y += Math.sin(angle) * currentSpeed;
        this.draw();
    }
}

class Particle {
    constructor(x, y, radius, color, velocity, fadeSpeed) {
        this.x = x; this.y = y; this.radius = radius; this.color = color;
        this.velocity = velocity; this.fadeSpeed = fadeSpeed; this.alpha = 1;
    }
    draw() {
        ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill(); ctx.restore();
    }
    update() {
        this.x += this.velocity.x; this.y += this.velocity.y;
        this.alpha -= this.fadeSpeed; this.draw();
    }
}

class Bullet {
    constructor(x, y, radius, color, angle, speed) {
        this.x = x; this.y = y; this.startX = x; this.startY = y; this.radius = radius;
        this.color = color; this.speed = speed; this.angle = angle;
        this.distanceTraveled = 0;
    }
    draw() {
        ctx.fillStyle = this.color; ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
    }
    update() {
        const dx = Math.cos(this.angle) * this.speed; const dy = Math.sin(this.angle) * this.speed;
        this.x += dx; this.y += dy; this.distanceTraveled += this.speed; this.draw();
    }
}

// --- Game Functions ---

function initGame() {
    resizeCanvas();
    nextTick(() => {
        const canvas = gameCanvasRef.value;
        if (!canvas) return;
        player = new Player(canvas.width / 2, canvas.height / 2, 15, '#fff');
        enemies = []; bullets = []; particles = []; score = 0;
        gameState = 'playing'; 
        fireCooldown = 0; 
        enemySpeedMultiplier = 1;
        aimLockTimer = 0;
        gracePeriod = 60; 
        shootDelayTimer = 0;
        wantsSingleShot = false;
        tapTarget = null;
        mouseHasMoved = false;
        gameStartTime = Date.now(); survivalTime = 0;
        turretAutoRotateDelay = 0;
        hasCompletedEmit = false;
        isNewBestTime.value = false;
        bestSurvivalTime = Number(localStorage.getItem('mathTanksBestTime')) || 0;

        scoreRef.value.textContent = '0';
        healthBarRef.value.style.width = '100%';
        healthBarRef.value.style.backgroundColor = '#10e060';
        gameOverScreenRef.value.classList.add('hidden');

        if (player) { player.health = player.maxHealth; }
        spawnProblemWave();
    });
}

function resizeCanvas() {
    const canvas = gameCanvasRef.value;
    const container = gameContainerRef.value;
    if (!canvas || !container) return;

    // The container's size is now determined by its parent's CSS.
    // We just need to make the canvas drawing buffer match the container's actual size.
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

function getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1; const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function generateProblem() {
    let num1 = Math.floor(Math.random() * 10) + 1;
    let num2 = Math.floor(Math.random() * 10) + 1;
    const op = ['+', '-', '*'][Math.floor(Math.random() * 3)];

    switch (op) {
        case '+': currentProblem.answer = num1 + num2; break;
        case '-':
            if (num2 > num1) { [num1, num2] = [num2, num1]; }
            currentProblem.answer = num1 - num2; break;
        case '*':
            num1 = Math.floor(Math.random() * 5) + 1;
            num2 = Math.floor(Math.random() * 5) + 1;
            currentProblem.answer = num1 * num2; break;
    }
    currentProblem.text = `${num1} ${op} ${num2}`;
}

function spawnProblemWave() {
    generateProblem();
    problemDisplayRef.value.textContent = currentProblem.text + " = ?";
    enemies = []; bullets = [];
    const numEnemies = 3;
    const correctAnswerIndex = Math.floor(Math.random() * numEnemies);
    let answers = [];

    while (answers.length < numEnemies) {
        if (answers.length === correctAnswerIndex) {
            answers.push(currentProblem.answer);
        } else {
            let distractor = currentProblem.answer + (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? -1 : 1);
            if (distractor < 0) distractor = 0;
            if (distractor !== currentProblem.answer && !answers.includes(distractor)) {
                answers.push(distractor);
            }
        }
    }
    
    const canvas = gameCanvasRef.value;
    for (let i = 0; i < numEnemies; i++) {
        const isCorrect = (i === correctAnswerIndex);
        const value = answers[i];
        const radius = 30;
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
            y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width;
            y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
        }
        const speed = (Math.random() * 1.5 + 0.5) * enemySpeedMultiplier;
        enemies.push(new Enemy(x, y, radius, '#8B0000', speed, value, isCorrect));
    }
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const radius = Math.random() * 2 + 1;
        const velocity = { x: (Math.random() - 0.5) * (Math.random() * 6), y: (Math.random() - 0.5) * (Math.random() * 6) };
        const fadeSpeed = Math.random() * 0.03 + 0.01;
        particles.push(new Particle(x, y, radius, color, velocity, fadeSpeed));
    }
}

function handleFireWeapon() {
    if (fireCooldown > 0) return;
    fireCooldown = 15; 
    const bullet = new Bullet(player.x, player.y, 5, '#00ffff', player.angle, 12);
    bullets.push(bullet);
}

function updateUI() {
    scoreRef.value.textContent = score;
    const healthPercent = (player.health / player.maxHealth) * 100;
    healthBarRef.value.style.width = `${healthPercent}%`;
    if (healthPercent < 30) { healthBarRef.value.style.backgroundColor = '#f04040'; }
    else if (healthPercent < 60) { healthBarRef.value.style.backgroundColor = '#f0e040'; }
    else { healthBarRef.value.style.backgroundColor = '#10e060'; }
}

function endGame() {
    gameState = 'gameOver';
    survivalTime = Math.round((Date.now() - gameStartTime) / 1000);
    
    if (survivalTime > bestSurvivalTime) {
        bestSurvivalTime = survivalTime;
        localStorage.setItem('mathTanksBestTime', bestSurvivalTime);
        isNewBestTime.value = true;
    }

    finalScoreRef.value.textContent = score;
    finalTimeRef.value.textContent = survivalTime;
    gameOverScreenRef.value.classList.remove('hidden');
}

// --- Event Handlers ---
function handleKeyDown(e) {
    if (e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD') {
        if (showJoystick.value) {
            showJoystick.value = false;
        }
        if (e.code === 'KeyW') keys.w = true;
        if (e.code === 'KeyA') keys.a = true;
        if (e.code === 'KeyS') keys.s = true;
        if (e.code === 'KeyD') keys.d = true;
    }
}
function handleKeyUp(e) {
    if (e.code === 'KeyW') keys.w = false; if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false; if (e.code === 'KeyD') keys.d = false;
}
function handleMouseMove(e) {
    mouseHasMoved = true;
    const canvas = gameCanvasRef.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
}
function handleMouseDown(e) { if (gameState === 'playing') { mouse.isDown = true; } }
function handleMouseUp(e) { mouse.isDown = false; }
function handleRestart() { if (gameState === 'gameOver') { initGame(); } }

// --- Touch Handlers ---
function handleTouchStart(e) {
    e.preventDefault();
    if (!showJoystick.value) {
        showJoystick.value = true;
    }
    mouseHasMoved = false;
    
    nextTick(() => {
        const moveJoystick = moveJoystickRef.value;
        if (!moveJoystick) return;
        const moveRect = moveJoystick.getBoundingClientRect();
        const canvas = gameCanvasRef.value;
        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / canvasRect.width;
        const scaleY = canvas.height / canvasRect.height;

        for (const touch of e.changedTouches) {
            const isOnJoystick = getDistance(touch.clientX, touch.clientY, moveRect.left + moveRect.width / 2, moveRect.top + moveRect.height / 2) < moveRect.width;

            if (touchState.move.id === null && isOnJoystick) {
                touchState.move.id = touch.identifier;
                touchState.move.active = true;
                updateJoystick(touch, moveRect);
            } else if (touchState.shoot.id === null) {
                touchState.shoot.id = touch.identifier;
                touchState.shoot.active = true;
                touchState.shoot.x = (touch.clientX - canvasRect.left) * scaleX;
                touchState.shoot.y = (touch.clientY - canvasRect.top) * scaleY;
                shootDelayTimer = 15; // 15 frames = 250ms @ 60fps
            }
        }
    });
}

function handleTouchMove(e) {
    e.preventDefault();
    const moveJoystick = moveJoystickRef.value;
    if (!moveJoystick) return;
    const moveRect = moveJoystick.getBoundingClientRect();
    const canvas = gameCanvasRef.value;
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;

    for (const touch of e.changedTouches) {
        if (touch.identifier === touchState.move.id) {
            updateJoystick(touch, moveRect);
        } else if (touch.identifier === touchState.shoot.id) {
            touchState.shoot.x = (touch.clientX - canvasRect.left) * scaleX;
            touchState.shoot.y = (touch.clientY - canvasRect.top) * scaleY;
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
        if (touch.identifier === touchState.move.id) {
            touchState.move.id = null;
            touchState.move.active = false;
            touchState.move.dx = 0;
            touchState.move.dy = 0;
            // Reset knob to center visually
            if (moveKnobRef.value) {
                moveKnobRef.value.style.left = '50%';
                moveKnobRef.value.style.top = '50%';
            }
        } else if (touch.identifier === touchState.shoot.id) {
            // If the touch was released before the aim delay, it's a "tap".
            // Flag that we want to fire a single shot once the delay is over.
            if (shootDelayTimer > 0) {
                wantsSingleShot = true;
                tapTarget = { x: touchState.shoot.x, y: touchState.shoot.y };
                turretAutoRotateDelay = 30; // Set delay for 0.5 seconds (30 frames)
            }
            touchState.shoot.id = null;
            touchState.shoot.active = false;
        }
    }
}

function updateJoystick(touch, rect) {
    const joyX = rect.left + rect.width / 2;
    const joyY = rect.top + rect.height / 2;
    let dx = touch.clientX - joyX;
    let dy = touch.clientY - joyY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2;

    if (distance > maxDist) {
        dx = (dx / distance) * maxDist;
        dy = (dy / distance) * maxDist;
    }
    
    // Position knob based on percentage, which is more reliable
    const knobX = 50 + (dx / maxDist) * 50;
    const knobY = 50 + (dy / maxDist) * 50;
    if (moveKnobRef.value) {
        moveKnobRef.value.style.left = `${knobX}%`;
        moveKnobRef.value.style.top = `${knobY}%`;
    }

    // Update movement vectors
    if (distance > 0) {
        touchState.move.dx = dx / maxDist;
        touchState.move.dy = dy / maxDist;
    }
}

// --- Main Game Loop ---
const WIN_TIME_SECONDS = 180; // 3 minutes

function update() {
    if (gameState !== 'playing' || !player) return;

    survivalTime = (Date.now() - gameStartTime) / 1000;
    if (!hasCompletedEmit && survivalTime >= WIN_TIME_SECONDS) {
        emit('completed');
        hasCompletedEmit = true;
    }

    if (gracePeriod > 0) gracePeriod--;
    if (fireCooldown > 0) fireCooldown--;
    if (shootDelayTimer > 0) shootDelayTimer--;
    if (aimLockTimer > 0) aimLockTimer--;
    if (turretAutoRotateDelay > 0) turretAutoRotateDelay--;

    player.update();

    // Shooting logic
    if (wantsSingleShot && shootDelayTimer <= 0) {
        handleFireWeapon();
        wantsSingleShot = false;
        aimLockTimer = 30; // Lock aim for 0.5s
    } else if (mouse.isDown) {
        handleFireWeapon();
    } else if (touchState.shoot.active && shootDelayTimer <= 0) {
        handleFireWeapon();
    }

    let waveCleared = false;
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.update();

        const canvas = gameCanvasRef.value;
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
            continue;
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dist = getDistance(bullet.x, bullet.y, enemy.x, enemy.y);
            if (dist < enemy.radius + bullet.radius) {
                if (enemy.isCorrect) {
                    score++;
                    enemySpeedMultiplier += 0.01;
                    createParticles(enemy.x, enemy.y, '#00ff00', 30);
                    spawnProblemWave();
                    waveCleared = true;
                } else {
                    player.health -= 10;
                    createParticles(enemy.x, enemy.y, '#f04040', 20);
                    enemies.splice(j, 1);
                    if (player.health <= 0) { player.health = 0; endGame(); }
                }
                bullets.splice(i, 1);
                break;
            }
        }
        if (waveCleared) { break; }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy) continue;
        enemy.update();
        const dist = getDistance(player.x, player.y, enemy.x, enemy.y);
        if (dist < player.radius + enemy.radius && gracePeriod <= 0) {
            player.health -= 15;
            createParticles(player.x, player.y, '#f00', 5);
            if (player.health <= 0) { player.health = 0; endGame(); }
            if (enemy.isCorrect) { spawnProblemWave(); } else { enemies.splice(i, 1); }
            continue;
        }
    }

    // Enemy separation
    for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
            const enemy1 = enemies[i];
            const enemy2 = enemies[j];
            const dist = getDistance(enemy1.x, enemy1.y, enemy2.x, enemy2.y);
            const min_dist = enemy1.radius + enemy2.radius + 10;
            if (dist < min_dist) {
                const angle = Math.atan2(enemy1.y - enemy2.y, enemy1.x - enemy2.x);
                const overlap = min_dist - dist;
                const pushX = Math.cos(angle) * overlap / 2;
                const pushY = Math.sin(angle) * overlap / 2;
                enemy1.x += pushX;
                enemy1.y += pushY;
                enemy2.x -= pushX;
                enemy2.y -= pushY;
            }
        }
    }

    updateUI();
}

function draw() {
    if (!ctx) return;
    const canvas = gameCanvasRef.value;
    if (!canvas) return;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.alpha <= 0) { particles.splice(i, 1); }
    }
    for (const bullet of bullets) { bullet.draw(); }
    for (const enemy of enemies) { enemy.draw(); }
    if (player) { player.draw(); }
}

function gameLoop() {
    if (gameState !== 'gameOver') { update(); }
    draw();
    if (gameState === 'gameOver') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, gameCanvasRef.value.width, gameCanvasRef.value.height);
    }
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Lifecycle Hooks ---
onMounted(() => {
    // Default to showing joystick on touch-capable devices
    showJoystick.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const canvas = gameCanvasRef.value;
    ctx = canvas.getContext('2d');
    
    initGame();
    gameLoop();

    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    const container = gameContainerRef.value;
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: false });
});

onUnmounted(() => {
    cancelAnimationFrame(animationFrameId);
    gameState = 'gameOver';

    window.removeEventListener('resize', resizeCanvas);
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);

    const container = gameContainerRef.value;
    if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('touchcancel', handleTouchEnd);
    }
});

</script>


<style scoped>
.math-tanks-container {
  font-family: 'Inter', sans-serif;
  background-color: #111;
  color: #fff;
  overflow: hidden;
  margin: 0;
  width: 100%;
  height: 100%;
  position: relative;
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10+ */
  user-select: none;
}

canvas {
  display: block;
  background-color: #1a1a1a;
  cursor: crosshair;
  width: 100%;
  height: 100%;
}

.ui-overlay {
  position: fixed;
  top: 20px;
  left: 20px;
  color: white;
  font-size: 1.25rem;
  font-weight: 600;
  pointer-events: none;
  text-shadow: 0 0 5px rgba(0,0,0,0.5);
  z-index: 5;
  transition: font-size 0.3s ease;
}

.health-bar-container {
  width: 200px;
  height: 20px;
  background-color: #444;
  border-radius: 5px;
  overflow: hidden;
  border: 2px solid #555;
  transition: width 0.3s ease;
}

.health-bar {
  width: 100%;
  height: 100%;
  background-color: #10e060;
  transition: width 0.2s ease-out, background-color 0.5s;
}

.game-over-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.75);
  z-index: 10;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.game-over-screen.hidden {
    display: none;
}

.restart-button {
    padding: 1rem 2rem;
    background-color: #2563eb;
    color: white;
    font-size: 1.25rem;
    font-weight: bold;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    transition: background-color 0.2s;
    cursor: pointer;
    border: none;
}
.restart-button:hover {
    background-color: #1d4ed8;
}
.restart-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.problem-display {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 3rem;
  font-weight: 700;
  color: #f0e040;
  text-shadow: 0 0 10px rgba(0,0,0,0.5);
  z-index: 5;
  transition: font-size 0.3s ease, top 0.3s ease;
}

/* Joystick Styles */
.joystick-container {
    position: absolute;
    bottom: 20px;
    left: 20px;
    width: auto;
    height: auto;
    pointer-events: none;
    z-index: 15;
}

.joystick-base {
    width: 120px;
    height: 120px;
    background-color: rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: auto;
    border: 2px solid rgba(255, 255, 255, 0.2);
}

.joystick-knob {
    width: 60px;
    height: 60px;
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    position: absolute;
    transform: translate(-50%, -50%);
    top: 50%;
    left: 50%;
    /* Let the JS handle the transition for immediate feedback */
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .problem-display {
    font-size: 1.8rem;
    top: 80px;
  }
  .ui-overlay {
    font-size: 1rem;
  }
  .health-bar-container {
    width: 150px;
    height: 18px;
  }
}
</style>