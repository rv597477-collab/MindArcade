'use client';

import React, { useRef, useEffect, useState } from 'react';
import { playClick, playSuccess, playFailure, playPop } from '@/lib/sound';

interface BrickBreakerProps {
  difficulty: 'easy' | 'hard' | 'insane';
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  hits: number;
  maxHits: number;
  color: string;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const BrickBreaker: React.FC<BrickBreakerProps> = ({ difficulty, level, onComplete, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);

  const gameStateRef = useRef({
    paddle: { x: 0, y: 0, width: 0, height: 15 },
    balls: [] as Ball[],
    bricks: [] as Brick[],
    particles: [] as Particle[],
    mouseX: 0,
    lives: 3,
    score: 0,
    maxScore: 0,
    animationId: 0,
    gameStarted: false,
    gameOver: false,
    speed: 0,
    canvasWidth: 500,
    canvasHeight: 375,
  });

  const neonColors = ['#00f0ff', '#ff00aa', '#f0ff00', '#00ff88', '#ff4444', '#aa44ff'];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup canvas size
    const setupCanvas = () => {
      const maxWidth = 500;
      const width = Math.min(maxWidth, window.innerWidth - 40);
      const height = width * 0.75;

      canvas.width = width;
      canvas.height = height;

      gameStateRef.current.canvasWidth = width;
      gameStateRef.current.canvasHeight = height;
    };

    setupCanvas();
    window.addEventListener('resize', setupCanvas);

    // Initialize game
    const initGame = () => {
      const state = gameStateRef.current;
      const { canvasWidth, canvasHeight } = state;

      // Set paddle based on difficulty
      let paddleWidth = 120;
      let ballSpeed = 3;
      let rows = 4 + level;

      if (difficulty === 'hard') {
        paddleWidth = 80;
        ballSpeed = 5;
        rows = 5 + level;
      } else if (difficulty === 'insane') {
        paddleWidth = 50;
        ballSpeed = 6;
        rows = 6 + level;
      }

      state.paddle = {
        x: canvasWidth / 2 - paddleWidth / 2,
        y: canvasHeight - 30,
        width: paddleWidth,
        height: 15,
      };

      state.speed = ballSpeed;

      // Initialize ball
      const ball: Ball = {
        x: canvasWidth / 2,
        y: canvasHeight / 2,
        dx: ballSpeed * (Math.random() > 0.5 ? 1 : -1),
        dy: -ballSpeed,
        radius: 6,
      };
      state.balls = [ball];

      // Create bricks
      const bricksPerRow = canvasWidth < 400 ? 8 : 10;
      const gap = 5;
      const brickWidth = canvasWidth / bricksPerRow - gap;
      const brickHeight = 20;
      const bricks: Brick[] = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < bricksPerRow; col++) {
          let maxHits = 1;

          if (difficulty === 'hard' && Math.random() < 0.3) {
            maxHits = 2;
          } else if (difficulty === 'insane') {
            const rand = Math.random();
            if (rand < 0.2) {
              maxHits = 3;
            } else if (rand < 0.5) {
              maxHits = 2;
            }
          }

          bricks.push({
            x: col * (brickWidth + gap) + gap / 2,
            y: row * (brickHeight + gap) + 40,
            width: brickWidth,
            height: brickHeight,
            hits: 0,
            maxHits,
            color: neonColors[row % neonColors.length],
          });
        }
      }

      state.bricks = bricks;
      state.particles = [];
      state.lives = 3;
      state.score = 0;
      state.maxScore = bricks.length;
      state.gameStarted = true;
      state.gameOver = false;

      setLives(3);
      setScore(0);
      setMaxScore(bricks.length);
      setGameOver(false);
      setIsPaused(false);
    };

    initGame();

    // Mouse/Touch movement
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      gameStateRef.current.mouseX = e.clientX - rect.left;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      gameStateRef.current.mouseX = touch.clientX - rect.left;
    };

    const handleClick = () => {
      if (gameStateRef.current.gameOver) return;
      playClick();
      setIsPaused(prev => !prev);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('click', handleClick);

    // Collision detection
    const checkBallBrickCollision = (ball: Ball, brick: Brick): boolean => {
      return (
        ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brick.width &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brick.height
      );
    };

    const checkBallPaddleCollision = (ball: Ball, paddle: typeof gameStateRef.current.paddle): boolean => {
      return (
        ball.x + ball.radius > paddle.x &&
        ball.x - ball.radius < paddle.x + paddle.width &&
        ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height
      );
    };

    const createParticles = (x: number, y: number, color: string) => {
      const state = gameStateRef.current;
      const particleCount = 6;

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = 2 + Math.random() * 2;

        state.particles.push({
          x,
          y,
          dx: Math.cos(angle) * speed,
          dy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 30,
          color,
          size: 3 + Math.random() * 2,
        });
      }
    };

    // Game loop
    const gameLoop = () => {
      if (!ctx || !canvas) return;

      const state = gameStateRef.current;

      if (isPaused || state.gameOver) {
        state.animationId = requestAnimationFrame(gameLoop);
        return;
      }

      // Clear canvas
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);

      // Update paddle position
      const paddleSpeed = 0.2;
      const targetX = state.mouseX - state.paddle.width / 2;
      state.paddle.x += (targetX - state.paddle.x) * paddleSpeed;

      // Keep paddle in bounds
      if (state.paddle.x < 0) state.paddle.x = 0;
      if (state.paddle.x + state.paddle.width > state.canvasWidth) {
        state.paddle.x = state.canvasWidth - state.paddle.width;
      }

      // Draw paddle
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00f0ff';
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(state.paddle.x, state.paddle.y, state.paddle.width, state.paddle.height);
      ctx.shadowBlur = 0;

      // Update and draw balls
      const ballsToRemove: number[] = [];

      state.balls.forEach((ball, ballIndex) => {
        // Update ball position
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall collision
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > state.canvasWidth) {
          ball.dx *= -1;
          playPop();
        }
        if (ball.y - ball.radius < 0) {
          ball.dy *= -1;
          playPop();
        }

        // Ball falls below paddle
        if (ball.y - ball.radius > state.canvasHeight) {
          ballsToRemove.push(ballIndex);

          // Only lose life if this is the last ball
          if (state.balls.length === 1) {
            state.lives--;
            setLives(state.lives);
            playFailure();

            if (state.lives <= 0) {
              state.gameOver = true;
              setGameOver(true);

              // Calculate stars based on completion
              const percentComplete = state.score / state.maxScore;
              let stars = 0;
              if (percentComplete >= 0.5) stars = 1;

              setTimeout(() => {
                onComplete(state.score, state.maxScore);
              }, 500);
            } else {
              // Reset ball
              ball.x = state.canvasWidth / 2;
              ball.y = state.canvasHeight / 2;
              ball.dx = state.speed * (Math.random() > 0.5 ? 1 : -1);
              ball.dy = -state.speed;
            }
          }
        }

        // Paddle collision
        if (checkBallPaddleCollision(ball, state.paddle) && ball.dy > 0) {
          ball.dy *= -1;

          // Add spin based on where ball hits paddle
          const hitPos = (ball.x - state.paddle.x) / state.paddle.width;
          ball.dx = (hitPos - 0.5) * state.speed * 2;

          // Normalize speed
          const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
          ball.dx = (ball.dx / speed) * state.speed;
          ball.dy = (ball.dy / speed) * state.speed;

          playPop();
        }

        // Brick collision
        state.bricks.forEach((brick, brickIndex) => {
          if (checkBallBrickCollision(ball, brick)) {
            // Determine collision side
            const ballCenterX = ball.x;
            const ballCenterY = ball.y;
            const brickCenterX = brick.x + brick.width / 2;
            const brickCenterY = brick.y + brick.height / 2;

            const dx = ballCenterX - brickCenterX;
            const dy = ballCenterY - brickCenterY;

            if (Math.abs(dx / brick.width) > Math.abs(dy / brick.height)) {
              ball.dx *= -1;
            } else {
              ball.dy *= -1;
            }

            brick.hits++;

            if (brick.hits >= brick.maxHits) {
              // Brick destroyed
              createParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color);
              state.bricks.splice(brickIndex, 1);
              state.score++;
              setScore(state.score);
              playSuccess();

              // Check win condition
              if (state.bricks.length === 0) {
                state.gameOver = true;
                setGameOver(true);

                // Calculate stars
                let stars = 2; // All bricks cleared
                if (state.lives >= 2) stars = 3;

                setTimeout(() => {
                  onComplete(state.score, state.maxScore);
                }, 500);
              }

              // Insane mode: occasionally spawn second ball
              if (difficulty === 'insane' && Math.random() < 0.15 && state.balls.length < 3) {
                const newBall: Ball = {
                  x: brick.x + brick.width / 2,
                  y: brick.y + brick.height / 2,
                  dx: state.speed * (Math.random() > 0.5 ? 1 : -1),
                  dy: state.speed,
                  radius: 6,
                };
                state.balls.push(newBall);
              }
            } else {
              playPop();
            }
          }
        });

        // Draw ball with glow trail
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Remove balls that fell
      ballsToRemove.reverse().forEach(index => {
        if (state.balls.length > 1) {
          state.balls.splice(index, 1);
        }
      });

      // Draw bricks
      state.bricks.forEach(brick => {
        const damageRatio = brick.hits / brick.maxHits;
        const alpha = 1 - damageRatio * 0.6;

        ctx.shadowBlur = 15 * alpha;
        ctx.shadowColor = brick.color;

        // Parse hex color and apply alpha
        const r = parseInt(brick.color.slice(1, 3), 16);
        const g = parseInt(brick.color.slice(3, 5), 16);
        const b = parseInt(brick.color.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

        // Draw cracks for damaged bricks
        if (brick.hits > 0) {
          ctx.strokeStyle = `rgba(0, 0, 0, ${damageRatio})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(brick.x + brick.width * 0.3, brick.y);
          ctx.lineTo(brick.x + brick.width * 0.4, brick.y + brick.height);
          ctx.moveTo(brick.x + brick.width * 0.7, brick.y);
          ctx.lineTo(brick.x + brick.width * 0.6, brick.y + brick.height);
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
      });

      // Update and draw particles
      state.particles = state.particles.filter(particle => {
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.dy += 0.1; // Gravity
        particle.life++;

        if (particle.life >= particle.maxLife) return false;

        const alpha = 1 - particle.life / particle.maxLife;
        const r = parseInt(particle.color.slice(1, 3), 16);
        const g = parseInt(particle.color.slice(3, 5), 16);
        const b = parseInt(particle.color.slice(5, 7), 16);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);

        return true;
      });

      state.animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.removeEventListener('resize', setupCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('click', handleClick);

      if (gameStateRef.current.animationId) {
        cancelAnimationFrame(gameStateRef.current.animationId);
      }
    };
  }, [difficulty, level, onComplete, isPaused]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="mb-4 flex items-center justify-between w-full max-w-[500px]">
        <button
          onClick={() => {
            playClick();
            onBack();
          }}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back
        </button>

        <div className="flex gap-4 text-white font-mono">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Lives:</span>
            <span className="text-cyan-400 font-bold">{lives}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Score:</span>
            <span className="text-cyan-400 font-bold">{score}/{maxScore}</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border-2 border-cyan-500 rounded-lg shadow-2xl shadow-cyan-500/20"
          style={{ maxWidth: '500px', width: '100%', height: 'auto' }}
        />

        {isPaused && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-2">PAUSED</h2>
              <p className="text-gray-400">Click to resume</p>
            </div>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4">
                {score === maxScore ? 'LEVEL COMPLETE!' : 'GAME OVER'}
              </h2>
              <p className="text-2xl text-cyan-400 mb-2">Score: {score}/{maxScore}</p>
              {lives > 0 && (
                <p className="text-green-400">Lives Remaining: {lives}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-gray-400 text-sm max-w-[500px]">
        <p>Move mouse/touch to control paddle</p>
        <p>Click/tap to pause • Break all bricks to win!</p>
        <p className="mt-2 text-cyan-400">
          {difficulty === 'easy' && 'Easy Mode: Wide paddle, slow ball'}
          {difficulty === 'hard' && 'Hard Mode: Medium paddle, faster ball, tough bricks'}
          {difficulty === 'insane' && 'Insane Mode: Narrow paddle, fast ball, extra tough bricks!'}
        </p>
      </div>
    </div>
  );
};

export default BrickBreaker;
