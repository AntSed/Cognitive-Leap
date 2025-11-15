// composables/useAudio.js
import { ref, onMounted } from 'vue';
import { Howl } from 'howler';
import * as Tone from 'tone';

// --- 1. Music (Howler) ---
const music = new Howl({
  src: ['/sounds/music_loop.ogg'],
  loop: true,
  // Music volume slightly higher.
  volume: 0.5, 
  html5: false,
});

// SFX volume significantly higher.
const sfxVolume = new Tone.Volume(-15).toDestination();

// --- 2. SFX (Tone.js) ---

// New SFX recipes.
const sfx = {
  start: new Tone.FMSynth({ // No changes.
    harmonicity: 1,
    modulationIndex: 3.5,
    envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
    modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
  }).connect(sfxVolume),
  
  blip: new Tone.FMSynth({ // No changes.
    harmonicity: 0.5,
    modulationIndex: 1.5,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
  }).connect(sfxVolume),
  
  // 'fire' recipe.
  fire: new Tone.Synth({
        volume: -12,
    oscillator: { type: 'triangle' },
    // Main: sustain: 1 (instead of 0).
    envelope: { attack: 0.001, decay: 0.01, sustain: 1, release: 0.3 } 
  }).connect(sfxVolume),
  
  // 'hit_thud' recipe.
  hit_thud: new Tone.MembraneSynth({
    volume: -4,
    pitchDecay: 0.05,
    octaves: 2,
    // Increase decay to 0.5 sec.
    envelope: { attack: 0.001, decay: 1, sustain: 0, release: 0.4 }
  }).connect(sfxVolume),
  
  // 'hit_noise' recipe.
  hit_noise: new Tone.NoiseSynth({
    volume: -8,
    noise: { type: 'white' },
    // Increase decay to 0.4 sec.
    envelope: { attack: 0.001, decay: 0.8, sustain: 0, release: 0.3 }
  }).connect(sfxVolume),
  
  error: new Tone.FMSynth({ // No changes.
    harmonicity: 0.5,
    modulationIndex: 8,
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 },
    modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 }
  }).connect(sfxVolume),
  
  gameOver: new Tone.FMSynth({ // No changes.
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
        
      // 'fire' trigger.
      case 'fire':
        const fireDuration = 0.4; // Duration of the sound.
        
        // 1. (IMPORTANT) Reset detune to 0 before attack.
        sfx.fire.detune.setValueAtTime(0, now);
        // 2. Attack (start high).
        sfx.fire.triggerAttack('C4', now); 
        // 3. Glissando: "slide down" 2 octaves (-2400 cents).
        sfx.fire.detune.rampTo(-2400, fireDuration, now);
        // 4. Release (release note).
        sfx.fire.triggerRelease(now + fireDuration);
        break;
        
      // 'hit' trigger.
      case 'hit':
        // "Boom" at full volume (velocity: 1.0).
        sfx.hit_thud.triggerAttackRelease('C2', '2n', now, 1.0);
        // "Shhh" a little quieter (velocity: 0.7).
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