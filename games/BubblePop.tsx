import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playClick, playSuccess, playFailure, playPop } from '@/lib/sound';

interface BubblePopProps {
  difficulty: 'easy' | 'hard' | 'insane';
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

interface Bubble {
  id: number;
  number: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  popped: boolean;
  shaking: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
}

const BubblePop: React.FC<BubblePopProps> = ({ difficulty, level, onComplete, onBack }) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [nextNumber, setNextNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [poppingBubble, setPoppingBubble] = useState<number | null>(null);

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout>(null);
  const movementIntervalRef = useRef<NodeJS.Timeout>(null);

  const GAME_WIDTH = 500;
  const GAME_HEIGHT = 500;

  const bubbleColors = [
    'radial-gradient(circle at 30% 30%, rgba(0, 255, 255, 0.8), rgba(0, 200, 255, 0.5))',
    'radial-gradient(circle at 30% 30%, rgba(255, 0, 255, 0.8), rgba(200, 0, 255, 0.5))',
    'radial-gradient(circle at 30% 30%, rgba(0, 255, 100, 0.8), rgba(0, 200, 80, 0.5))',
    'radial-gradient(circle at 30% 30%, rgba(255, 255, 0, 0.8), rgba(255, 200, 0, 0.5))',
    'radial-gradient(circle at 30% 30%, rgba(255, 100, 200, 0.8), rgba(255, 50, 150, 0.5))',
    'radial-gradient(circle at 30% 30%, rgba(100, 200, 255, 0.8), rgba(50, 150, 255, 0.5))',
  ];

  const getDifficultySettings = () => {
    switch (difficulty) {
      case 'easy':
        return {
          bubbleCount: 5 + level,
          bubbleSize: 60,
          hasTimer: false,
          timerDuration: 0,
          movementSpeed: 0,
        };
      case 'hard':
        return {
          bubbleCount: 8 + level,
          bubbleSize: 45,
          hasTimer: true,
          timerDuration: 30,
          movementSpeed: 0.5,
        };
      case 'insane':
        return {
          bubbleCount: 12 + level,
          bubbleSize: 35,
          hasTimer: true,
          timerDuration: 20,
          movementSpeed: 1.5,
        };
    }
  };

  const settings = getDifficultySettings();

  const initializeBubbles = useCallback(() => {
    const newBubbles: Bubble[] = [];
    const padding = settings.bubbleSize / 2 + 10;

    for (let i = 0; i < settings.bubbleCount; i++) {
      let x: number = 0, y: number = 0;
      let attempts = 0;
      const maxAttempts = 100;

      // Try to place bubble without overlap
      do {
        x = Math.random() * (GAME_WIDTH - settings.bubbleSize - 2 * padding) + padding;
        y = Math.random() * (GAME_HEIGHT - settings.bubbleSize - 2 * padding) + padding;
        attempts++;

        // For insane mode, allow some overlap after many attempts
        if (difficulty === 'insane' && attempts > maxAttempts / 2) {
          break;
        }
      } while (
        attempts < maxAttempts &&
        newBubbles.some(bubble => {
          const dx = bubble.x - x;
          const dy = bubble.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < settings.bubbleSize + 10;
        })
      );

      // Random velocity for movement
      const angle = Math.random() * Math.PI * 2;
      const speed = settings.movementSpeed;

      newBubbles.push({
        id: i,
        number: i + 1,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: settings.bubbleSize,
        color: bubbleColors[i % bubbleColors.length],
        popped: false,
        shaking: false,
      });
    }

    setBubbles(newBubbles);
  }, [difficulty, level, settings.bubbleCount, settings.bubbleSize, settings.movementSpeed]);

  useEffect(() => {
    initializeBubbles();
    setGameStarted(true);

    if (settings.hasTimer) {
      setTimeLeft(settings.timerDuration);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (movementIntervalRef.current) {
        clearInterval(movementIntervalRef.current);
      }
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (settings.hasTimer && gameStarted && !gameOver && timeLeft !== null) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 0) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [settings.hasTimer, gameStarted, gameOver, timeLeft]);

  // Check if time ran out
  useEffect(() => {
    if (settings.hasTimer && timeLeft === 0 && !gameOver) {
      endGame();
    }
  }, [timeLeft, gameOver, settings.hasTimer]);

  // Bubble movement
  useEffect(() => {
    if (settings.movementSpeed > 0 && gameStarted && !gameOver) {
      movementIntervalRef.current = setInterval(() => {
        setBubbles(prevBubbles =>
          prevBubbles.map(bubble => {
            if (bubble.popped) return bubble;

            let newX = bubble.x + bubble.vx;
            let newY = bubble.y + bubble.vy;
            let newVx = bubble.vx;
            let newVy = bubble.vy;

            const radius = bubble.size / 2;

            // Bounce off walls
            if (newX - radius < 0 || newX + radius > GAME_WIDTH) {
              newVx = -newVx;
              newX = Math.max(radius, Math.min(GAME_WIDTH - radius, newX));
            }

            if (newY - radius < 0 || newY + radius > GAME_HEIGHT) {
              newVy = -newVy;
              newY = Math.max(radius, Math.min(GAME_HEIGHT - radius, newY));
            }

            return {
              ...bubble,
              x: newX,
              y: newY,
              vx: newVx,
              vy: newVy,
            };
          })
        );
      }, 1000 / 60); // 60 FPS

      return () => {
        if (movementIntervalRef.current) {
          clearInterval(movementIntervalRef.current);
        }
      };
    }
  }, [settings.movementSpeed, gameStarted, gameOver]);

  // Particle animation
  useEffect(() => {
    if (particles.length > 0) {
      const animate = () => {
        setParticles(prevParticles => {
          const updated = prevParticles
            .map(particle => ({
              ...particle,
              x: particle.x + particle.vx,
              y: particle.y + particle.vy,
              vy: particle.vy + 0.2, // Gravity
              life: particle.life - 1,
            }))
            .filter(particle => particle.life > 0);

          if (updated.length > 0) {
            animationFrameRef.current = requestAnimationFrame(animate);
          }

          return updated;
        });
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [particles.length]);

  const createParticles = (x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    const particleCount = 8;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = 2 + Math.random() * 2;

      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color,
        life: 30,
      });
    }

    setParticles(prev => [...prev, ...newParticles]);
  };

  const handleBubbleClick = (bubble: Bubble) => {
    if (bubble.popped || gameOver || poppingBubble !== null) return;

    playClick();

    if (bubble.number === nextNumber) {
      // Correct bubble
      playPop();
      setPoppingBubble(bubble.id);

      // Create particles
      createParticles(bubble.x, bubble.y, bubble.color);

      // Mark as popped after animation starts
      setTimeout(() => {
        setBubbles(prevBubbles =>
          prevBubbles.map(b =>
            b.id === bubble.id ? { ...b, popped: true } : b
          )
        );
        setPoppingBubble(null);
        setScore(prev => prev + 1);
        setNextNumber(prev => prev + 1);

        // Check if all bubbles popped
        const allPopped = bubbles.filter(b => !b.popped).length === 1; // This one will be popped
        if (allPopped) {
          playSuccess();
          setTimeout(() => endGame(), 500);
        }
      }, 300);
    } else {
      // Wrong bubble
      playFailure();
      setBubbles(prevBubbles =>
        prevBubbles.map(b =>
          b.id === bubble.id ? { ...b, shaking: true } : b
        )
      );

      setTimeout(() => {
        setBubbles(prevBubbles =>
          prevBubbles.map(b =>
            b.id === bubble.id ? { ...b, shaking: false } : b
          )
        );
      }, 500);
    }
  };

  const endGame = () => {
    setGameOver(true);
    const maxScore = settings.bubbleCount;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (movementIntervalRef.current) {
      clearInterval(movementIntervalRef.current);
    }

    setTimeout(() => {
      onComplete(score, maxScore);
    }, 1000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght:400;700&display=swap');

        .bubble {
          font-family: 'Orbitron', monospace;
          cursor: pointer;
          user-select: none;
          transition: transform 0.1s;
        }

        .bubble:hover {
          transform: scale(1.05);
        }

        .bubble-popping {
          animation: pop 0.3s ease-out forwards;
        }

        .bubble-shaking {
          animation: shake 0.5s ease-in-out;
          background: radial-gradient(circle at 30% 30%, rgba(255, 0, 0, 0.8), rgba(200, 0, 0, 0.5)) !important;
        }

        @keyframes pop {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.5;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          10% { transform: translateX(-5px) rotate(-5deg); }
          20% { transform: translateX(5px) rotate(5deg); }
          30% { transform: translateX(-5px) rotate(-5deg); }
          40% { transform: translateX(5px) rotate(5deg); }
          50% { transform: translateX(-5px) rotate(-5deg); }
          60% { transform: translateX(5px) rotate(5deg); }
          70% { transform: translateX(-5px) rotate(-5deg); }
          80% { transform: translateX(5px) rotate(5deg); }
          90% { transform: translateX(-5px) rotate(-5deg); }
        }

        .particle {
          pointer-events: none;
          border-radius: 50%;
        }

        .glass-highlight {
          position: absolute;
          top: 15%;
          left: 20%;
          width: 30%;
          height: 30%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.6), transparent);
          border-radius: 50%;
          pointer-events: none;
        }
      `}</style>

      {/* Header */}
      <div className="w-full max-w-[500px] mb-4 flex justify-between items-center">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Back
        </button>

        <div className="text-white text-xl font-bold">
          Level {level}
        </div>

        {settings.hasTimer && timeLeft !== null && (
          <div className={`text-xl font-bold px-4 py-2 rounded-lg ${
            timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'
          }`}>
            {formatTime(timeLeft)}
          </div>
        )}
        {!settings.hasTimer && <div className="w-20"></div>}
      </div>

      {/* Next Number Indicator */}
      <div className="mb-4 text-white text-center">
        <div className="text-sm opacity-75 mb-1">Pop bubble:</div>
        <div className="text-5xl font-bold" style={{ fontFamily: 'Orbitron, monospace' }}>
          {nextNumber}
        </div>
      </div>

      {/* Score */}
      <div className="mb-4 text-white text-xl">
        Score: <span className="font-bold">{score}</span> / {settings.bubbleCount}
      </div>

      {/* Game Container */}
      <div
        ref={gameContainerRef}
        className="relative bg-gradient-to-br from-indigo-950 to-purple-950 rounded-xl shadow-2xl overflow-hidden"
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          border: '3px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Bubbles */}
        {bubbles.map(bubble => {
          if (bubble.popped && poppingBubble !== bubble.id) return null;

          return (
            <div
              key={bubble.id}
              className={`bubble absolute flex items-center justify-center ${
                poppingBubble === bubble.id ? 'bubble-popping' : ''
              } ${bubble.shaking ? 'bubble-shaking' : ''}`}
              style={{
                left: bubble.x - bubble.size / 2,
                top: bubble.y - bubble.size / 2,
                width: bubble.size,
                height: bubble.size,
                background: bubble.color,
                borderRadius: '50%',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)',
              }}
              onClick={() => handleBubbleClick(bubble)}
            >
              <div className="glass-highlight"></div>
              <span
                className="relative z-10 text-white font-bold"
                style={{
                  fontSize: bubble.size * 0.4,
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                  fontFamily: 'Orbitron, monospace',
                }}
              >
                {bubble.number}
              </span>
            </div>
          );
        })}

        {/* Particles */}
        {particles.map(particle => (
          <div
            key={particle.id}
            className="particle absolute"
            style={{
              left: particle.x,
              top: particle.y,
              width: 8,
              height: 8,
              background: particle.color,
              opacity: particle.life / 30,
            }}
          />
        ))}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="text-4xl font-bold mb-4">Game Over!</div>
              <div className="text-2xl">
                Score: {score} / {settings.bubbleCount}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-white text-center text-sm opacity-75 max-w-[500px]">
        Click the bubbles in order from smallest to largest number
      </div>
    </div>
  );
};

export default BubblePop;
