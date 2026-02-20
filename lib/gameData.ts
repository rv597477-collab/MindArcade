export interface GameInfo {
  slug: string;
  name: string;
  category: 'brain' | 'fun' | 'attractive';
  emoji: string;
  description: string;
  color: string; // neon accent color
}

export const GAMES: GameInfo[] = [
  // Brain Games
  { slug: 'memory-matrix', name: 'Memory Matrix', category: 'brain', emoji: '🧠', description: 'Remember the pattern and reproduce it', color: '#00f0ff' },
  { slug: 'math-rush', name: 'Math Rush', category: 'brain', emoji: '🔢', description: 'Solve math problems before time runs out', color: '#ff00aa' },
  { slug: 'word-scramble', name: 'Word Scramble', category: 'brain', emoji: '📝', description: 'Unscramble jumbled letters to form words', color: '#f0ff00' },
  { slug: 'pattern-logic', name: 'Pattern Logic', category: 'brain', emoji: '🔮', description: 'Find the next item in the sequence', color: '#00ff88' },
  { slug: 'tetris', name: 'Tetris', category: 'brain', emoji: '🟦', description: 'Classic falling blocks puzzle', color: '#00f0ff' },
  { slug: 'pac-man', name: 'Pac-Man', category: 'brain', emoji: '👾', description: 'Navigate the maze and collect dots', color: '#f0ff00' },
  // Fun Games
  { slug: 'snake', name: 'Snake Classic', category: 'fun', emoji: '🐍', description: 'Classic snake with neon visuals', color: '#00ff88' },
  { slug: 'whack-a-mole', name: 'Whack-a-Mole', category: 'fun', emoji: '🔨', description: 'Whack the moles as they pop up', color: '#f0ff00' },
  { slug: 'brick-breaker', name: 'Brick Breaker', category: 'fun', emoji: '🧱', description: 'Break all the bricks with the ball', color: '#ff00aa' },
  { slug: 'reaction-test', name: 'Reaction Test', category: 'fun', emoji: '⚡', description: 'Test your reaction speed', color: '#00f0ff' },
  { slug: 'flappy-bird', name: 'Flappy Bird', category: 'fun', emoji: '🐦', description: 'Navigate through pipes in this addictive flapper', color: '#f0ff00' },
  { slug: 'pong-classic', name: 'Pong Classic', category: 'fun', emoji: '🏓', description: 'Classic pong - beat the AI opponent', color: '#00f0ff' },
  { slug: 'space-invaders', name: 'Space Invaders', category: 'fun', emoji: '👽', description: 'Defend Earth from alien invaders', color: '#00ff88' },
  { slug: 'doodle-jump', name: 'Doodle Jump', category: 'fun', emoji: '🦘', description: 'Jump your way to the top', color: '#ff00aa' },
  // Attractive Games
  { slug: 'color-match', name: 'Color Match', category: 'attractive', emoji: '🎨', description: 'Match colors in this Stroop test', color: '#ff00aa' },
  { slug: 'bubble-pop', name: 'Bubble Pop', category: 'attractive', emoji: '🫧', description: 'Pop bubbles in the right order', color: '#00f0ff' },
  { slug: 'maze-runner', name: 'Maze Runner', category: 'attractive', emoji: '🌀', description: 'Navigate through glowing mazes', color: '#00ff88' },
  { slug: 'tile-slide', name: 'Tile Slide', category: 'attractive', emoji: '🧩', description: 'Slide tiles to solve the puzzle', color: '#f0ff00' },
];

export const CATEGORIES = [
  { id: 'brain', label: '🧠 Brain Games', color: '#00f0ff' },
  { id: 'fun', label: '🎮 Fun Games', color: '#ff00aa' },
  { id: 'attractive', label: '✨ Attractive Games', color: '#f0ff00' },
] as const;

export function getGameBySlug(slug: string): GameInfo | undefined {
  return GAMES.find(g => g.slug === slug);
}

export function getGamesByCategory(category: string): GameInfo[] {
  if (category === 'all') return GAMES;
  return GAMES.filter(g => g.category === category);
}

export const DIFFICULTY_LABELS = {
  easy: { label: 'Easy', icon: '🟢', color: '#00ff88' },
  hard: { label: 'Hard', icon: '🔴', color: '#ff4444' },
  insane: { label: 'Insane', icon: '💀', color: '#ff00aa' },
} as const;
