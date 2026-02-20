'use client';

import { use } from 'react';
import { getGameBySlug } from '@/lib/gameData';
import GameShell from '@/components/GameShell';
import MemoryMatrix from '@/games/MemoryMatrix';
import MathRush from '@/games/MathRush';
import WordScramble from '@/games/WordScramble';
import PatternLogic from '@/games/PatternLogic';
import SnakeGame from '@/games/SnakeGame';
import WhackAMole from '@/games/WhackAMole';
import BrickBreaker from '@/games/BrickBreaker';
import ReactionTest from '@/games/ReactionTest';
import ColorMatch from '@/games/ColorMatch';
import BubblePop from '@/games/BubblePop';
import MazeRunner from '@/games/MazeRunner';
import TileSlide from '@/games/TileSlide';
import FlappyBird from '@/games/FlappyBird';
import PongClassic from '@/games/PongClassic';
import Tetris from '@/games/Tetris';
import SpaceInvaders from '@/games/SpaceInvaders';
import PacMan from '@/games/PacMan';
import DoodleJump from '@/games/DoodleJump';
import Link from 'next/link';

const GAME_COMPONENTS: Record<string, React.ComponentType<{
  difficulty: 'easy' | 'hard' | 'insane';
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}>> = {
  'memory-matrix': MemoryMatrix,
  'math-rush': MathRush,
  'word-scramble': WordScramble,
  'pattern-logic': PatternLogic,
  'snake': SnakeGame,
  'whack-a-mole': WhackAMole,
  'brick-breaker': BrickBreaker,
  'reaction-test': ReactionTest,
  'color-match': ColorMatch,
  'bubble-pop': BubblePop,
  'maze-runner': MazeRunner,
  'tile-slide': TileSlide,
  'flappy-bird': FlappyBird,
  'pong-classic': PongClassic,
  'tetris': Tetris,
  'space-invaders': SpaceInvaders,
  'pac-man': PacMan,
  'doodle-jump': DoodleJump,
};

export default function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const game = getGameBySlug(slug);
  const GameComponent = GAME_COMPONENTS[slug];

  if (!game || !GameComponent) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🕹️</div>
        <h1 style={{ fontFamily: 'Orbitron', fontSize: 24, color: '#ff00aa', marginBottom: 8 }}>Game Not Found</h1>
        <p style={{ color: '#8888aa', marginBottom: 24 }}>The game you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="btn-neon" style={{ textDecoration: 'none' }}>Back to Home</Link>
      </div>
    );
  }

  return (
    <GameShell
      slug={game.slug}
      name={game.name}
      emoji={game.emoji}
      renderGame={(props) => <GameComponent {...props} />}
    />
  );
}
