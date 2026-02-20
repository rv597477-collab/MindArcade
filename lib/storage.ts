// localStorage wrapper for MindArcade

export interface GameProgress {
  unlockedDifficulty: 'easy' | 'hard' | 'insane';
  levels: {
    easy: LevelProgress[];
    hard: LevelProgress[];
    insane: LevelProgress[];
  };
  bestScore: number;
  totalPlayTime: number;
  lastPlayed: number;
  gamesPlayed: number;
}

export interface LevelProgress {
  completed: boolean;
  stars: number; // 0-3
  bestScore: number;
  unlocked: boolean;
}

export interface PlayerProfile {
  name: string;
  avatar: string;
  totalStars: number;
  totalGamesPlayed: number;
  totalPlayTime: number;
  currentStreak: number;
  lastPlayDate: string;
  achievements: string[];
  createdAt: number;
}

const STORAGE_PREFIX = 'mindarcade_';

function getKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function saveData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getKey(key), JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save data:', e);
  }
}

export function loadData<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(getKey(key));
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function createDefaultLevels(count: number = 5): LevelProgress[] {
  return Array.from({ length: count }, (_, i) => ({
    completed: false,
    stars: 0,
    bestScore: 0,
    unlocked: i === 0,
  }));
}

export function createDefaultGameProgress(): GameProgress {
  return {
    unlockedDifficulty: 'easy',
    levels: {
      easy: createDefaultLevels(5),
      hard: createDefaultLevels(5),
      insane: createDefaultLevels(5),
    },
    bestScore: 0,
    totalPlayTime: 0,
    lastPlayed: 0,
    gamesPlayed: 0,
  };
}

export function getGameProgress(gameSlug: string): GameProgress {
  return loadData(`game_${gameSlug}`, createDefaultGameProgress());
}

export function saveGameProgress(gameSlug: string, progress: GameProgress): void {
  saveData(`game_${gameSlug}`, progress);
}

export function completeLevel(
  gameSlug: string,
  difficulty: 'easy' | 'hard' | 'insane',
  levelIndex: number,
  stars: number,
  score: number
): GameProgress {
  const progress = getGameProgress(gameSlug);
  const level = progress.levels[difficulty][levelIndex];

  level.completed = true;
  level.stars = Math.max(level.stars, stars);
  level.bestScore = Math.max(level.bestScore, score);

  // Unlock next level
  if (levelIndex + 1 < progress.levels[difficulty].length) {
    progress.levels[difficulty][levelIndex + 1].unlocked = true;
  }

  // Check if all levels in difficulty are complete -> unlock next difficulty
  const allComplete = progress.levels[difficulty].every(l => l.completed);
  if (allComplete) {
    if (difficulty === 'easy') {
      progress.unlockedDifficulty = 'hard';
      progress.levels.hard[0].unlocked = true;
    } else if (difficulty === 'hard') {
      progress.unlockedDifficulty = 'insane';
      progress.levels.insane[0].unlocked = true;
    }
  }

  progress.bestScore = Math.max(progress.bestScore, score);
  progress.lastPlayed = Date.now();
  progress.gamesPlayed += 1;

  saveGameProgress(gameSlug, progress);

  // Update profile stats
  updateProfileStats(stars);

  return progress;
}

export function getDefaultProfile(): PlayerProfile {
  const id = Math.floor(Math.random() * 9000) + 1000;
  return {
    name: `Player_${id}`,
    avatar: '🎮',
    totalStars: 0,
    totalGamesPlayed: 0,
    totalPlayTime: 0,
    currentStreak: 0,
    lastPlayDate: '',
    achievements: [],
    createdAt: Date.now(),
  };
}

export function getProfile(): PlayerProfile {
  return loadData('profile', getDefaultProfile());
}

export function saveProfile(profile: PlayerProfile): void {
  saveData('profile', profile);
}

export function updateProfileStats(starsEarned: number): void {
  const profile = getProfile();
  profile.totalStars += starsEarned;
  profile.totalGamesPlayed += 1;

  const today = new Date().toDateString();
  if (profile.lastPlayDate === today) {
    // Same day, streak continues
  } else {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (profile.lastPlayDate === yesterday) {
      profile.currentStreak += 1;
    } else if (profile.lastPlayDate !== today) {
      profile.currentStreak = 1;
    }
  }
  profile.lastPlayDate = today;

  // Check achievements
  const achvs = new Set(profile.achievements);
  if (profile.totalGamesPlayed >= 10) achvs.add('play_10');
  if (profile.totalGamesPlayed >= 50) achvs.add('play_50');
  if (profile.totalGamesPlayed >= 100) achvs.add('play_100');
  if (profile.totalStars >= 10) achvs.add('stars_10');
  if (profile.totalStars >= 50) achvs.add('stars_50');
  if (profile.totalStars >= 100) achvs.add('stars_100');
  if (profile.currentStreak >= 3) achvs.add('streak_3');
  if (profile.currentStreak >= 7) achvs.add('streak_7');
  profile.achievements = Array.from(achvs);

  saveProfile(profile);
}

export function getTotalStarsForGame(gameSlug: string): number {
  const progress = getGameProgress(gameSlug);
  let total = 0;
  for (const diff of ['easy', 'hard', 'insane'] as const) {
    for (const level of progress.levels[diff]) {
      total += level.stars;
    }
  }
  return total;
}

export function getCompletionPercent(gameSlug: string): number {
  const progress = getGameProgress(gameSlug);
  let completed = 0;
  let total = 0;
  for (const diff of ['easy', 'hard', 'insane'] as const) {
    for (const level of progress.levels[diff]) {
      total++;
      if (level.completed) completed++;
    }
  }
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export const ACHIEVEMENTS: Record<string, { name: string; desc: string; icon: string }> = {
  play_10: { name: 'Getting Started', desc: 'Play 10 games', icon: '🎯' },
  play_50: { name: 'Dedicated Gamer', desc: 'Play 50 games', icon: '🏆' },
  play_100: { name: 'Arcade Legend', desc: 'Play 100 games', icon: '👑' },
  stars_10: { name: 'Star Collector', desc: 'Earn 10 stars', icon: '⭐' },
  stars_50: { name: 'Constellation', desc: 'Earn 50 stars', icon: '🌟' },
  stars_100: { name: 'Galaxy Brain', desc: 'Earn 100 stars', icon: '💫' },
  streak_3: { name: 'On Fire', desc: '3 day streak', icon: '🔥' },
  streak_7: { name: 'Unstoppable', desc: '7 day streak', icon: '💥' },
  insane_complete: { name: 'Insanity', desc: 'Complete a game on Insane', icon: '💀' },
};
