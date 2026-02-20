'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { playClick, playSuccess, playFailure, playPop } from '@/lib/sound';

type Difficulty = 'easy' | 'hard' | 'insane';

interface PacManProps {
  difficulty: Difficulty;
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

interface Ghost {
  x: number;
  y: number;
  color: string;
  direction: number;
}

const PacMan: React.FC<PacManProps> = ({ difficulty, level, onComplete, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [canvasSize, setCanvasSize] = useState(500);

  const CELL_SIZE = 25;
  const GRID_SIZE = 20;

  // Simple maze (0 = wall, 1 = dot, 2 = empty, 3 = power pellet)
  const MAZE = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0],
    [0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0],
    [0,3,0,0,1,0,0,0,1,1,1,1,0,0,0,1,0,0,3,0],
    [0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0],
    [0,1,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,1,0],
    [0,1,1,1,1,0,1,1,1,0,0,1,1,1,0,1,1,1,1,0],
    [0,0,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,0,0],
    [2,2,2,0,1,0,1,1,1,1,1,1,1,1,0,1,0,2,2,2],
    [0,0,0,0,1,0,1,0,0,2,2,0,0,1,0,1,0,0,0,0],
    [2,2,2,2,1,1,1,0,2,2,2,2,0,1,1,1,2,2,2,2],
    [0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0],
    [2,2,2,0,1,0,1,1,1,1,1,1,1,1,0,1,0,2,2,2],
    [0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,0],
    [0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0],
    [0,3,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,3,0],
    [0,0,1,0,1,0,1,0,0,0,0,0,0,1,0,1,0,1,0,0],
    [0,1,1,1,1,0,1,1,1,0,0,1,1,1,0,1,1,1,1,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  ];

  // Game configuration based on difficulty
  const getConfig = () => {
    switch (difficulty) {
      case 'easy':
        return { ghostCount: 2, ghostSpeed: 1.5, pacmanSpeed: 2.5 };
      case 'hard':
        return { ghostCount: 3, ghostSpeed: 2, pacmanSpeed: 2.5 };
      case 'insane':
        return { ghostCount: 4, ghostSpeed: 2.5, pacmanSpeed: 2.5 };
      default:
        return { ghostCount: 2, ghostSpeed: 1.5, pacmanSpeed: 2.5 };
    }
  };

  const config = getConfig();

  // Game state refs
  const pacmanRef = useRef({ x: 10, y: 15, direction: 0, mouth: 0 });
  const ghostsRef = useRef<Ghost[]>([]);
  const mazeRef = useRef<number[][]>(MAZE.map(row => [...row]));
  const keysRef = useRef({ up: false, down: false, left: false, right: false });
  const gameLoopRef = useRef<number | null>(null);
  const gameStateRef = useRef<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const dotsRemainingRef = useRef(0);
  const powerModeRef = useRef(0);

  // Initialize game
  const initializeGame = useCallback(() => {
    pacmanRef.current = { x: 10, y: 15, direction: 0, mouth: 0 };
    mazeRef.current = MAZE.map(row => [...row]);
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    gameStateRef.current = 'playing';
    setGameState('playing');
    powerModeRef.current = 0;

    // Count dots
    dotsRemainingRef.current = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (mazeRef.current[row][col] === 1 || mazeRef.current[row][col] === 3) {
          dotsRemainingRef.current++;
        }
      }
    }

    // Initialize ghosts
    const ghostColors = ['#ff00aa', '#00f0ff', '#f0ff00', '#00ff88'];
    ghostsRef.current = [];
    for (let i = 0; i < config.ghostCount; i++) {
      ghostsRef.current.push({
        x: 9 + i,
        y: 9,
        color: ghostColors[i],
        direction: Math.floor(Math.random() * 4),
      });
    }
  }, [config]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        keysRef.current.up = true;
        keysRef.current.down = false;
        keysRef.current.left = false;
        keysRef.current.right = false;
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        keysRef.current.down = true;
        keysRef.current.up = false;
        keysRef.current.left = false;
        keysRef.current.right = false;
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        keysRef.current.left = true;
        keysRef.current.right = false;
        keysRef.current.up = false;
        keysRef.current.down = false;
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        keysRef.current.right = true;
        keysRef.current.left = false;
        keysRef.current.up = false;
        keysRef.current.down = false;
      } else if (e.code === 'Escape') {
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameCount = 0;

    const canMove = (x: number, y: number) => {
      const col = Math.floor(x);
      const row = Math.floor(y);
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return false;
      return mazeRef.current[row][col] !== 0;
    };

    const update = () => {
      if (gameStateRef.current !== 'playing') return;

      frameCount++;

      // Update power mode
      if (powerModeRef.current > 0) {
        powerModeRef.current--;
      }

      // Update Pac-Man direction and position
      let newX = pacmanRef.current.x;
      let newY = pacmanRef.current.y;

      if (keysRef.current.up) {
        newY -= config.pacmanSpeed * 0.05;
        pacmanRef.current.direction = 3;
      } else if (keysRef.current.down) {
        newY += config.pacmanSpeed * 0.05;
        pacmanRef.current.direction = 1;
      } else if (keysRef.current.left) {
        newX -= config.pacmanSpeed * 0.05;
        pacmanRef.current.direction = 2;
      } else if (keysRef.current.right) {
        newX += config.pacmanSpeed * 0.05;
        pacmanRef.current.direction = 0;
      }

      if (canMove(newX, newY)) {
        pacmanRef.current.x = newX;
        pacmanRef.current.y = newY;
      }

      // Wrap around
      if (pacmanRef.current.x < 0) pacmanRef.current.x = GRID_SIZE - 1;
      if (pacmanRef.current.x >= GRID_SIZE) pacmanRef.current.x = 0;

      // Animate mouth
      pacmanRef.current.mouth = (frameCount % 20) / 20;

      // Collect dots
      const col = Math.floor(pacmanRef.current.x);
      const row = Math.floor(pacmanRef.current.y);
      if (mazeRef.current[row][col] === 1) {
        mazeRef.current[row][col] = 2;
        scoreRef.current += 10;
        setScore(scoreRef.current);
        dotsRemainingRef.current--;
        playPop();

        if (dotsRemainingRef.current === 0) {
          winGame();
        }
      } else if (mazeRef.current[row][col] === 3) {
        mazeRef.current[row][col] = 2;
        scoreRef.current += 50;
        setScore(scoreRef.current);
        dotsRemainingRef.current--;
        powerModeRef.current = 200;
        playSuccess();
      }

      // Update ghosts
      ghostsRef.current.forEach(ghost => {
        if (frameCount % 2 === 0) {
          let moved = false;
          const directions = [
            { dx: config.ghostSpeed * 0.05, dy: 0 },
            { dx: -config.ghostSpeed * 0.05, dy: 0 },
            { dx: 0, dy: config.ghostSpeed * 0.05 },
            { dx: 0, dy: -config.ghostSpeed * 0.05 },
          ];

          // Try to move in current direction
          let newX = ghost.x + directions[ghost.direction].dx;
          let newY = ghost.y + directions[ghost.direction].dy;

          if (canMove(newX, newY)) {
            ghost.x = newX;
            ghost.y = newY;
            moved = true;
          }

          // If can't move, pick random direction
          if (!moved) {
            ghost.direction = Math.floor(Math.random() * 4);
          }

          // Wrap around
          if (ghost.x < 0) ghost.x = GRID_SIZE - 1;
          if (ghost.x >= GRID_SIZE) ghost.x = 0;
        }

        // Check collision with Pac-Man
        const distance = Math.sqrt(
          Math.pow(ghost.x - pacmanRef.current.x, 2) + Math.pow(ghost.y - pacmanRef.current.y, 2)
        );

        if (distance < 0.5) {
          if (powerModeRef.current > 0) {
            // Eat ghost
            scoreRef.current += 200;
            setScore(scoreRef.current);
            ghost.x = 9;
            ghost.y = 9;
            playSuccess();
          } else {
            // Lose life
            livesRef.current--;
            setLives(livesRef.current);
            playFailure();

            if (livesRef.current <= 0) {
              gameOver();
            } else {
              // Reset Pac-Man position
              pacmanRef.current.x = 10;
              pacmanRef.current.y = 15;
            }
          }
        }
      });
    };

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

      // Draw maze
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          const cell = mazeRef.current[row][col];

          if (cell === 0) {
            // Wall
            const gradient = ctx.createLinearGradient(
              col * CELL_SIZE,
              row * CELL_SIZE,
              (col + 1) * CELL_SIZE,
              (row + 1) * CELL_SIZE
            );
            gradient.addColorStop(0, '#1a1a5e');
            gradient.addColorStop(1, '#0d0d3f');
            ctx.fillStyle = gradient;
            ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1;
            ctx.strokeRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          } else if (cell === 1) {
            // Dot
            ctx.fillStyle = '#f0ff00';
            ctx.beginPath();
            ctx.arc(col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (cell === 3) {
            // Power pellet
            ctx.fillStyle = '#f0ff00';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f0ff00';
            ctx.beginPath();
            ctx.arc(col * CELL_SIZE + CELL_SIZE / 2, row * CELL_SIZE + CELL_SIZE / 2, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw ghosts
      ghostsRef.current.forEach(ghost => {
        const x = ghost.x * CELL_SIZE;
        const y = ghost.y * CELL_SIZE;

        if (powerModeRef.current > 0) {
          ctx.fillStyle = powerModeRef.current > 100 ? '#4444ff' : (frameCount % 10 < 5 ? '#4444ff' : '#ffffff');
        } else {
          ctx.fillStyle = ghost.color;
        }

        // Ghost body
        ctx.beginPath();
        ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 2 - 2, Math.PI, 0);
        ctx.lineTo(x + CELL_SIZE - 2, y + CELL_SIZE - 2);
        ctx.lineTo(x + CELL_SIZE * 0.75, y + CELL_SIZE * 0.7);
        ctx.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE - 2);
        ctx.lineTo(x + CELL_SIZE * 0.25, y + CELL_SIZE * 0.7);
        ctx.lineTo(x + 2, y + CELL_SIZE - 2);
        ctx.closePath();
        ctx.fill();

        // Ghost eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 6, y + 8, 5, 7);
        ctx.fillRect(x + 14, y + 8, 5, 7);
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 8, y + 10, 3, 3);
        ctx.fillRect(x + 16, y + 10, 3, 3);
      });

      // Draw Pac-Man
      const x = pacmanRef.current.x * CELL_SIZE;
      const y = pacmanRef.current.y * CELL_SIZE;
      const mouthAngle = pacmanRef.current.mouth * 0.4;

      const gradient = ctx.createRadialGradient(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 2, x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE / 2);
      gradient.addColorStop(0, '#ffff00');
      gradient.addColorStop(1, '#f0ff00');
      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.arc(
        x + CELL_SIZE / 2,
        y + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        (pacmanRef.current.direction * Math.PI / 2) + mouthAngle,
        (pacmanRef.current.direction * Math.PI / 2) + Math.PI * 2 - mouthAngle
      );
      ctx.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE / 2);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 15;
      ctx.shadowColor = '#f0ff00';
      ctx.fill();
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
      onComplete(scoreRef.current, 500);
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
  }, [config, difficulty, level, onComplete, initializeGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ display: 'flex', gap: 30, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 20, color: '#f0ff00' }}>
          Score: {score}
        </div>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 20, color: '#ff00aa' }}>
          Lives: {lives}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL_SIZE}
        height={GRID_SIZE * CELL_SIZE}
        style={{
          border: '3px solid #00f0ff',
          borderRadius: 12,
          boxShadow: '0 0 30px rgba(0,240,255,0.3)',
        }}
      />

      <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, maxWidth: 400 }}>
        <p>🎮 Arrow Keys to move</p>
        <p>Collect all dots and avoid ghosts!</p>
        {gameState === 'gameOver' && (
          <p style={{ color: '#ff00aa', fontWeight: 'bold' }}>Game Over!</p>
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

export default PacMan;
