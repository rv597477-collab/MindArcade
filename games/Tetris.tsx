'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { playClick, playSuccess, playFailure, playPop } from '@/lib/sound';

type Difficulty = 'easy' | 'hard' | 'insane';

interface TetrisProps {
  difficulty: Difficulty;
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

type Tetromino = number[][];

const TETROMINOES: Record<string, { shape: Tetromino; color: string }> = {
  I: { shape: [[1, 1, 1, 1]], color: '#00f0ff' },
  O: { shape: [[1, 1], [1, 1]], color: '#f0ff00' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#ff00aa' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#00ff88' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#ff4444' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#4444ff' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#ff8800' },
};

const Tetris: React.FC<TetrisProps> = ({ difficulty, level, onComplete, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 600 });

  const COLS = 10;
  const ROWS = 20;
  const CELL_SIZE = 30;

  // Game configuration based on difficulty
  const getConfig = () => {
    switch (difficulty) {
      case 'easy':
        return { speed: 800, targetLines: 10 + level * 5 };
      case 'hard':
        return { speed: 500, targetLines: 15 + level * 5 };
      case 'insane':
        return { speed: 300, targetLines: 20 + level * 5 };
      default:
        return { speed: 800, targetLines: 10 };
    }
  };

  const config = getConfig();

  // Game state refs
  const gridRef = useRef<string[][]>(Array.from({ length: ROWS }, () => Array(COLS).fill('')));
  const currentPieceRef = useRef<{ shape: Tetromino; color: string; x: number; y: number } | null>(null);
  const nextPieceRef = useRef<{ shape: Tetromino; color: string } | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastDropRef = useRef<number>(0);
  const gameStateRef = useRef<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const gameOverCallbackRef = useRef<(() => void) | null>(null);
  const winGameCallbackRef = useRef<(() => void) | null>(null);

  const spawnPiece = useCallback(() => {
    const pieces = Object.keys(TETROMINOES);
    let piece;

    if (nextPieceRef.current) {
      piece = nextPieceRef.current;
    } else {
      const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
      piece = { ...TETROMINOES[randomPiece] };
    }

    const nextRandomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    nextPieceRef.current = { ...TETROMINOES[nextRandomPiece] };

    currentPieceRef.current = {
      ...piece,
      x: Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2),
      y: 0,
    };

    if (collides(currentPieceRef.current.shape, currentPieceRef.current.x, currentPieceRef.current.y)) {
      if (gameOverCallbackRef.current) {
        gameOverCallbackRef.current();
      }
    }
  }, []);

  const collides = (shape: Tetromino, x: number, y: number): boolean => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;

          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }

          if (newY >= 0 && gridRef.current[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const rotate = (shape: Tetromino): Tetromino => {
    const rotated: Tetromino = shape[0].map((_, i) => shape.map(row => row[i]).reverse());
    return rotated;
  };

  const merge = () => {
    if (!currentPieceRef.current) return;

    const { shape, color, x, y } = currentPieceRef.current;
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          gridRef.current[y + row][x + col] = color;
        }
      }
    }

    clearLines();
    spawnPiece();
  };

  const clearLines = () => {
    let linesCleared = 0;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (gridRef.current[row].every(cell => cell !== '')) {
        gridRef.current.splice(row, 1);
        gridRef.current.unshift(Array(COLS).fill(''));
        linesCleared++;
        row++; // Check this row again
      }
    }

    if (linesCleared > 0) {
      linesRef.current += linesCleared;
      setLines(linesRef.current);
      scoreRef.current += linesCleared * linesCleared * 100;
      setScore(scoreRef.current);
      playSuccess();

      if (linesRef.current >= config.targetLines) {
        if (winGameCallbackRef.current) {
          winGameCallbackRef.current();
        }
      }
    }
  };

  const moveDown = () => {
    if (!currentPieceRef.current) return false;

    const newY = currentPieceRef.current.y + 1;
    if (!collides(currentPieceRef.current.shape, currentPieceRef.current.x, newY)) {
      currentPieceRef.current.y = newY;
      return true;
    } else {
      merge();
      return false;
    }
  };

  const moveLeft = () => {
    if (!currentPieceRef.current) return;

    const newX = currentPieceRef.current.x - 1;
    if (!collides(currentPieceRef.current.shape, newX, currentPieceRef.current.y)) {
      currentPieceRef.current.x = newX;
      playPop();
    }
  };

  const moveRight = () => {
    if (!currentPieceRef.current) return;

    const newX = currentPieceRef.current.x + 1;
    if (!collides(currentPieceRef.current.shape, newX, currentPieceRef.current.y)) {
      currentPieceRef.current.x = newX;
      playPop();
    }
  };

  const rotatePiece = () => {
    if (!currentPieceRef.current) return;

    const rotated = rotate(currentPieceRef.current.shape);
    if (!collides(rotated, currentPieceRef.current.x, currentPieceRef.current.y)) {
      currentPieceRef.current.shape = rotated;
      playPop();
    }
  };

  const drop = () => {
    if (!currentPieceRef.current) return;

    while (moveDown()) {
      scoreRef.current += 2;
    }
    setScore(scoreRef.current);
    playClick();
  };

  // Initialize game
  const initializeGame = useCallback(() => {
    gridRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(''));
    scoreRef.current = 0;
    linesRef.current = 0;
    setScore(0);
    setLines(0);
    gameStateRef.current = 'playing';
    setGameState('playing');
    nextPieceRef.current = null;
    spawnPiece();
  }, [spawnPiece]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'playing') return;

      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        moveLeft();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        moveRight();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        moveDown();
      } else if (e.code === 'ArrowUp' || e.code === 'Space') {
        e.preventDefault();
        rotatePiece();
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        drop();
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

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE);

      // Draw grid lines
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 1;
      for (let i = 0; i <= COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, ROWS * CELL_SIZE);
        ctx.stroke();
      }
      for (let i = 0; i <= ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(COLS * CELL_SIZE, i * CELL_SIZE);
        ctx.stroke();
      }

      // Draw placed blocks
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          if (gridRef.current[row][col]) {
            ctx.fillStyle = gridRef.current[row][col];
            ctx.fillRect(col * CELL_SIZE + 2, row * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            ctx.strokeStyle = gridRef.current[row][col];
            ctx.lineWidth = 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = gridRef.current[row][col];
            ctx.strokeRect(col * CELL_SIZE + 2, row * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw current piece
      if (currentPieceRef.current) {
        const { shape, color, x, y } = currentPieceRef.current;
        ctx.fillStyle = color;
        for (let row = 0; row < shape.length; row++) {
          for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
              ctx.fillRect((x + col) * CELL_SIZE + 2, (y + row) * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
              ctx.strokeStyle = color;
              ctx.lineWidth = 2;
              ctx.shadowBlur = 15;
              ctx.shadowColor = color;
              ctx.strokeRect((x + col) * CELL_SIZE + 2, (y + row) * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
              ctx.shadowBlur = 0;
            }
          }
        }
      }
    };

    const gameLoop = (timestamp: number) => {
      if (gameStateRef.current !== 'playing') {
        render();
        return;
      }

      if (timestamp - lastDropRef.current > config.speed) {
        moveDown();
        lastDropRef.current = timestamp;
      }

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
      onComplete(scoreRef.current, config.targetLines * 100);
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

    // Set callback refs
    gameOverCallbackRef.current = gameOver;
    winGameCallbackRef.current = winGame;

    initializeGame();
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [config, difficulty, level, onComplete, initializeGame]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ display: 'flex', gap: 30, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 20, color: '#00f0ff' }}>
          Lines: {lines}/{config.targetLines}
        </div>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 20, color: '#f0ff00' }}>
          Score: {score}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <canvas
          ref={canvasRef}
          width={COLS * CELL_SIZE}
          height={ROWS * CELL_SIZE}
          style={{
            border: '3px solid #00f0ff',
            borderRadius: 12,
            boxShadow: '0 0 30px rgba(0,240,255,0.3)',
          }}
        />

        {/* Next piece preview */}
        <div style={{
          border: '2px solid #ff00aa',
          borderRadius: 12,
          padding: 20,
          background: '#1a1a2e',
          minWidth: 120,
        }}>
          <div style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 14,
            color: '#ff00aa',
            marginBottom: 10,
            textAlign: 'center',
          }}>
            Next
          </div>
          <canvas
            width={120}
            height={120}
            ref={(canvas) => {
              if (canvas && nextPieceRef.current) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = '#1a1a2e';
                  ctx.fillRect(0, 0, 120, 120);

                  const { shape, color } = nextPieceRef.current;
                  const size = 25;
                  const offsetX = (120 - shape[0].length * size) / 2;
                  const offsetY = (120 - shape.length * size) / 2;

                  ctx.fillStyle = color;
                  for (let row = 0; row < shape.length; row++) {
                    for (let col = 0; col < shape[row].length; col++) {
                      if (shape[row][col]) {
                        ctx.fillRect(offsetX + col * size + 2, offsetY + row * size + 2, size - 4, size - 4);
                      }
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>

      <div style={{ textAlign: 'center', color: '#aaa', fontSize: 14, maxWidth: 400 }}>
        <p>🎮 Arrow Keys: Move | Space/↑: Rotate | D: Drop</p>
        <p>Clear {config.targetLines} lines to win!</p>
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

export default Tetris;
