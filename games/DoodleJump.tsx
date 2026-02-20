'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { playClick, playSuccess, playFailure, playPop } from '@/lib/sound';

type Difficulty = 'easy' | 'hard' | 'insane';

interface DoodleJumpProps {
  difficulty: Difficulty;
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  type: 'normal' | 'moving' | 'breakable';
  vx?: number;
  broken?: boolean;
}

const DoodleJump: React.FC<DoodleJumpProps> = ({ difficulty, level, onComplete, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const [score, setScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 600 });

  // Game configuration based on difficulty
  const getConfig = () => {
    switch (difficulty) {
      case 'easy':
        return { gravity: 0.4, jumpPower: 12, platformGap: 80, targetHeight: 3000 + level * 500, movingChance: 0.1, breakableChance: 0 };
      case 'hard':
        return { gravity: 0.5, jumpPower: 13, platformGap: 90, targetHeight: 4000 + level * 500, movingChance: 0.2, breakableChance: 0.1 };
      case 'insane':
        return { gravity: 0.6, jumpPower: 14, platformGap: 100, targetHeight: 5000 + level * 500, movingChance: 0.3, breakableChance: 0.2 };
      default:
        return { gravity: 0.4, jumpPower: 12, platformGap: 80, targetHeight: 3000, movingChance: 0.1, breakableChance: 0 };
    }
  };

  const config = getConfig();

  // Game state refs
  const playerRef = useRef({ x: 200, y: 400, vx: 0, vy: 0, width: 40, height: 40 });
  const platformsRef = useRef<Platform[]>([]);
  const cameraYRef = useRef(0);
  const keysRef = useRef({ left: false, right: false });
  const gameLoopRef = useRef<number | null>(null);
  const gameStateRef = useRef<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const scoreRef = useRef(0);
  const maxHeightRef = useRef(0);

  const PLAYER_SPEED = 5;

  // Initialize game
  const initializeGame = useCallback(() => {
    playerRef.current = { x: canvasSize.width / 2 - 20, y: 400, vx: 0, vy: 0, width: 40, height: 40 };
    platformsRef.current = [];
    cameraYRef.current = 0;
    scoreRef.current = 0;
    maxHeightRef.current = 0;
    setScore(0);
    gameStateRef.current = 'playing';
    setGameState('playing');

    // Generate initial platforms
    for (let i = 0; i < 15; i++) {
      const y = canvasSize.height - i * config.platformGap;
      const x = Math.random() * (canvasSize.width - 80);
      let type: 'normal' | 'moving' | 'breakable' = 'normal';

      const rand = Math.random();
      if (i > 2) {
        if (rand < config.movingChance) {
          type = 'moving';
        } else if (rand < config.movingChance + config.breakableChance) {
          type = 'breakable';
        }
      }

      platformsRef.current.push({
        x,
        y,
        width: 80,
        type,
        vx: type === 'moving' ? (Math.random() > 0.5 ? 2 : -2) : 0,
        broken: false,
      });
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
      } else if (e.code === 'Escape') {
        onBack();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') {
        keysRef.current.left = false;
      } else if (e.code === 'ArrowRight') {
        keysRef.current.right = false;
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

      // Update player horizontal movement
      if (keysRef.current.left) {
        playerRef.current.vx = -PLAYER_SPEED;
      } else if (keysRef.current.right) {
        playerRef.current.vx = PLAYER_SPEED;
      } else {
        playerRef.current.vx *= 0.9;
      }

      playerRef.current.x += playerRef.current.vx;

      // Wrap around screen
      if (playerRef.current.x < -playerRef.current.width) {
        playerRef.current.x = canvasSize.width;
      } else if (playerRef.current.x > canvasSize.width) {
        playerRef.current.x = -playerRef.current.width;
      }

      // Apply gravity
      playerRef.current.vy += config.gravity;
      playerRef.current.y += playerRef.current.vy;

      // Check platform collisions (only when falling down)
      if (playerRef.current.vy > 0) {
        platformsRef.current.forEach(platform => {
          if (platform.broken) return;

          const relativeY = platform.y - cameraYRef.current;
          if (
            playerRef.current.y + playerRef.current.height >= relativeY &&
            playerRef.current.y + playerRef.current.height <= relativeY + 15 &&
            playerRef.current.x + playerRef.current.width > platform.x &&
            playerRef.current.x < platform.x + platform.width
          ) {
            playerRef.current.vy = -config.jumpPower;
            playPop();

            if (platform.type === 'breakable') {
              platform.broken = true;
            }
          }
        });
      }

      // Update moving platforms
      platformsRef.current.forEach(platform => {
        if (platform.type === 'moving' && platform.vx) {
          platform.x += platform.vx;
          if (platform.x < 0 || platform.x > canvasSize.width - platform.width) {
            platform.vx *= -1;
          }
        }
      });

      // Update camera to follow player
      if (playerRef.current.y < canvasSize.height / 2) {
        const diff = canvasSize.height / 2 - playerRef.current.y;
        cameraYRef.current += diff;
        playerRef.current.y = canvasSize.height / 2;

        // Update score based on height
        if (cameraYRef.current > maxHeightRef.current) {
          maxHeightRef.current = cameraYRef.current;
          scoreRef.current = Math.floor(maxHeightRef.current / 10);
          setScore(scoreRef.current);

          if (scoreRef.current >= config.targetHeight / 10) {
            winGame();
          }
        }
      }

      // Generate new platforms as we go up
      const highestPlatform = Math.min(...platformsRef.current.map(p => p.y));
      while (highestPlatform > cameraYRef.current - canvasSize.height) {
        const y = highestPlatform - config.platformGap;
        const x = Math.random() * (canvasSize.width - 80);
        let type: 'normal' | 'moving' | 'breakable' = 'normal';

        const rand = Math.random();
        if (rand < config.movingChance) {
          type = 'moving';
        } else if (rand < config.movingChance + config.breakableChance) {
          type = 'breakable';
        }

        platformsRef.current.push({
          x,
          y,
          width: 80,
          type,
          vx: type === 'moving' ? (Math.random() > 0.5 ? 2 : -2) : 0,
          broken: false,
        });
      }

      // Remove platforms that are too far below
      platformsRef.current = platformsRef.current.filter(
        p => p.y < cameraYRef.current + canvasSize.height + 100
      );

      // Check if player fell off screen
      if (playerRef.current.y - cameraYRef.current > canvasSize.height) {
        gameOver();
      }
    };

    const render = () => {
      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize.height);
      gradient.addColorStop(0, '#0a0a0f');
      gradient.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) {
        const x = (i * 73) % canvasSize.width;
        const y = ((i * 97 + cameraYRef.current * 0.2) % canvasSize.height);
        ctx.globalAlpha = Math.random() * 0.5 + 0.3;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;

      // Draw platforms
      platformsRef.current.forEach(platform => {
        if (platform.broken) return;

        const y = platform.y - cameraYRef.current;

        let color = '#00ff88';
        if (platform.type === 'moving') {
          color = '#f0ff00';
        } else if (platform.type === 'breakable') {
          color = '#ff00aa';
        }

        const platformGradient = ctx.createLinearGradient(platform.x, y, platform.x + platform.width, y + 15);
        platformGradient.addColorStop(0, color);
        platformGradient.addColorStop(1, '#00f0ff');
        ctx.fillStyle = platformGradient;
        ctx.fillRect(platform.x, y, platform.width, 15);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.strokeRect(platform.x, y, platform.width, 15);
        ctx.shadowBlur = 0;
      });

      // Draw player (doodler)
      const playerGradient = ctx.createRadialGradient(
        playerRef.current.x + playerRef.current.width / 2,
        playerRef.current.y + playerRef.current.height / 2,
        5,
        playerRef.current.x + playerRef.current.width / 2,
        playerRef.current.y + playerRef.current.height / 2,
        playerRef.current.width / 2
      );
      playerGradient.addColorStop(0, '#00f0ff');
      playerGradient.addColorStop(1, '#ff00aa');
      ctx.fillStyle = playerGradient;

      // Draw simple doodler shape
      ctx.beginPath();
      ctx.arc(
        playerRef.current.x + playerRef.current.width / 2,
        playerRef.current.y + playerRef.current.height / 2,
        playerRef.current.width / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f0ff';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(playerRef.current.x + 10, playerRef.current.y + 12, 8, 8);
      ctx.fillRect(playerRef.current.x + 22, playerRef.current.y + 12, 8, 8);
      ctx.fillStyle = '#000000';
      ctx.fillRect(playerRef.current.x + 13, playerRef.current.y + 15, 3, 3);
      ctx.fillRect(playerRef.current.x + 25, playerRef.current.y + 15, 3, 3);

      // Draw score
      ctx.font = 'bold 24px Orbitron, sans-serif';
      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f0ff';
      ctx.fillText(`${scoreRef.current}`, canvasSize.width / 2, 40);
      ctx.font = 'bold 12px Orbitron, sans-serif';
      ctx.fillText(`Target: ${Math.floor(config.targetHeight / 10)}`, canvasSize.width / 2, 60);
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
      onComplete(scoreRef.current, config.targetHeight / 10);
    };

    const winGame = () => {
      gameStateRef.current = 'won';
      setGameState('won');
      playSuccess();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      onComplete(scoreRef.current, scoreRef.current);
    };

    initializeGame();
    gameLoop();

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [canvasSize, config, difficulty, level, onComplete, initializeGame]);

  // Mobile controls handlers
  const handleMobileLeft = () => {
    keysRef.current.left = true;
    setTimeout(() => { keysRef.current.left = false; }, 100);
  };

  const handleMobileRight = () => {
    keysRef.current.right = true;
    setTimeout(() => { keysRef.current.right = false; }, 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ display: 'flex', gap: 30, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 20, color: '#00f0ff' }}>
          Height: {score}
        </div>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 20, color: '#f0ff00' }}>
          Target: {Math.floor(config.targetHeight / 10)}
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
        <p>🎮 Arrow Keys (←→) / Tap buttons to move • ESC to quit</p>
        <p>Jump on platforms and reach the target height!</p>
        {gameState === 'gameOver' && (
          <p style={{ color: '#ff00aa', fontWeight: 'bold' }}>You Fell! Try Again!</p>
        )}
        {gameState === 'won' && (
          <p style={{ color: '#00ff88', fontWeight: 'bold' }}>Target Reached! 🎉</p>
        )}
      </div>

      {/* Mobile Controls */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onMouseDown={handleMobileLeft}
          onTouchStart={handleMobileLeft}
          style={{
            width: 80,
            height: 60,
            fontSize: 24,
            fontWeight: 'bold',
            background: '#1a1a2e',
            color: '#00f0ff',
            border: '2px solid #00f0ff',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          ◀
        </button>
        <button
          onMouseDown={handleMobileRight}
          onTouchStart={handleMobileRight}
          style={{
            width: 80,
            height: 60,
            fontSize: 24,
            fontWeight: 'bold',
            background: '#1a1a2e',
            color: '#00f0ff',
            border: '2px solid #00f0ff',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          ▶
        </button>
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

export default DoodleJump;
