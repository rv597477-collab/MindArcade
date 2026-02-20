'use client';

import { useState, useEffect, useCallback } from 'react';
import { playClick, playSuccess, playFailure } from '@/lib/sound';

interface ColorMatchProps {
  difficulty: 'easy' | 'hard' | 'insane';
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

interface ColorOption {
  name: string;
  hex: string;
}

const COLORS: Record<string, ColorOption> = {
  RED: { name: 'RED', hex: '#ff4444' },
  BLUE: { name: 'BLUE', hex: '#4488ff' },
  GREEN: { name: 'GREEN', hex: '#44ff44' },
  YELLOW: { name: 'YELLOW', hex: '#ffff44' },
  PURPLE: { name: 'PURPLE', hex: '#aa44ff' },
  CYAN: { name: 'CYAN', hex: '#00f0ff' },
  MAGENTA: { name: 'MAGENTA', hex: '#ff00aa' },
  ORANGE: { name: 'ORANGE', hex: '#ff8844' },
};

export default function ColorMatch({ difficulty, level, onComplete, onBack }: ColorMatchProps) {
  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);
  const [word, setWord] = useState('');
  const [wordColor, setWordColor] = useState('');
  const [options, setOptions] = useState<ColorOption[]>([]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isInverseMode, setIsInverseMode] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);

  const getGameConfig = () => {
    switch (difficulty) {
      case 'easy':
        return {
          colors: ['RED', 'BLUE', 'GREEN'],
          totalRounds: 8 + level * 2,
          timePerRound: 10,
          matchChance: 0.5,
          inverseMode: false,
        };
      case 'hard':
        return {
          colors: ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'CYAN'],
          totalRounds: 10 + level * 2,
          timePerRound: 7,
          matchChance: 0,
          inverseMode: false,
        };
      case 'insane':
        return {
          colors: ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'CYAN', 'MAGENTA', 'ORANGE'],
          totalRounds: 12 + level * 2,
          timePerRound: 4,
          matchChance: 0,
          inverseMode: true,
        };
      default:
        return {
          colors: ['RED', 'BLUE', 'GREEN'],
          totalRounds: 8,
          timePerRound: 10,
          matchChance: 0.5,
          inverseMode: false,
        };
    }
  };

  const config = getGameConfig();

  const generateRound = useCallback(() => {
    const availableColors = config.colors;

    // Determine if this round is inverse mode (insane only)
    const inverse = config.inverseMode && Math.random() > 0.6;
    setIsInverseMode(inverse);

    // Pick random word and color
    const wordIndex = Math.floor(Math.random() * availableColors.length);
    let colorIndex = Math.floor(Math.random() * availableColors.length);

    // For easy mode, sometimes match word and color
    if (difficulty === 'easy' && Math.random() < config.matchChance) {
      colorIndex = wordIndex;
    } else {
      // Ensure word and color are different for hard/insane and when easy doesn't match
      while (colorIndex === wordIndex && availableColors.length > 1) {
        colorIndex = Math.floor(Math.random() * availableColors.length);
      }
    }

    const selectedWord = availableColors[wordIndex];
    const selectedColor = availableColors[colorIndex];

    setWord(selectedWord);
    setWordColor(COLORS[selectedColor].hex);
    setOptions(availableColors.map(c => COLORS[c]));
    setTimeLeft(config.timePerRound);
    setIsAnswered(false);
  }, [config, difficulty]);

  useEffect(() => {
    if (!gameOver) {
      generateRound();
    }
  }, [currentRound, gameOver, generateRound]);

  useEffect(() => {
    if (gameOver || isAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          handleTimeout();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [gameOver, currentRound, isAnswered]);

  const handleTimeout = () => {
    if (isAnswered) return;

    setIsAnswered(true);
    setFeedback('incorrect');
    playFailure();

    setTimeout(() => {
      setFeedback(null);
      if (currentRound >= config.totalRounds) {
        endGame();
      } else {
        setCurrentRound(prev => prev + 1);
      }
    }, 800);
  };

  const handleAnswer = (selectedColor: ColorOption) => {
    if (isAnswered || gameOver) return;

    playClick();
    setIsAnswered(true);

    let correct = false;

    if (isInverseMode) {
      // In inverse mode, match the WORD, not the ink color
      correct = selectedColor.name === word;
    } else {
      // Normal mode: match the INK COLOR, not the word
      correct = selectedColor.hex === wordColor;
    }

    if (correct) {
      setScore(prev => prev + 1);
      setFeedback('correct');
      playSuccess();
    } else {
      setFeedback('incorrect');
      playFailure();
    }

    setTimeout(() => {
      setFeedback(null);
      if (currentRound >= config.totalRounds) {
        endGame();
      } else {
        setCurrentRound(prev => prev + 1);
      }
    }, 800);
  };

  const endGame = () => {
    setGameOver(true);
    setTimeout(() => {
      onComplete(score, config.totalRounds);
    }, 1500);
  };

  const timerPercentage = (timeLeft / config.timePerRound) * 100;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: 'linear-gradient(135deg, #1a0a2e 0%, #0f0520 25%, #1a0a2e 50%, #0a0315 75%, #1a0a2e 100%)',
          backgroundSize: '400% 400%',
        }}
      />

      {/* Pulsing overlay */}
      <div
        className="absolute inset-0 opacity-30 animate-pulse-slow"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(170, 68, 255, 0.1), transparent 70%)',
        }}
      />

      <div className="relative w-full max-w-4xl">
        {/* Timer bar */}
        <div className="w-full h-3 bg-gray-900/50 rounded-full mb-8 overflow-hidden backdrop-blur-sm">
          <div
            className="h-full transition-all duration-100 ease-linear rounded-full"
            style={{
              width: `${timerPercentage}%`,
              background: 'linear-gradient(90deg, #00f0ff 0%, #aa44ff 50%, #ff00aa 100%)',
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)',
            }}
          />
        </div>

        {/* Score and round */}
        <div className="flex justify-between items-center mb-12 text-white">
          <div className="text-2xl font-bold font-mono">
            Round <span className="text-cyan-400">{currentRound}</span> / {config.totalRounds}
          </div>
          <div className="text-2xl font-bold font-mono">
            Score: <span className="text-purple-400">{score}</span>
          </div>
        </div>

        {/* Inverse mode banner */}
        {isInverseMode && (
          <div className="mb-8 text-center">
            <div
              className="inline-block px-8 py-3 rounded-lg text-2xl font-bold animate-pulse"
              style={{
                background: 'linear-gradient(90deg, #ff00aa, #ffff44, #ff00aa)',
                color: '#000',
                textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
              }}
            >
              MATCH THE WORD!
            </div>
          </div>
        )}

        {/* Word display */}
        <div
          className={`text-center mb-16 transition-all duration-300 ${
            feedback === 'correct' ? 'scale-110' : feedback === 'incorrect' ? 'animate-shake' : ''
          }`}
        >
          <div
            className="text-8xl font-bold font-orbitron inline-block px-8 py-4"
            style={{
              color: wordColor,
              textShadow: `0 0 30px ${wordColor}, 0 0 60px ${wordColor}, 0 0 90px ${wordColor}`,
              filter: feedback === 'correct' ? 'brightness(1.5)' : 'brightness(1)',
            }}
          >
            {word}
          </div>
        </div>

        {/* Color buttons */}
        <div className={`grid gap-4 mb-8 ${
          options.length <= 3 ? 'grid-cols-3' :
          options.length <= 4 ? 'grid-cols-4' :
          options.length <= 6 ? 'grid-cols-3 md:grid-cols-6' :
          'grid-cols-4 md:grid-cols-8'
        }`}>
          {options.map((color) => (
            <button
              key={color.name}
              onClick={() => handleAnswer(color)}
              disabled={isAnswered || gameOver}
              className="aspect-square rounded-2xl font-bold text-lg transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              style={{
                backgroundColor: color.hex,
                boxShadow: `0 0 20px ${color.hex}80, inset 0 0 20px rgba(255,255,255,0.2)`,
                color: '#000',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}
            >
              {color.name}
            </button>
          ))}
        </div>

        {/* Feedback overlay */}
        {feedback && (
          <div
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
            style={{
              background: feedback === 'correct'
                ? 'radial-gradient(circle, rgba(68, 255, 68, 0.3) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(255, 68, 68, 0.3) 0%, transparent 70%)',
            }}
          >
            <div
              className="text-9xl font-bold animate-scale-in"
              style={{
                color: feedback === 'correct' ? '#44ff44' : '#ff4444',
                textShadow: feedback === 'correct'
                  ? '0 0 40px #44ff44, 0 0 80px #44ff44'
                  : '0 0 40px #ff4444, 0 0 80px #ff4444',
              }}
            >
              {feedback === 'correct' ? '✓' : '✗'}
            </div>
          </div>
        )}

        {/* Back button */}
        <div className="text-center">
          <button
            onClick={() => {
              playClick();
              onBack();
            }}
            className="px-8 py-3 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-lg font-bold transition-all backdrop-blur-sm"
          >
            Back to Menu
          </button>
        </div>

        {/* Game over overlay */}
        {gameOver && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-6xl font-bold text-white mb-4 animate-scale-in">
                Game Complete!
              </div>
              <div className="text-4xl text-purple-400 mb-2">
                Score: {score} / {config.totalRounds}
              </div>
              <div className="text-2xl text-cyan-400">
                {Math.round((score / config.totalRounds) * 100)}% Accuracy
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }

        @keyframes scale-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }

        .animate-gradient-shift {
          animation: gradient-shift 15s ease infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animate-shake {
          animation: shake 0.5s;
        }

        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }

        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');

        .font-orbitron {
          font-family: 'Orbitron', sans-serif;
        }
      }`}</style>
    </div>
  );
}
