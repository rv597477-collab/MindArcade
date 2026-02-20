import React, { useEffect, useRef, useState, useCallback } from 'react';
import { playClick, playSuccess, playFailure } from '@/lib/sound';

interface MazeRunnerProps {
  difficulty: 'easy' | 'hard' | 'insane';
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

interface Cell {
  x: number;
  y: number;
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  visited: boolean;
}

interface Position {
  x: number;
  y: number;
}

const MazeRunner: React.FC<MazeRunnerProps> = ({
  difficulty,
  level,
  onComplete,
  onBack,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [moveCount, setMoveCount] = useState(0);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 0, y: 0 });
  const [maze, setMaze] = useState<Cell[][]>([]);
  const [trail, setTrail] = useState<Position[]>([]);
  const gameLoopRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const lastMoveTime = useRef<number>(0);
  const startTime = useRef<number>(Date.now());

  // Difficulty settings
  const config = {
    easy: { size: 11, timeLimit: 0, fogRadius: Infinity },
    hard: { size: 17, timeLimit: 60, fogRadius: Infinity },
    insane: { size: 23, timeLimit: 40, fogRadius: 3 },
  }[difficulty];

  const CELL_SIZE = 20;
  const CANVAS_SIZE = Math.min(500, config.size * CELL_SIZE);
  const ACTUAL_CELL_SIZE = CANVAS_SIZE / config.size;
  const MOVE_COOLDOWN = 150; // ms between moves

  // Generate maze using recursive backtracker (DFS)
  const generateMaze = useCallback((size: number): Cell[][] => {
    // Initialize grid
    const grid: Cell[][] = [];
    for (let y = 0; y < size; y++) {
      grid[y] = [];
      for (let x = 0; x < size; x++) {
        grid[y][x] = {
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
        };
      }
    }

    // Recursive backtracker
    const stack: Cell[] = [];
    const startCell = grid[0][0];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors: { cell: Cell; direction: string }[] = [];

      // Check all four directions
      const directions = [
        { dx: 0, dy: -1, dir: 'top', opposite: 'bottom' },
        { dx: 1, dy: 0, dir: 'right', opposite: 'left' },
        { dx: 0, dy: 1, dir: 'bottom', opposite: 'top' },
        { dx: -1, dy: 0, dir: 'left', opposite: 'right' },
      ];

      for (const { dx, dy, dir, opposite } of directions) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size && !grid[ny][nx].visited) {
          neighbors.push({ cell: grid[ny][nx], direction: dir });
        }
      }

      if (neighbors.length > 0) {
        // Choose random neighbor
        const { cell: next, direction } = neighbors[Math.floor(Math.random() * neighbors.length)];

        // Remove walls
        const oppositeDir = directions.find(d => d.dir === direction)!.opposite;
        current.walls[direction as keyof typeof current.walls] = false;
        next.walls[oppositeDir as keyof typeof next.walls] = false;

        next.visited = true;
        stack.push(next);
      } else {
        stack.pop();
      }
    }

    // Add some extra paths for hard mode (create dead ends)
    if (difficulty === 'hard') {
      const extraPaths = Math.floor(size * size * 0.05);
      for (let i = 0; i < extraPaths; i++) {
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        const cell = grid[y][x];
        const wallDirs = Object.keys(cell.walls).filter(
          dir => cell.walls[dir as keyof typeof cell.walls]
        );
        if (wallDirs.length > 0) {
          const dir = wallDirs[Math.floor(Math.random() * wallDirs.length)];
          const dirMap: Record<string, { dx: number; dy: number; opposite: string }> = {
            top: { dx: 0, dy: -1, opposite: 'bottom' },
            right: { dx: 1, dy: 0, opposite: 'left' },
            bottom: { dx: 0, dy: 1, opposite: 'top' },
            left: { dx: -1, dy: 0, opposite: 'right' },
          };
          const { dx, dy, opposite } = dirMap[dir];
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            cell.walls[dir as keyof typeof cell.walls] = false;
            const neighbor = grid[ny][nx];
            (neighbor.walls as Record<string, boolean>)[opposite] = false;
          }
        }
      }
    }

    return grid;
  }, [difficulty]);

  // Initialize game
  useEffect(() => {
    const newMaze = generateMaze(config.size);
    setMaze(newMaze);
    setPlayerPos({ x: 0, y: 0 });
    setTrail([{ x: 0, y: 0 }]);
    setTimeElapsed(0);
    setMoveCount(0);
    setGameState('playing');
    startTime.current = Date.now();
  }, [difficulty, level, config.size, generateMaze]);

  // Check if position is in fog
  const isInFog = useCallback((x: number, y: number): boolean => {
    if (config.fogRadius === Infinity) return false;
    const dx = Math.abs(x - playerPos.x);
    const dy = Math.abs(y - playerPos.y);
    return dx > config.fogRadius || dy > config.fogRadius;
  }, [playerPos, config.fogRadius]);

  // Draw maze
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || maze.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cellSize = ACTUAL_CELL_SIZE;

    // Draw fog of war (if insane mode)
    if (difficulty === 'insane') {
      ctx.fillStyle = '#000000';
      for (let y = 0; y < config.size; y++) {
        for (let x = 0; x < config.size; x++) {
          if (isInFog(x, y)) {
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }
    }

    // Draw trail
    ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
    for (const pos of trail) {
      if (!isInFog(pos.x, pos.y)) {
        ctx.beginPath();
        ctx.arc(
          pos.x * cellSize + cellSize / 2,
          pos.y * cellSize + cellSize / 2,
          cellSize * 0.2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    // Draw maze walls
    ctx.strokeStyle = '#4a4a6a';
    ctx.lineWidth = 2;
    for (let y = 0; y < config.size; y++) {
      for (let x = 0; x < config.size; x++) {
        if (isInFog(x, y)) continue;

        const cell = maze[y][x];
        const px = x * cellSize;
        const py = y * cellSize;

        ctx.beginPath();
        if (cell.walls.top) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + cellSize, py);
        }
        if (cell.walls.right) {
          ctx.moveTo(px + cellSize, py);
          ctx.lineTo(px + cellSize, py + cellSize);
        }
        if (cell.walls.bottom) {
          ctx.moveTo(px, py + cellSize);
          ctx.lineTo(px + cellSize, py + cellSize);
        }
        if (cell.walls.left) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cellSize);
        }
        ctx.stroke();
      }
    }

    // Draw goal (pulsing magenta)
    const goalX = config.size - 1;
    const goalY = config.size - 1;
    if (!isInFog(goalX, goalY)) {
      const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff00ff';
      ctx.fillStyle = `rgba(255, 0, 255, ${pulse})`;
      ctx.fillRect(
        goalX * cellSize + cellSize * 0.2,
        goalY * cellSize + cellSize * 0.2,
        cellSize * 0.6,
        cellSize * 0.6
      );
      ctx.shadowBlur = 0;
    }

    // Draw player (bright cyan circle with glow)
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(
      playerPos.x * cellSize + cellSize / 2,
      playerPos.y * cellSize + cellSize / 2,
      cellSize * 0.3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [maze, playerPos, trail, config.size, difficulty, isInFog, ACTUAL_CELL_SIZE]);

  // Move player
  const movePlayer = useCallback((dx: number, dy: number) => {
    if (gameState !== 'playing' || maze.length === 0) return;

    const now = Date.now();
    if (now - lastMoveTime.current < MOVE_COOLDOWN) return;

    const newX = playerPos.x + dx;
    const newY = playerPos.y + dy;

    // Check bounds
    if (newX < 0 || newX >= config.size || newY < 0 || newY >= config.size) return;

    // Check walls
    const currentCell = maze[playerPos.y][playerPos.x];
    if (dx === 1 && currentCell.walls.right) return;
    if (dx === -1 && currentCell.walls.left) return;
    if (dy === 1 && currentCell.walls.bottom) return;
    if (dy === -1 && currentCell.walls.top) return;

    lastMoveTime.current = now;
    setPlayerPos({ x: newX, y: newY });
    setMoveCount(prev => prev + 1);
    setTrail(prev => [...prev, { x: newX, y: newY }]);
    playClick();

    // Check win condition
    if (newX === config.size - 1 && newY === config.size - 1) {
      const elapsed = (Date.now() - startTime.current) / 1000;
      const maxScore = config.timeLimit || 120;
      const score = Math.max(0, Math.floor(maxScore - elapsed));
      setGameState('won');
      playSuccess();
      setTimeout(() => onComplete(score, maxScore), 500);
    }
  }, [gameState, maze, playerPos, config.size, config.timeLimit, onComplete]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
        keysPressed.current.add(key);
      }
      if (key === 'escape') {
        onBack();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onBack]);

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
      if (gameState !== 'playing') return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const dx = touchEndX - touchStartX;
      const dy = touchEndY - touchStartY;

      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx > 30) {
          handleMobileMove(1, 0);
        } else if (dx < -30) {
          handleMobileMove(-1, 0);
        }
      } else {
        // Vertical swipe
        if (dy > 30) {
          handleMobileMove(0, 1);
        } else if (dy < -30) {
          handleMobileMove(0, -1);
        }
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const loop = () => {
      // Process input
      if (keysPressed.current.has('arrowup') || keysPressed.current.has('w')) {
        movePlayer(0, -1);
      } else if (keysPressed.current.has('arrowdown') || keysPressed.current.has('s')) {
        movePlayer(0, 1);
      } else if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) {
        movePlayer(-1, 0);
      } else if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) {
        movePlayer(1, 0);
      }

      // Update timer
      const elapsed = (Date.now() - startTime.current) / 1000;
      setTimeElapsed(elapsed);

      // Check timeout
      if (config.timeLimit > 0 && elapsed >= config.timeLimit) {
        setGameState('lost');
        playFailure();
        return;
      }

      draw();
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, movePlayer, draw, config.timeLimit]);

  // Mobile controls
  const handleMobileMove = (dx: number, dy: number) => {
    movePlayer(dx, dy);
  };

  const timeLeft = config.timeLimit > 0 ? Math.max(0, config.timeLimit - timeElapsed) : null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-6 max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Back
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Maze Runner</h2>
            <p className="text-sm text-gray-400">
              Level {level} - {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </p>
          </div>
          <div className="w-20"></div>
        </div>

        {/* Stats */}
        <div className="flex justify-around mb-4 text-white">
          <div className="text-center">
            <div className="text-sm text-gray-400">Time</div>
            <div className="text-xl font-bold">
              {timeLeft !== null ? (
                <span className={timeLeft < 10 ? 'text-red-400' : ''}>
                  {timeLeft.toFixed(1)}s
                </span>
              ) : (
                <span>{timeElapsed.toFixed(1)}s</span>
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Moves</div>
            <div className="text-xl font-bold">{moveCount}</div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="border-4 border-purple-600 rounded-lg bg-gray-900"
          />
        </div>

        {/* Instructions */}
        <div className="text-center text-gray-300 text-sm mb-4">
          <p>🎮 Arrow Keys / WASD / Swipe to navigate • ESC to quit</p>
          <p className="text-xs text-gray-500 mt-1">
            Reach the pulsing magenta goal at the bottom-right
          </p>
        </div>

        {/* Mobile Controls */}
        <div className="flex justify-center gap-2 mb-4">
          <div className="grid grid-cols-3 gap-2">
            <div></div>
            <button
              onClick={() => handleMobileMove(0, -1)}
              className="w-12 h-12 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center text-2xl active:bg-gray-500 transition-colors"
            >
              ↑
            </button>
            <div></div>
            <button
              onClick={() => handleMobileMove(-1, 0)}
              className="w-12 h-12 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center text-2xl active:bg-gray-500 transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => handleMobileMove(0, 1)}
              className="w-12 h-12 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center text-2xl active:bg-gray-500 transition-colors"
            >
              ↓
            </button>
            <button
              onClick={() => handleMobileMove(1, 0)}
              className="w-12 h-12 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center text-2xl active:bg-gray-500 transition-colors"
            >
              →
            </button>
          </div>
        </div>

        {/* Game Over */}
        {gameState === 'lost' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg">
            <div className="bg-gray-800 p-8 rounded-lg text-center">
              <h3 className="text-3xl font-bold text-red-400 mb-4">Time's Up!</h3>
              <p className="text-gray-300 mb-6">You ran out of time</p>
              <button
                onClick={onBack}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Back to Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MazeRunner;
