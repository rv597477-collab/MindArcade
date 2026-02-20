'use client';

let audioCtx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('mindarcade_muted') === 'true';
}

export function setMuted(m: boolean): void {
  muted = m;
  if (typeof window !== 'undefined') {
    localStorage.setItem('mindarcade_muted', m ? 'true' : 'false');
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', vol: number = 0.15) {
  if (muted || isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playClick() {
  playTone(800, 0.08, 'square', 0.08);
}

export function playSuccess() {
  const ctx = getCtx();
  if (!ctx || muted || isMuted()) return;
  playTone(523, 0.15, 'sine', 0.12);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 100);
  setTimeout(() => playTone(784, 0.25, 'sine', 0.12), 200);
}

export function playFailure() {
  playTone(200, 0.3, 'sawtooth', 0.1);
}

export function playLevelComplete() {
  const ctx = getCtx();
  if (!ctx || muted || isMuted()) return;
  const notes = [523, 587, 659, 784, 880, 1047];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.2, 'sine', 0.1), i * 80);
  });
}

export function playStarEarn() {
  playTone(1200, 0.15, 'sine', 0.1);
  setTimeout(() => playTone(1500, 0.2, 'sine', 0.1), 100);
}

export function playPop() {
  playTone(600, 0.06, 'sine', 0.1);
}

// Background Music System
let currentMusic: { oscillators: OscillatorNode[]; gainNode: GainNode; interval: ReturnType<typeof setInterval> } | null = null;

export function stopBackgroundMusic() {
  if (currentMusic) {
    currentMusic.oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator may already be stopped
      }
    });
    clearInterval(currentMusic.interval);
    currentMusic = null;
  }
}

// Game-specific background music patterns
const MUSIC_PATTERNS: Record<string, { notes: number[][]; tempo: number; waveform: OscillatorType }> = {
  'flappy-bird': {
    notes: [[659, 784], [587, 698], [523, 659], [587, 698]],
    tempo: 400,
    waveform: 'square',
  },
  'pong-classic': {
    notes: [[440, 554], [440, 554], [392, 494], [440, 554]],
    tempo: 600,
    waveform: 'triangle',
  },
  'tetris': {
    notes: [[659, 523], [587, 494], [523, 440], [587, 494], [659, 523], [784, 587], [880, 659], [784, 587]],
    tempo: 300,
    waveform: 'square',
  },
  'space-invaders': {
    notes: [[220, 165], [247, 185], [220, 165], [196, 147]],
    tempo: 500,
    waveform: 'square',
  },
  'pac-man': {
    notes: [[523, 392], [587, 440], [659, 494], [698, 523], [784, 587], [880, 659]],
    tempo: 250,
    waveform: 'sine',
  },
  'doodle-jump': {
    notes: [[880, 659], [784, 587], [698, 523], [659, 494], [587, 440]],
    tempo: 350,
    waveform: 'triangle',
  },
  'snake': {
    notes: [[440, 330], [494, 370], [523, 392], [494, 370]],
    tempo: 450,
    waveform: 'square',
  },
  'brick-breaker': {
    notes: [[784, 587], [880, 659], [988, 740], [880, 659]],
    tempo: 400,
    waveform: 'sine',
  },
  'memory-matrix': {
    notes: [[523, 392], [659, 494], [784, 587], [659, 494]],
    tempo: 500,
    waveform: 'sine',
  },
  default: {
    notes: [[523, 392], [587, 440], [659, 494], [587, 440]],
    tempo: 450,
    waveform: 'sine',
  },
};

export function playBackgroundMusic(gameSlug: string) {
  if (muted || isMuted()) return;

  stopBackgroundMusic();

  const ctx = getCtx();
  if (!ctx) return;

  const pattern = MUSIC_PATTERNS[gameSlug] || MUSIC_PATTERNS.default;
  let noteIndex = 0;

  const playPattern = () => {
    if (muted || isMuted()) {
      stopBackgroundMusic();
      return;
    }

    const notes = pattern.notes[noteIndex];
    noteIndex = (noteIndex + 1) % pattern.notes.length;

    const oscillators: OscillatorNode[] = [];
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.03; // Very quiet background music
    gainNode.connect(ctx.destination);

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = pattern.waveform;
      osc.frequency.value = freq;
      osc.connect(gainNode);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + pattern.tempo / 1000 * 0.8);
      oscillators.push(osc);
    });

    if (currentMusic) {
      currentMusic.oscillators = oscillators;
      currentMusic.gainNode = gainNode;
    }
  };

  // Start the pattern
  playPattern();
  const interval = setInterval(playPattern, pattern.tempo);

  currentMusic = {
    oscillators: [],
    gainNode: ctx.createGain(),
    interval,
  };
}

// Enhanced sound effects for specific game actions
export function playGameSound(sound: 'jump' | 'bounce' | 'collect' | 'hit' | 'shoot' | 'powerup') {
  if (muted || isMuted()) return;

  switch (sound) {
    case 'jump':
      playTone(400, 0.1, 'square', 0.15);
      setTimeout(() => playTone(600, 0.1, 'square', 0.1), 50);
      break;
    case 'bounce':
      playTone(300, 0.08, 'sine', 0.12);
      break;
    case 'collect':
      playTone(800, 0.05, 'sine', 0.1);
      setTimeout(() => playTone(1000, 0.05, 'sine', 0.08), 40);
      break;
    case 'hit':
      playTone(150, 0.15, 'sawtooth', 0.15);
      break;
    case 'shoot':
      playTone(200, 0.05, 'square', 0.1);
      setTimeout(() => playTone(100, 0.05, 'square', 0.08), 30);
      break;
    case 'powerup':
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => {
        setTimeout(() => playTone(n, 0.1, 'sine', 0.08), i * 50);
      });
      break;
  }
}
