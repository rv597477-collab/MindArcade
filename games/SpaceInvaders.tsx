'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { playClick, playSuccess, playFailure, playPop } from '@/lib/sound';

type Difficulty = 'easy' | 'hard' | 'insane';

interface SpaceInvadersProps {
  difficulty: Difficulty;
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

interface Alien {
  x: number;
  y: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  type: 'player' | 'alien';
}

const SpaceInvaders: React.FC<SpaceInvadersProps> = ({ difficulty, level, onComplete, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 600 });

  // Game configuration based on difficulty
  const getConfig = () => {
    switch (difficulty) {
      case 'easy':
        return { alienSpeed: 1, alienRows: 3, alienCols: 6, shootFrequency: 0.005, playerSpeed: 5 };
      case 'hard':
        return { alienSpeed: 1.5, alienRows: 4, alienCols: 8, shootFrequency: 0.01, playerSpeed: 6 };
      case 'insane':
        return { alienSpeed: 2, alienRows: 5, alienCols: 10, shootFrequency: 0.015, playerSpeed: 7 };
      default:
        return { alienSpeed: 1, alienRows: 3, alienCols: 6, shootFrequency: 0.005, playerSpeed: 5 };
    }
  };

  const config = getConfig();

  // Game state refs
  const playerRef = useRef({ x: 300, width: 40, height: 30 });
  const aliensRef = useRef<Alien[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const alienDirectionRef = useRef(1);
  const keysRef = useRef({ left: false, right: false, space: false });
  const gameLoopRef = useRef<number | null>(null);
  const gameStateRef = useRef<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const lastShotRef = useRef(0);
  const frameCountRef = useRef(0);

  // Handle canvas resize
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const size = Math.min(container.clientWidth - 32, 600);
        setCanvasSize({ width: size, height: size });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Initialize game
  const initializeGame = useCallback(() => {
    playerRef.current = { x: canvasSize.width / 2 - 20, width: 40, height: 30 };
    aliensRef.current = [];
    bulletsRef.current = [];
    alienDirectionRef.current = 1;
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    frameCountRef.current = 0;
    gameStateRef.current = 'playing';
    setGameState('playing');

    // Create aliens
    for (let row = 0; row < config.alienRows; row++) {
      for (let col = 0; col < config.alienCols; col++) {
        aliensRef.current.push({
          x: col * 60 + 50,
          y: row * 50 + 50,
          alive: true,
        });
      }
    }
  }, [canvasSize, config]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        keysRef.current.left = true;
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        keysRef.current.right = true;
      } else if (e.code === 'Space') {
        e.preventDefault();
        keysRef.current.space = true;
      } else if (e.code === 'Escape') {
        onBack();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') {
        keysRef.current.left = false;
      } else if (e.code === 'ArrowRight') {
        keysRef.current.right = false;
      } else if (e.code === 'Space') {
        keysRef.current.space = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onBack]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      if (gameStateRef.current !== 'playing') return;

      frameCountRef.current++;

      // Update player
      if (keysRef.current.left) {
        playerRef.current.x = Math.max(0, playerRef.current.x - config.playerSpeed);
      }
      if (keysRef.current.right) {
        playerRef.current.x = Math.min(canvasSize.width - playerRef.current.width, playerRef.current.x + config.playerSpeed);
      }

      // Player shooting
      if (keysRef.current.space && frameCountRef.current - lastShotRef.current > 20) {
        bulletsRef.current.push({
          x: playerRef.current.x + playerRef.current.width / 2 - 2,
          y: canvasSize.height - 60,
          type: 'player',
        });
        lastShotRef.current = frameCountRef.current;
        playPop();
      }

      // Update bullets
      bulletsRef.current = bulletsRef.current.filter(bullet => {
        if (bullet.type === 'player') {
          bullet.y -= 8;
          return bullet.y > 0;
        } else {
          bullet.y += 5;
          return bullet.y < canvasSize.height;
        }
      });

      // Alien shooting
      const aliveAliens = aliensRef.current.filter(a => a.alive);
      aliveAliens.forEach(alien => {
        if (Math.random() < config.shootFrequency) {
          bulletsRef.current.push({
            x: alien.x + 20,
            y: alien.y + 30,
            type: 'alien',
          });
        }
      });

      // Update aliens
      let shouldMoveDown = false;
      aliveAliens.forEach(alien => {
        alien.x += config.alienSpeed * alienDirectionRef.current;
        if (alien.x < 0 || alien.x > canvasSize.width - 40) {
          shouldMoveDown = true;
        }
      });

      if (shouldMoveDown) {
        alienDirectionRef.current *= -1;
        aliveAliens.forEach(alien => {
          alien.y += 20;
          if (alien.y > canvasSize.height - 100) {
            gameOver();
          }
        });
      }

      // Collision detection - bullets vs aliens
      bulletsRef.current.forEach((bullet, bIndex) => {
        if (bullet.type !== 'player') return;

        aliensRef.current.forEach((alien, aIndex) => {
          if (!alien.alive) return;

          if (
            bullet.x > alien.x &&
            bullet.x < alien.x + 40 &&
            bullet.y > alien.y &&
            bullet.y < alien.y + 30
          ) {
            alien.alive = false;
            bulletsRef.current.splice(bIndex, 1);
            scoreRef.current += 100;
            setScore(scoreRef.current);
            playSuccess();

            if (aliensRef.current.every(a => !a.alive)) {
              winGame();
            }
          }
        });
      });

      // Collision detection - alien bullets vs player
      bulletsRef.current.forEach((bullet, bIndex) => {
        if (bullet.type !== 'alien') return;

        if (
          bullet.x > playerRef.current.x &&
          bullet.x < playerRef.current.x + playerRef.current.width &&
          bullet.y > canvasSize.height - 40 &&
          bullet.y < canvasSize.height - 10
        ) {
          bulletsRef.current.splice(bIndex, 1);
          livesRef.current--;
          setLives(livesRef.current);
          playFailure();

          if (livesRef.current <= 0) {
            gameOver();
          }
        }
      });
    };

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 80; i++) {
        const x = (i * 73) % canvasSize.width;
        const y = (i * 97) % canvasSize.height;
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;

      // Draw aliens
      aliensRef.current.forEach((alien, index) => {
        if (!alien.alive) return;

        const alienType = index % 3;
        const colors = ['#00f0ff', '#ff00aa', '#f0ff00'];
        const color = colors[alienType];

        ctx.fillStyle = color;
        ctx.fillRect(alien.x, alien.y, 40, 30);

        // Draw alien eyes
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(alien.x + 10, alien.y + 10, 8, 8);
        ctx.fillRect(alien.x + 22, alien.y + 10, 8, 8);

        // Glow effect
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.strokeRect(alien.x, alien.y, 40, 30);
        ctx.shadowBlur = 0;
      });

      // Draw bullets
      bulletsRef.current.forEach(bullet => {
        const gradient = ctx.createRadialGradient(bullet.x + 2, bullet.y + 5, 1, bullet.x + 2, bullet.y + 5, 4);
        if (bullet.type === 'player') {
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(1, '#00f0ff');
        } else {
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(1, '#ff00aa');
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(bullet.x, bullet.y, 4, 10);
        ctx.shadowBlur = 10;
        ctx.shadowColor = bullet.type === 'player' ? '#00f0ff' : '#ff00aa';
        ctx.fillRect(bullet.x, bullet.y, 4, 10);
        ctx.shadowBlur = 0;
      });

      // Draw player
      const playerGradient = ctx.createLinearGradient(
        playerRef.current.x,
        canvasSize.height - 40,
        playerRef.current.x + playerRef.current.width,
        canvasSize.height - 10
      );
      playerGradient.addColorStop(0, '#00ff88');
      playerGradient.addColorStop(1, '#00f0ff');
      ctx.fillStyle = playerGradient;

      // Player ship shape
      ctx.beginPath();
      ctx.moveTo(playerRef.current.x + playerRef.current.width / 2, canvasSize.height - 40);
      ctx.lineTo(playerRef.current.x, canvasSize.height - 10);
      ctx.lineTo(playerRef.current.x + playerRef.current.width, canvasSize.height - 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f0ff';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw score and lives
      ctx.font = 'bold 20px Orbitron, sans-serif';
      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${scoreRef.current}`, 10, 30);

      ctx.fillStyle = '#ff00aa';
      ctx.textAlign = 'right';
      ctx.fillText(`Lives: ${livesRef.current}`, canvasSize.width - 10, 30);
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
      const maxScore = config.alienRows * config.alienCols * 100;
      onComplete(scoreRef.current, maxScore);
    };

    const winGame = () => {
      gameStateRef.current = 'won';
      setGameState('won');
      playSuccess();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      const maxScore = config.alienRows * config.alienCols * 100;
      onComplete(scoreRef.current, maxScore);
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
      <div style={{ display: 'flex', gap: 30, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 20, color: '#00f0ff' }}>
          Score: {score}
        </div>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 20, color: '#ff00aa' }}>
          Lives: {lives}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          border: '3px solid #00f0ff',
          borderRadius: 12,
          boxShadow: '0 0 30px rgba(0,240,255,0.3)',
        }}
      />

      <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, maxWidth: 400 }}>
        <p>🎮 Arrow Keys: Move | Space: Shoot</p>
        <p>Destroy all aliens to win!</p>
        {gameState === 'gameOver' && (
          <p style={{ color: '#ff00aa', fontWeight: 'bold' }}>Game Over!</p>
        )}
        {gameState === 'won' && (
          <p style={{ color: '#00ff88', fontWeight: 'bold' }}>All Aliens Destroyed! 🎉</p>
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

export default SpaceInvaders;
