<template>
  <div class="starfield-background">
    <div class="shooting-star"></div>
    <div class="shooting-star"></div>
    <div class="shooting-star"></div>
    <div class="shooting-star"></div>
  </div>
</template>

<style scoped>
@keyframes shooting-star-anim {
  0% {
    transform: translate(var(--start-x), var(--start-y)) scale(0);
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--end-x), var(--end-y)) scale(1);
    opacity: 0;
  }
}

.starfield-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
  overflow: hidden;
}

.shooting-star {
  position: absolute;
  height: 2px;
  background: linear-gradient(-45deg, #90e0ef, rgba(0, 0, 255, 0));
  border-radius: 999px;
  filter: drop-shadow(0 0 6px #69b3ff);
  animation: shooting-star-anim 3s ease-in-out infinite;
}

/* Pre-defined animations for variety */
.shooting-star:nth-child(1) {
  --start-x: -20vw; --start-y: 10vh;
  --end-x: 80vw; --end-y: 40vh;
  top: 0; left: 0; width: 100px; animation-delay: 0s;
}
.shooting-star:nth-child(2) {
  --start-x: 20vw; --start-y: 0vh;
  --end-x: 100vw; --end-y: 20vh;
  top: 0; left: 0; width: 150px; animation-delay: 1s;
}
.shooting-star:nth-child(3) {
  --start-x: -10vw; --start-y: 80vh;
  --end-x: 60vw; --end-y: 20vh;
  top: 0; left: 0; width: 80px; animation-delay: 2.5s;
}
.shooting-star:nth-child(4) {
  --start-x: 100vw; --start-y: 50vh;
  --end-x: -20vw; --end-y: 60vh;
  top: 0; left: 0; width: 120px; animation-delay: 0.5s;
}
</style>
