'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { playClick, playSuccess, playFailure, playPop } from '@/lib/sound';

type Difficulty = 'easy' | 'hard' | 'insane';

interface PongClassicProps {
  difficulty: Difficulty;
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

const PongClassic: React.FC<PongClassicProps> = ({ difficulty, level, onComplete, onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 500 });

  // Game configuration based on difficulty
  const getConfig = () => {
    switch (difficulty) {
      case 'easy':
        return { ballSpeed: 4, paddleSpeed: 6, aiSpeed: 3, targetScore: 5 + level };
      case 'hard':
        return { ballSpeed: 6, paddleSpeed: 7, aiSpeed: 5, targetScore: 7 + level };
      case 'insane':
        return { ballSpeed: 8, paddleSpeed: 8, aiSpeed: 7, targetScore: 10 + level };
      default:
        return { ballSpeed: 4, paddleSpeed: 6, aiSpeed: 3, targetScore: 5 };
    }
  };

  const config = getConfig();

  // Game state refs
  const ballRef = useRef({ x: 400, y: 250, vx: 4, vy: 3 });
  const playerPaddleRef = useRef({ y: 200 });
  const aiPaddleRef = useRef({ y: 200 });
  const keysRef = useRef({ up: false, down: false });
  const gameLoopRef = useRef<number | null>(null);
  const gameStateRef = useRef<'playing' | 'paused' | 'gameOver' | 'won'>('playing');
  const playerScoreRef = useRef(0);
  const aiScoreRef = useRef(0);

  const PADDLE_WIDTH = 15;
  const PADDLE_HEIGHT = 100;
  const BALL_SIZE = 12;

  // Handle canvas resize
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        const width = Math.min(container.clientWidth - 32, 800);
        const height = Math.min(window.innerHeight - 200, 500);
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Initialize game
  const initializeGame = useCallback(() => {
    ballRef.current = {
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      vx: config.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
      vy: config.ballSpeed * (Math.random() * 2 - 1),
    };
    playerPaddleRef.current = { y: canvasSize.height / 2 - PADDLE_HEIGHT / 2 };
    aiPaddleRef.current = { y: canvasSize.height / 2 - PADDLE_HEIGHT / 2 };
    playerScoreRef.current = 0;
    aiScoreRef.current = 0;
    setPlayerScore(0);
    setAiScore(0);
    gameStateRef.current = 'playing';
    setGameState('playing');
  }, [canvasSize, config]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp') {
        e.preventDefault();
        keysRef.current.up = true;
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        keysRef.current.down = true;
      } else if (e.code === 'Escape') {
        onBack();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp') {
        keysRef.current.up = false;
      } else if (e.code === 'ArrowDown') {
        keysRef.current.down = false;
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

      // Update player paddle
      if (keysRef.current.up) {
        playerPaddleRef.current.y = Math.max(0, playerPaddleRef.current.y - config.paddleSpeed);
      }
      if (keysRef.current.down) {
        playerPaddleRef.current.y = Math.min(
          canvasSize.height - PADDLE_HEIGHT,
          playerPaddleRef.current.y + config.paddleSpeed
        );
      }

      // Update AI paddle
      const aiTarget = ballRef.current.y - PADDLE_HEIGHT / 2;
      if (aiPaddleRef.current.y < aiTarget - 10) {
        aiPaddleRef.current.y = Math.min(
          canvasSize.height - PADDLE_HEIGHT,
          aiPaddleRef.current.y + config.aiSpeed
        );
      } else if (aiPaddleRef.current.y > aiTarget + 10) {
        aiPaddleRef.current.y = Math.max(0, aiPaddleRef.current.y - config.aiSpeed);
      }

      // Update ball
      ballRef.current.x += ballRef.current.vx;
      ballRef.current.y += ballRef.current.vy;

      // Ball collision with top/bottom walls
      if (ballRef.current.y <= 0 || ballRef.current.y >= canvasSize.height - BALL_SIZE) {
        ballRef.current.vy *= -1;
        playPop();
      }

      // Ball collision with player paddle
      if (
        ballRef.current.x <= 30 &&
        ballRef.current.x >= 15 &&
        ballRef.current.y >= playerPaddleRef.current.y &&
        ballRef.current.y <= playerPaddleRef.current.y + PADDLE_HEIGHT
      ) {
        ballRef.current.vx = Math.abs(ballRef.current.vx);
        const hitPos = (ballRef.current.y - playerPaddleRef.current.y) / PADDLE_HEIGHT;
        ballRef.current.vy = (hitPos - 0.5) * config.ballSpeed * 2;
        playPop();
      }

      // Ball collision with AI paddle
      if (
        ballRef.current.x >= canvasSize.width - 30 - BALL_SIZE &&
        ballRef.current.x <= canvasSize.width - 15 &&
        ballRef.current.y >= aiPaddleRef.current.y &&
        ballRef.current.y <= aiPaddleRef.current.y + PADDLE_HEIGHT
      ) {
        ballRef.current.vx = -Math.abs(ballRef.current.vx);
        const hitPos = (ballRef.current.y - aiPaddleRef.current.y) / PADDLE_HEIGHT;
        ballRef.current.vy = (hitPos - 0.5) * config.ballSpeed * 2;
        playPop();
      }

      // Score points
      if (ballRef.current.x < 0) {
        aiScoreRef.current++;
        setAiScore(aiScoreRef.current);
        playFailure();
        resetBall();

        if (aiScoreRef.current >= config.targetScore) {
          gameOver();
        }
      } else if (ballRef.current.x > canvasSize.width) {
        playerScoreRef.current++;
        setPlayerScore(playerScoreRef.current);
        playSuccess();
        resetBall();

        if (playerScoreRef.current >= config.targetScore) {
          winGame();
        }
      }
    };

    const resetBall = () => {
      ballRef.current = {
        x: canvasSize.width / 2,
        y: canvasSize.height / 2,
        vx: config.ballSpeed * (Math.random() > 0.5 ? 1 : -1),
        vy: config.ballSpeed * (Math.random() * 2 - 1),
      };
    };

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw center line
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(canvasSize.width / 2, 0);
      ctx.lineTo(canvasSize.width / 2, canvasSize.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw player paddle (left)
      const playerGradient = ctx.createLinearGradient(15, playerPaddleRef.current.y, 15 + PADDLE_WIDTH, playerPaddleRef.current.y + PADDLE_HEIGHT);
      playerGradient.addColorStop(0, '#00f0ff');
      playerGradient.addColorStop(1, '#00ff88');
      ctx.fillStyle = playerGradient;
      ctx.fillRect(15, playerPaddleRef.current.y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f0ff';
      ctx.strokeRect(15, playerPaddleRef.current.y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.shadowBlur = 0;

      // Draw AI paddle (right)
      const aiGradient = ctx.createLinearGradient(canvasSize.width - 30, aiPaddleRef.current.y, canvasSize.width - 30 + PADDLE_WIDTH, aiPaddleRef.current.y + PADDLE_HEIGHT);
      aiGradient.addColorStop(0, '#ff00aa');
      aiGradient.addColorStop(1, '#f0ff00');
      ctx.fillStyle = aiGradient;
      ctx.fillRect(canvasSize.width - 30, aiPaddleRef.current.y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ff00aa';
      ctx.strokeRect(canvasSize.width - 30, aiPaddleRef.current.y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.shadowBlur = 0;

      // Draw ball
      const ballGradient = ctx.createRadialGradient(
        ballRef.current.x + BALL_SIZE / 2,
        ballRef.current.y + BALL_SIZE / 2,
        2,
        ballRef.current.x + BALL_SIZE / 2,
        ballRef.current.y + BALL_SIZE / 2,
        BALL_SIZE / 2
      );
      ballGradient.addColorStop(0, '#ffffff');
      ballGradient.addColorStop(1, '#f0ff00');
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.arc(ballRef.current.x + BALL_SIZE / 2, ballRef.current.y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#f0ff00';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw scores
      ctx.font = 'bold 48px Orbitron, sans-serif';
      ctx.textAlign = 'center';

      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f0ff';
      ctx.fillText(playerScoreRef.current.toString(), canvasSize.width / 4, 60);

      ctx.fillStyle = '#ff00aa';
      ctx.shadowColor = '#ff00aa';
      ctx.fillText(aiScoreRef.current.toString(), (canvasSize.width * 3) / 4, 60);
      ctx.shadowBlur = 0;

      // Draw target score
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText(`First to ${config.targetScore}`, canvasSize.width / 2, canvasSize.height - 20);
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
      onComplete(playerScoreRef.current, config.targetScore);
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

  // Mobile controls handlers
  const handleMobileUp = () => {
    keysRef.current.up = true;
    setTimeout(() => { keysRef.current.up = false; }, 100);
  };

  const handleMobileDown = () => {
    keysRef.current.down = true;
    setTimeout(() => { keysRef.current.down = false; }, 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 24, color: '#00f0ff' }}>
          You: {playerScore}
        </div>
        <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 24, color: '#ff00aa' }}>
          AI: {aiScore}
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
        <p>🎮 Arrow Keys (↑↓) / Tap buttons to move • ESC to quit</p>
        <p>First to {config.targetScore} wins!</p>
        {gameState === 'gameOver' && (
          <p style={{ color: '#ff00aa', fontWeight: 'bold' }}>AI Wins! Try Again!</p>
        )}
        {gameState === 'won' && (
          <p style={{ color: '#00ff88', fontWeight: 'bold' }}>You Win! 🎉</p>
        )}
      </div>

      {/* Mobile Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onMouseDown={handleMobileUp}
          onTouchStart={handleMobileUp}
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
          ▲
        </button>
        <button
          onMouseDown={handleMobileDown}
          onTouchStart={handleMobileDown}
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
          ▼
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

export default PongClassic;
