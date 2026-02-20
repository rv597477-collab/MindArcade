'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { playClick, playSuccess, playFailure, playPop } from '@/lib/sound';

type Difficulty = 'easy' | 'hard' | 'insane';

interface FlappyBirdProps {
  difficulty: Difficulty;
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

const FlappyBird: React.FC<FlappyBirdProps> = ({ difficulty, level, onComplete, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const [score, setScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 600 });

  // Game configuration based on difficulty
  const getConfig = () => {
    switch (difficulty) {
      case 'easy':
        return { gravity: 0.4, jumpStrength: -8, pipeGap: 200, pipeSpeed: 2, targetScore: 5 + level * 2 };
      case 'hard':
        return { gravity: 0.5, jumpStrength: -9, pipeGap: 160, pipeSpeed: 3, targetScore: 8 + level * 3 };
      case 'insane':
        return { gravity: 0.6, jumpStrength: -10, pipeGap: 130, pipeSpeed: 4, targetScore: 10 + level * 4 };
      default:
        return { gravity: 0.4, jumpStrength: -8, pipeGap: 200, pipeSpeed: 2, targetScore: 5 };
    }
  };

  const config = getConfig();

  // Game state refs
  const birdRef = useRef({ y: 250, velocity: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const gameStateRef = useRef<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const scoreRef = useRef(0);
  const frameCountRef = useRef(0);
  const birdRotationRef = useRef(0);

  const BIRD_X = 80;
  const BIRD_SIZE = 30;
  const PIPE_WIDTH = 60;

  // Handle canvas resize
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const width = Math.min(container.clientWidth - 32, 400);
        const height = Math.min(window.innerHeight - 200, 600);
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Initialize game
  const initializeGame = useCallback(() => {
    birdRef.current = { y: canvasSize.height / 2, velocity: 0 };
    pipesRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    frameCountRef.current = 0;
    gameStateRef.current = 'playing';
    setGameState('playing');
    spawnFood();
  }, [canvasSize, config]);

  const spawnFood = () => {
    const gapY = Math.random() * (canvasSize.height - config.pipeGap - 100) + 50;
    pipesRef.current.push({ x: canvasSize.width, gapY, passed: false });
  };

  // Handle jump
  const jump = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      birdRef.current.velocity = config.jumpStrength;
      playPop();
    }
  }, [config]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameStateRef.current === 'playing') {
          jump();
        } else if (gameStateRef.current === 'gameOver') {
          initializeGame();
        }
      } else if (e.code === 'Escape') {
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump, initializeGame, onBack]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      if (gameStateRef.current !== 'playing') return;

      frameCountRef.current++;

      // Update bird physics
      birdRef.current.velocity += config.gravity;
      birdRef.current.y += birdRef.current.velocity;
      birdRotationRef.current = Math.min(Math.max(birdRef.current.velocity * 3, -30), 90);

      // Check boundaries
      if (birdRef.current.y < 0 || birdRef.current.y > canvasSize.height - BIRD_SIZE) {
        gameOver();
        return;
      }

      // Spawn new pipes
      if (frameCountRef.current % 90 === 0) {
        spawnFood();
      }

      // Update pipes
      pipesRef.current = pipesRef.current.filter(pipe => pipe.x > -PIPE_WIDTH);
      pipesRef.current.forEach(pipe => {
        pipe.x -= config.pipeSpeed;

        // Check collision
        if (
          BIRD_X + BIRD_SIZE > pipe.x &&
          BIRD_X < pipe.x + PIPE_WIDTH &&
          (birdRef.current.y < pipe.gapY || birdRef.current.y + BIRD_SIZE > pipe.gapY + config.pipeGap)
        ) {
          gameOver();
          return;
        }

        // Score when passing pipe
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true;
          scoreRef.current++;
          setScore(scoreRef.current);
          playSuccess();

          if (scoreRef.current >= config.targetScore) {
            winGame();
          }
        }
      });
    };

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw starfield background
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 50; i++) {
        const x = (i * 73) % canvasSize.width;
        const y = (i * 97) % canvasSize.height;
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;

      // Draw pipes
      pipesRef.current.forEach(pipe => {
        // Top pipe
        const gradient1 = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
        gradient1.addColorStop(0, '#00f0ff');
        gradient1.addColorStop(1, '#00ff88');
        ctx.fillStyle = gradient1;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f0ff';
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
        ctx.shadowBlur = 0;

        // Bottom pipe
        const gradient2 = ctx.createLinearGradient(pipe.x, pipe.gapY + config.pipeGap, pipe.x + PIPE_WIDTH, canvasSize.height);
        gradient2.addColorStop(0, '#ff00aa');
        gradient2.addColorStop(1, '#f0ff00');
        ctx.fillStyle = gradient2;
        ctx.fillRect(pipe.x, pipe.gapY + config.pipeGap, PIPE_WIDTH, canvasSize.height - (pipe.gapY + config.pipeGap));
        ctx.strokeStyle = '#ff00aa';
        ctx.lineWidth = 3;
        ctx.strokeRect(pipe.x, pipe.gapY + config.pipeGap, PIPE_WIDTH, canvasSize.height - (pipe.gapY + config.pipeGap));
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff00aa';
        ctx.strokeRect(pipe.x, pipe.gapY + config.pipeGap, PIPE_WIDTH, canvasSize.height - (pipe.gapY + config.pipeGap));
        ctx.shadowBlur = 0;
      });

      // Draw bird
      ctx.save();
      ctx.translate(BIRD_X + BIRD_SIZE / 2, birdRef.current.y + BIRD_SIZE / 2);
      ctx.rotate((birdRotationRef.current * Math.PI) / 180);

      // Bird body (circle)
      const birdGradient = ctx.createRadialGradient(0, 0, 5, 0, 0, BIRD_SIZE / 2);
      birdGradient.addColorStop(0, '#f0ff00');
      birdGradient.addColorStop(1, '#ff00aa');
      ctx.fillStyle = birdGradient;
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f0ff00';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#f0ff00';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Bird wing
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.ellipse(-5, 0, 8, 12, (Math.sin(frameCountRef.current / 5) * Math.PI) / 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Draw score
      ctx.font = 'bold 48px Orbitron, sans-serif';
      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f0ff';
      ctx.fillText(`${scoreRef.current}/${config.targetScore}`, canvasSize.width / 2, 60);
      ctx.shadowBlur = 0;
    };

    const gameLoop = () => {
      update();
      render();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    const gameOver = () => {
      gameStateRef.current = 'gameOver';
      setGameState('gameOver');
      playFailure();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      onComplete(scoreRef.current, config.targetScore);
    };

    const winGame = () => {
      gameStateRef.current = 'won';
      setGameState('won');
      playSuccess();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      onComplete(config.targetScore, config.targetScore);
    };

    initializeGame();
    gameLoop();

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [canvasSize, config, difficulty, level, onComplete, initializeGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 24, color: '#00f0ff' }}>
          Score: {score}/{config.targetScore}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={jump}
        style={{
          border: '3px solid #00f0ff',
          borderRadius: 12,
          boxShadow: '0 0 30px rgba(0,240,255,0.3)',
          cursor: 'pointer',
          touchAction: 'none',
        }}
      />

      <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, maxWidth: 400 }}>
        <p>🎮 Click or press SPACE to flap</p>
        <p>Avoid the pipes and reach the target score!</p>
        {gameState === 'gameOver' && (
          <p style={{ color: '#ff00aa', fontWeight: 'bold' }}>Game Over! Press SPACE to retry</p>
        )}
        {gameState === 'won' && (
          <p style={{ color: '#00ff88', fontWeight: 'bold' }}>Level Complete! 🎉</p>
        )}
      </div>

      <button
        onClick={onBack}
        style={{
          padding: '12px 32px',
          fontSize: 16,
          fontWeight: 'bold',
          fontFamily: 'Orbitron, sans-serif',
          background: '#1a1a2e',
          color: '#00f0ff',
          border: '2px solid #00f0ff',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        ← Back to Menu
      </button>
    </div>
  );
};

export default FlappyBird;
