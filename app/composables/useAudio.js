// composables/useAudio.js
import { ref, onMounted } from 'vue';
import { Howl } from 'howler';
import * as Tone from 'tone';

// --- 1. Music (Howler) ---
// We keep Howler for the music loop because it's robust 
// and handles fallbacks (OGG -> MP3) automatically.
const music = new Howl({
  src: ['/sounds/music_loop.ogg'],
  loop: true,
  volume: 0.3,
  html5: false,
});
const sfxVolume = new Tone.Volume(-24).toDestination();
// --- 2. SFX (Tone.js) ---
// We create "recipes" for our synths.
// These are created once and shared.
const sfx = {
  start: new Tone.FMSynth({
    harmonicity: 1,
    modulationIndex: 3.5,
    envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
    modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
    }).connect(sfxVolume),
  
  blip: new Tone.MembraneSynth({
    pitchDecay: 0.01,
    octaves: 6,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
  }).connect(sfxVolume),
  
  fire: new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.1, sustain: 0 }
  }).connect(sfxVolume),
  
  hit: new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 3,
    envelope: { attack: 0.001, decay: 0.3, sustain: 0 }
  }).connect(sfxVolume),
  
  error: new Tone.FMSynth({
    harmonicity: 0.5,
    modulationIndex: 8,
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 },
    modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 }
  }).connect(sfxVolume),
  
  gameOver: new Tone.FMSynth({
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
      // Mute the main output for Tone.js
      sfxVolume.mute = sfxMuted;
      
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
    // Mute/unmute the main Tone.js output
    sfxVolume.mute = isSfxMuted.value;
    localStorage.setItem('audioSettings.sfxMuted', isSfxMuted.value.toString());
  };

  /**
   * Play a synthesized sound effect.
   * @param {string} key - The key of the sound to play (e.g., 'fire', 'hit').
   */
  const playSfx = async (key) => {
    await initAudioContext(); // Ensure context is running
    
    if (sfx[key]) {
      // Trigger the synth. This is where you can add dynamics!
      // e.g., sfx[key].triggerAttackRelease(note, duration, time, velocity)
      
      switch (key) {
        case 'start':
          sfx.start.triggerAttackRelease('C4', '8n');
          break;
        case 'blip':
          sfx.blip.triggerAttackRelease('G5', '16n');
          break;
        case 'fire':
          sfx.fire.triggerAttackRelease('0.1');
          break;
        case 'hit':
          sfx.hit.triggerAttackRelease('C2', '8n');
          break;
        case 'error':
          sfx.error.triggerAttackRelease('C#3', '4n');
          break;
        case 'gameOver':
          sfx.gameOver.triggerAttackRelease('C2', '2n');
          break;
      }
    } else {
      console.warn(`[useAudio] SFX key not found: ${key}`);
    }
  };

  const playMusic = async () => {
    await initAudioContext(); // Ensure context is running for Howler too
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