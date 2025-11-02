// composables/useAudio.js
import { ref, onMounted } from 'vue';
import { Howl } from 'howler';
import * as Tone from 'tone';

// --- 1. Music (Howler) ---
const music = new Howl({
  src: ['/sounds/music_loop.ogg'],
  loop: true,
  // ИЗМЕНЕНИЕ 1: Громкость музыки чуть выше
  volume: 0.5, 
  html5: false,
});

// ИЗМЕНЕНИЕ 2: Громкость SFX ЗНАЧИТЕЛЬНО выше (-8dB вместо -24dB)
const sfxVolume = new Tone.Volume(-15).toDestination();

// --- 2. SFX (Tone.js) ---

// ИЗМЕНЕНИЕ 3: Новые "рецепты" для SFX

const sfx = {
  start: new Tone.FMSynth({ // (Без изменений)
    harmonicity: 1,
    modulationIndex: 3.5,
    envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
    modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
  }).connect(sfxVolume),
  
  blip: new Tone.FMSynth({ // (Без изменений)
    harmonicity: 0.5,
    modulationIndex: 1.5,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
  }).connect(sfxVolume),
  
  // ИЗМЕНЕНИЕ 1: Рецепт 'fire'
  fire: new Tone.Synth({
        volume: -12,
    oscillator: { type: 'triangle' },
    // Главное: sustain: 1 (вместо 0)
    envelope: { attack: 0.001, decay: 0.01, sustain: 1, release: 0.3 } 
  }).connect(sfxVolume),
  
  // ИЗМЕНЕНИЕ 2: Рецепт 'hit_thud'
  hit_thud: new Tone.MembraneSynth({
    volume: -4,
    pitchDecay: 0.05,
    octaves: 2,
    // Увеличиваем затухание (decay) до 0.5 сек
    envelope: { attack: 0.001, decay: 1, sustain: 0, release: 0.4 }
  }).connect(sfxVolume),
  
  // ИЗМЕНЕНИЕ 3: Рецепт 'hit_noise'
  hit_noise: new Tone.NoiseSynth({
    volume: -8,
    noise: { type: 'white' },
    // Увеличиваем затухание (decay) до 0.4 сек
    envelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 0.3 }
  }).connect(sfxVolume),
  
  error: new Tone.FMSynth({ // (Без изменений)
    harmonicity: 0.5,
    modulationIndex: 8,
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 },
    modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 }
  }).connect(sfxVolume),
  
  gameOver: new Tone.FMSynth({ // (Без изменений)
    harmonicity: 0.5,
    modulationIndex: 10,
    envelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.1 },
    modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.1 }
  }).connect(sfxVolume),
};

// --- State References ---
const isMusicMuted = ref(false);
const isSfxMuted = ref(false);
const hasInitialized = ref(false);

export const useAudio = () => {
  
  const initAudioContext = async () => {
    if (Tone.context.state !== 'running') {
      await Tone.start();
      console.log('AudioContext (Tone.js) started!');
    }
  };

  onMounted(() => {
    if (!hasInitialized.value) {
      const musicMuted = localStorage.getItem('audioSettings.musicMuted') === 'true';
      const sfxMuted = localStorage.getItem('audioSettings.sfxMuted') === 'true';
      
      isMusicMuted.value = musicMuted;
      isSfxMuted.value = sfxMuted;
      
      music.mute(musicMuted);
      sfxVolume.mute = sfxMuted; // Mute the main output for Tone.js
      
      hasInitialized.value = true;
    }
  });

  // --- Control Functions ---
  const toggleMusicMute = () => {
    isMusicMuted.value = !isMusicMuted.value;
    music.mute(isMusicMuted.value);
    localStorage.setItem('audioSettings.musicMuted', isMusicMuted.value.toString());
    isMusicMuted.value ? stopMusic() : playMusic();
  };

  const toggleSfxMute = () => {
    isSfxMuted.value = !isSfxMuted.value;
    sfxVolume.mute = isSfxMuted.value; // Mute/unmute the main Tone.js output
    localStorage.setItem('audioSettings.sfxMuted', isSfxMuted.value.toString());
  };

  /**
   * Play a synthesized sound effect.
   * @param {string} key - The key of the sound to play (e.g., 'fire', 'hit').
   */
 const playSfx = async (key) => {
    await initAudioContext(); // Ensure context is running
    
    const now = Tone.now(); 
    
    switch (key) {
      case 'start':
        sfx.start.triggerAttackRelease('C6', '16n', now);
        break;
        
      case 'blip':
        sfx.blip.triggerAttackRelease('G5', '16n', now);
        break;
        
      // ИЗМЕНЕНИЕ 4: Триггер 'fire'
      case 'fire':
        const fireDuration = 0.4; // Длительность "пиу"
        
        // 1. (ВАЖНО) Сбрасываем detune на 0 перед атакой
        sfx.fire.detune.setValueAtTime(0, now);
        // 2. Атака (начинаем высоко)
        sfx.fire.triggerAttack('C4', now); 
        // 3. Глиссандо: "съезжаем" на 2 октавы (-2400 центов)
        sfx.fire.detune.rampTo(-2400, fireDuration, now);
        // 4. Релиз (отпускаем ноту)
        sfx.fire.triggerRelease(now + fireDuration);
        break;
        
      // ИЗМЕНЕНИЕ 5: Триггер 'hit'
      case 'hit':
        // "Бум" на полной громкости (velocity: 1.0)
        sfx.hit_thud.triggerAttackRelease('C2', '2n', now, 1.0);
        // "Шшш" чуть тише (velocity: 0.7)
        sfx.hit_noise.triggerAttackRelease('0.4', now, 0.4);
        break;
        
      case 'error':
        sfx.error.triggerAttackRelease('C#3', '8n', now);
        sfx.error.triggerAttackRelease('C3', '8n', now + 0.1);
        break;
        
      case 'gameOver':
        sfx.gameOver.triggerAttackRelease('C2', '2n', now);
        break;
        
      default:
        console.warn(`[useAudio] SFX key not found: ${key}`);
    }
  };

  const playMusic = async () => {
    await initAudioContext();
    if (!music.playing()) {
      music.play();
    }
  };

  const stopMusic = () => {
    music.stop();
  };

  return {
    isMusicMuted,
    isSfxMuted,
    toggleMusicMute,
    toggleSfxMute,
    playSfx,
    playMusic,
    stopMusic,
  };
};