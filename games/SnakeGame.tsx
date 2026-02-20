'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { playClick, playSuccess, playFailure, playPop } from '@/lib/sound';

type Difficulty = 'easy' | 'hard' | 'insane';

interface SnakeGameProps {
  difficulty: Difficulty;
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface Obstacle {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const SnakeGame: React.FC<SnakeGameProps> = ({ difficulty, level, onComplete, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const [score, setScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState(500);

  // Game configuration based on difficulty
  const getConfig = () => {
    switch (difficulty) {
      case 'easy':
        return { speed: 150, gridSize: 20, target: 5 + level * 3, hasWalls: false, hasMovingObstacles: false };
      case 'hard':
        return { speed: 100, gridSize: 25, target: 8 + level * 3, hasWalls: true, hasMovingObstacles: false };
      case 'insane':
        return { speed: 70, gridSize: 30, target: 10 + level * 4, hasWalls: false, hasMovingObstacles: true };
      default:
        return { speed: 150, gridSize: 20, target: 5, hasWalls: false, hasMovingObstacles: false };
    }
  };

  const config = getConfig();
  const cellSize = canvasSize / config.gridSize;

  // Game state refs
  const snakeRef = useRef<Position[]>([{ x: Math.floor(config.gridSize / 2), y: Math.floor(config.gridSize / 2) }]);
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const foodRef = useRef<Position>({ x: 0, y: 0 });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const gameStateRef = useRef<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const scoreRef = useRef(0);
  const foodPulseRef = useRef(0);

  // Handle canvas resize
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const width = Math.min(container.clientWidth - 32, 500);
        setCanvasSize(width);
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Initialize game
  const initializeGame = useCallback(() => {
    const centerX = Math.floor(config.gridSize / 2);
    const centerY = Math.floor(config.gridSize / 2);

    snakeRef.current = [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY },
    ];
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    scoreRef.current = 0;
    setScore(0);
    gameStateRef.current = 'playing';
    setGameState('playing');

    // Generate initial obstacles
    if (config.hasWalls) {
      generateStaticWalls();
    } else if (config.hasMovingObstacles) {
      generateMovingObstacles();
    }

    spawnFood();
  }, [config.gridSize, config.hasWalls, config.hasMovingObstacles]);

  // Generate static walls for hard mode
  const generateStaticWalls = () => {
    const walls: Obstacle[] = [];
    const numWalls = 5 + level * 2;

    for (let i = 0; i < numWalls; i++) {
      let wall: Position;
      let attempts = 0;
      do {
        wall = {
          x: Math.floor(Math.random() * config.gridSize),
          y: Math.floor(Math.random() * config.gridSize),
        };
        attempts++;
      } while (
        attempts < 100 &&
        (isPositionInSnake(wall) ||
          isPositionInObstacles(wall) ||
          (wall.x === foodRef.current.x && wall.y === foodRef.current.y) ||
          (Math.abs(wall.x - snakeRef.current[0].x) < 3 && Math.abs(wall.y - snakeRef.current[0].y) < 3))
      );

      if (attempts < 100) {
        walls.push(wall);
      }
    }

    obstaclesRef.current = walls;
  };

  // Generate moving obstacles for insane mode
  const generateMovingObstacles = () => {
    const obstacles: Obstacle[] = [];
    const numObstacles = 3 + level;

    for (let i = 0; i < numObstacles; i++) {
      let obstacle: Obstacle;
      let attempts = 0;
      do {
        obstacle = {
          x: Math.floor(Math.random() * config.gridSize),
          y: Math.floor(Math.random() * config.gridSize),
          vx: Math.random() > 0.5 ? 1 : -1,
          vy: Math.random() > 0.5 ? 1 : -1,
        };
        attempts++;
      } while (
        attempts < 100 &&
        (isPositionInSnake(obstacle) ||
          isPositionInObstacles(obstacle) ||
          (obstacle.x === foodRef.current.x && obstacle.y === foodRef.current.y) ||
          (Math.abs(obstacle.x - snakeRef.current[0].x) < 4 && Math.abs(obstacle.y - snakeRef.current[0].y) < 4))
      );

      if (attempts < 100) {
        obstacles.push(obstacle);
      }
    }

    obstaclesRef.current = obstacles;
  };

  // Spawn food at random empty position
  const spawnFood = () => {
    let newFood: Position;
    let attempts = 0;

    do {
      newFood = {
        x: Math.floor(Math.random() * config.gridSize),
        y: Math.floor(Math.random() * config.gridSize),
      };
      attempts++;
    } while (
      attempts < 1000 &&
      (isPositionInSnake(newFood) || isPositionInObstacles(newFood))
    );

    foodRef.current = newFood;
  };

  const isPositionInSnake = (pos: Position): boolean => {
    return snakeRef.current.some(segment => segment.x === pos.x && segment.y === pos.y);
  };

  const isPositionInObstacles = (pos: Position): boolean => {
    return obstaclesRef.current.some(obstacle => obstacle.x === pos.x && obstacle.y === pos.y);
  };

  // Update moving obstacles
  const updateMovingObstacles = () => {
    if (!config.hasMovingObstacles) return;

    obstaclesRef.current = obstaclesRef.current.map(obstacle => {
      let newX = obstacle.x + (obstacle.vx || 0);
      let newY = obstacle.y + (obstacle.vy || 0);
      let newVx = obstacle.vx || 0;
      let newVy = obstacle.vy || 0;

      // Bounce off walls
      if (newX < 0 || newX >= config.gridSize) {
        newVx = -newVx;
        newX = obstacle.x;
      }
      if (newY < 0 || newY >= config.gridSize) {
        newVy = -newVy;
        newY = obstacle.y;
      }

      return { x: newX, y: newY, vx: newVx, vy: newVy };
    });
  };

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (!lastUpdateRef.current) lastUpdateRef.current = timestamp;
    const deltaTime = timestamp - lastUpdateRef.current;

    if (deltaTime >= config.speed && gameStateRef.current === 'playing') {
      lastUpdateRef.current = timestamp;

      // Update direction
      directionRef.current = nextDirectionRef.current;

      // Calculate new head position
      const head = { ...snakeRef.current[0] };
      switch (directionRef.current) {
        case 'UP':
          head.y -= 1;
          break;
        case 'DOWN':
          head.y += 1;
          break;
        case 'LEFT':
          head.x -= 1;
          break;
        case 'RIGHT':
          head.x += 1;
          break;
      }

      // Check collisions
      const hitWall = head.x < 0 || head.x >= config.gridSize || head.y < 0 || head.y >= config.gridSize;
      const hitSelf = snakeRef.current.some(segment => segment.x === head.x && segment.y === head.y);
      const hitObstacle = isPositionInObstacles(head);

      if (hitWall || hitSelf || hitObstacle) {
        gameStateRef.current = 'gameOver';
        setGameState('gameOver');
        playFailure();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Add new head
      snakeRef.current.unshift(head);

      // Check if food eaten
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        playPop();

        // Check if won
        if (scoreRef.current >= config.target) {
          gameStateRef.current = 'won';
          setGameState('won');
          playSuccess();
          setTimeout(() => {
            onComplete(scoreRef.current, config.target);
          }, 500);
          gameLoopRef.current = requestAnimationFrame(gameLoop);
          return;
        }

        spawnFood();
      } else {
        // Remove tail if no food eaten
        snakeRef.current.pop();
      }

      // Update moving obstacles
      if (config.hasMovingObstacles) {
        updateMovingObstacles();
      }
    }

    // Update food pulse animation
    foodPulseRef.current += 0.05;

    // Render
    render();

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [config.speed, config.gridSize, config.target, config.hasMovingObstacles, onComplete]);

  // Render function
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= config.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw obstacles
    obstaclesRef.current.forEach(obstacle => {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#8800ff';
      ctx.fillStyle = '#440077';
      ctx.fillRect(
        obstacle.x * cellSize + 2,
        obstacle.y * cellSize + 2,
        cellSize - 4,
        cellSize - 4
      );
      ctx.restore();
    });

    // Draw food with pulsing glow
    const foodPulse = Math.sin(foodPulseRef.current) * 0.3 + 0.7;
    ctx.save();
    ctx.shadowBlur = 20 * foodPulse;
    ctx.shadowColor = '#ff00aa';
    ctx.fillStyle = '#ff00aa';
    ctx.beginPath();
    ctx.arc(
      foodRef.current.x * cellSize + cellSize / 2,
      foodRef.current.y * cellSize + cellSize / 2,
      cellSize / 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // Draw snake
    snakeRef.current.forEach((segment, index) => {
      const isHead = index === 0;
      const alpha = 1 - (index / snakeRef.current.length) * 0.5;

      ctx.save();
      if (isHead) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f0ff';
        ctx.fillStyle = '#00f0ff';
      } else {
        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(0, 240, 255, ${alpha})`;
        const brightness = Math.floor(240 * alpha);
        ctx.fillStyle = `rgba(0, ${brightness}, 255, ${alpha})`;
      }

      ctx.fillRect(
        segment.x * cellSize + 2,
        segment.y * cellSize + 2,
        cellSize - 4,
        cellSize - 4
      );
      ctx.restore();
    });
  };

  // Start game loop
  useEffect(() => {
    initializeGame();
    lastUpdateRef.current = 0;
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [initializeGame, gameLoop]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (gameStateRef.current === 'playing') {
          gameStateRef.current = 'paused';
          setGameState('paused');
          playClick();
        } else if (gameStateRef.current === 'paused') {
          gameStateRef.current = 'playing';
          setGameState('playing');
          playClick();
        }
        return;
      }

      if (gameStateRef.current !== 'playing') return;

      let newDirection: Direction | null = null;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          newDirection = 'UP';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          newDirection = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          newDirection = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          newDirection = 'RIGHT';
          break;
      }

      if (newDirection) {
        e.preventDefault();

        // Prevent 180-degree turns
        const currentDirection = directionRef.current;
        if (
          (newDirection === 'UP' && currentDirection !== 'DOWN') ||
          (newDirection === 'DOWN' && currentDirection !== 'UP') ||
          (newDirection === 'LEFT' && currentDirection !== 'RIGHT') ||
          (newDirection === 'RIGHT' && currentDirection !== 'LEFT')
        ) {
          nextDirectionRef.current = newDirection;
          playClick();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle touch swipe controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (gameStateRef.current !== 'playing') return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;

      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx > 30) {
          handleDirectionClick('RIGHT');
        } else if (dx < -30) {
          handleDirectionClick('LEFT');
        }
      } else {
        // Vertical swipe
        if (dy > 30) {
          handleDirectionClick('DOWN');
        } else if (dy < -30) {
          handleDirectionClick('UP');
        }
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Handle directional button clicks
  const handleDirectionClick = (direction: Direction) => {
    if (gameStateRef.current !== 'playing') return;

    // Prevent 180-degree turns
    const currentDirection = directionRef.current;
    if (
      (direction === 'UP' && currentDirection !== 'DOWN') ||
      (direction === 'DOWN' && currentDirection !== 'UP') ||
      (direction === 'LEFT' && currentDirection !== 'RIGHT') ||
      (direction === 'RIGHT' && currentDirection !== 'LEFT')
    ) {
      nextDirectionRef.current = direction;
      playClick();
    }
  };

  const handleRestart = () => {
    playClick();
    initializeGame();
  };

  const handleQuit = () => {
    playClick();
    const stars = scoreRef.current >= config.target ? 3 :
                  scoreRef.current >= config.target * 0.6 ? 2 :
                  scoreRef.current >= config.target * 0.3 ? 1 : 0;
    onComplete(scoreRef.current, config.target);
  };

  const calculateStars = () => {
    if (score >= config.target) return 3;
    if (score >= config.target * 0.6) return 2;
    if (score >= config.target * 0.3) return 1;
    return 0;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 text-cyan-400 rounded-lg border border-cyan-500/30 transition-colors"
          >
            Back
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-cyan-400 mb-1">Snake</h2>
            <p className="text-sm text-gray-400">
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} - Level {level}
            </p>
          </div>
          <div className="w-20"></div>
        </div>

        {/* Score and Target */}
        <div className="mb-4 flex items-center justify-between px-4 py-3 bg-gray-900/50 rounded-lg border border-cyan-500/30">
          <div className="text-left">
            <div className="text-sm text-gray-400">Score</div>
            <div className="text-2xl font-bold text-cyan-400">{score}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Target</div>
            <div className="text-2xl font-bold text-magenta-400">{config.target}</div>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative mb-4">
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="w-full border-2 border-cyan-500/50 rounded-lg shadow-lg shadow-cyan-500/20"
          />

          {/* Paused Overlay */}
          {gameState === 'paused' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center p-8">
                <h3 className="text-3xl font-bold text-cyan-400 mb-4">Paused</h3>
                <p className="text-lg text-gray-300 mb-6">Press Escape to resume</p>
                <button
                  onClick={() => {
                    gameStateRef.current = 'playing';
                    setGameState('playing');
                    playClick();
                  }}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Resume
                </button>
              </div>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameOver' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center p-8">
                <h3 className="text-3xl font-bold text-red-400 mb-4">Game Over!</h3>
                <p className="text-xl text-gray-300 mb-2">Score: {score}</p>
                <p className="text-lg text-gray-400 mb-6">Target: {config.target}</p>
                <div className="mb-6">
                  <div className="text-yellow-400 text-2xl mb-2">
                    {'★'.repeat(calculateStars())}{'☆'.repeat(3 - calculateStars())}
                  </div>
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleRestart}
                    className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={handleQuit}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Quit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Won Overlay */}
          {gameState === 'won' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
              <div className="text-center p-8">
                <h3 className="text-3xl font-bold text-cyan-400 mb-4">Level Complete!</h3>
                <p className="text-xl text-gray-300 mb-2">Score: {score}</p>
                <p className="text-lg text-gray-400 mb-6">Target: {config.target}</p>
                <div className="mb-6">
                  <div className="text-yellow-400 text-3xl">
                    ★★★
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center justify-center">
          <div className="grid grid-cols-3 gap-2 w-48">
            <div></div>
            <button
              onClick={() => handleDirectionClick('UP')}
              disabled={gameState !== 'playing'}
              className="h-16 bg-gray-800/50 hover:bg-gray-700/50 active:bg-cyan-500/30 text-cyan-400 rounded-lg border border-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-2xl font-bold"
            >
              ▲
            </button>
            <div></div>

            <button
              onClick={() => handleDirectionClick('LEFT')}
              disabled={gameState !== 'playing'}
              className="h-16 bg-gray-800/50 hover:bg-gray-700/50 active:bg-cyan-500/30 text-cyan-400 rounded-lg border border-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-2xl font-bold"
            >
              ◀
            </button>
            <button
              onClick={() => handleDirectionClick('DOWN')}
              disabled={gameState !== 'playing'}
              className="h-16 bg-gray-800/50 hover:bg-gray-700/50 active:bg-cyan-500/30 text-cyan-400 rounded-lg border border-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-2xl font-bold"
            >
              ▼
            </button>
            <button
              onClick={() => handleDirectionClick('RIGHT')}
              disabled={gameState !== 'playing'}
              className="h-16 bg-gray-800/50 hover:bg-gray-700/50 active:bg-cyan-500/30 text-cyan-400 rounded-lg border border-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-2xl font-bold"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>🎮 Arrow Keys / WASD / Swipe to move • ESC to pause</p>
          <p className="mt-1">Eat food to grow and reach the target score!</p>
        </div>
      </div>
    </div>
  );
};

export default SnakeGame;
