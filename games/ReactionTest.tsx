'use client';

import React, { useState, useEffect, useRef } from 'react';
import { playClick, playSuccess, playFailure } from '@/lib/sound';

interface ReactionTestProps {
  difficulty: 'easy' | 'hard' | 'insane';
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

type GamePhase = 'waiting' | 'ready' | 'result' | 'complete';
type ColorOption = 'red' | 'green' | 'blue' | 'yellow' | 'purple';

interface RoundResult {
  time: number;
  tooEarly: boolean;
}

export default function ReactionTest({ difficulty, level, onComplete, onBack }: ReactionTestProps) {
  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [currentRound, setCurrentRound] = useState(1);
  const [reactionTime, setReactionTime] = useState<number>(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [currentColor, setCurrentColor] = useState<ColorOption>('red');
  const [targetColor, setTargetColor] = useState<ColorOption>('green');
  const [message, setMessage] = useState('Wait...');
  const [tooEarly, setTooEarly] = useState(false);

  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fakeoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const totalRounds = difficulty === 'easy'
    ? 5 + level
    : difficulty === 'hard'
    ? 7 + level
    : 8 + level;

  const colorMap: Record<ColorOption, string> = {
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
    yellow: '#eab308',
    purple: '#a855f7',
  };

  const getRandomColor = (exclude?: ColorOption[]): ColorOption => {
    const colors: ColorOption[] = ['red', 'green', 'blue', 'yellow', 'purple'];
    const available = exclude ? colors.filter(c => !exclude.includes(c)) : colors;
    return available[Math.floor(Math.random() * available.length)];
  };

  const startRound = () => {
    setTooEarly(false);
    setReactionTime(0);
    setMessage('Wait...');

    if (difficulty === 'easy') {
      setCurrentColor('red');
      setPhase('waiting');

      const delay = 1000 + Math.random() * 3000;
      timeoutRef.current = setTimeout(() => {
        setCurrentColor('green');
        setMessage('CLICK!');
        setPhase('ready');
        startTimeRef.current = Date.now();
      }, delay);
    } else if (difficulty === 'hard') {
      setCurrentColor('red');
      setPhase('waiting');

      const delay = 1000 + Math.random() * 3000;

      // Cycle through distraction colors
      const cycleColors = () => {
        const distractionColors: ColorOption[] = ['blue', 'yellow', 'purple', 'red'];
        let colorIndex = 0;

        const cycleInterval = setInterval(() => {
          setCurrentColor(distractionColors[colorIndex % distractionColors.length]);
          colorIndex++;
        }, 600);

        timeoutRef.current = setTimeout(() => {
          clearInterval(cycleInterval);
          setCurrentColor('green');
          setMessage('CLICK NOW!');
          setPhase('ready');
          startTimeRef.current = Date.now();
        }, delay);
      };

      setTimeout(cycleColors, 500);
    } else if (difficulty === 'insane') {
      const target = getRandomColor();
      setTargetColor(target);
      setCurrentColor(getRandomColor([target]));
      setPhase('waiting');
      setMessage(`Wait for ${target.toUpperCase()}...`);

      const delay = 1500 + Math.random() * 3000;

      // Schedule fake-outs
      const numFakeouts = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numFakeouts; i++) {
        const fakeoutDelay = 800 + Math.random() * (delay - 1000);
        setTimeout(() => {
          if (phase === 'waiting') {
            const fakeColor = getRandomColor([target]);
            setCurrentColor(fakeColor);
            setTimeout(() => {
              if (phase === 'waiting') {
                setCurrentColor(getRandomColor([target]));
              }
            }, 200);
          }
        }, fakeoutDelay);
      }

      timeoutRef.current = setTimeout(() => {
        setCurrentColor(target);
        setMessage('CLICK NOW!');
        setPhase('ready');
        startTimeRef.current = Date.now();
      }, delay);
    }
  };

  const handleClick = () => {
    if (phase === 'waiting') {
      // Too early!
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (fakeoutTimeoutRef.current) {
        clearTimeout(fakeoutTimeoutRef.current);
      }

      playFailure();
      setTooEarly(true);
      setMessage('Too early!');
      setCurrentColor('red');

      const penaltyTime = 500;
      setReactionTime(penaltyTime);
      setRoundResults([...roundResults, { time: penaltyTime, tooEarly: true }]);

      setTimeout(() => {
        if (currentRound < totalRounds) {
          setCurrentRound(currentRound + 1);
          startRound();
        } else {
          finishGame([...roundResults, { time: penaltyTime, tooEarly: true }]);
        }
      }, 1500);
    } else if (phase === 'ready') {
      // Check if clicking the right color in hard/insane mode
      if (difficulty === 'hard' && currentColor !== 'green') {
        playFailure();
        setTooEarly(true);
        setMessage('Wrong color!');
        const penaltyTime = 500;
        setReactionTime(penaltyTime);
        setRoundResults([...roundResults, { time: penaltyTime, tooEarly: true }]);
        setPhase('result');

        setTimeout(() => {
          if (currentRound < totalRounds) {
            setCurrentRound(currentRound + 1);
            startRound();
          } else {
            finishGame([...roundResults, { time: penaltyTime, tooEarly: true }]);
          }
        }, 1500);
        return;
      }

      if (difficulty === 'insane' && currentColor !== targetColor) {
        playFailure();
        setTooEarly(true);
        setMessage('Wrong color!');
        const penaltyTime = 500;
        setReactionTime(penaltyTime);
        setRoundResults([...roundResults, { time: penaltyTime, tooEarly: true }]);
        setPhase('result');

        setTimeout(() => {
          if (currentRound < totalRounds) {
            setCurrentRound(currentRound + 1);
            startRound();
          } else {
            finishGame([...roundResults, { time: penaltyTime, tooEarly: true }]);
          }
        }, 1500);
        return;
      }

      // Valid click!
      const time = Date.now() - startTimeRef.current;
      playClick();
      setReactionTime(time);
      setMessage(`${time}ms`);
      setPhase('result');

      const newResults = [...roundResults, { time, tooEarly: false }];
      setRoundResults(newResults);

      setTimeout(() => {
        if (currentRound < totalRounds) {
          setCurrentRound(currentRound + 1);
          startRound();
        } else {
          finishGame(newResults);
        }
      }, 1500);
    }
  };

  const finishGame = (results: RoundResult[]) => {
    setPhase('complete');

    const times = results.map(r => r.time);
    const average = times.reduce((a, b) => a + b, 0) / times.length;
    const score = Math.max(0, Math.round(1000 - average));

    if (average < 400) {
      playSuccess();
    } else {
      playClick();
    }

    setTimeout(() => {
      onComplete(score, 1000);
    }, 3000);
  };

  useEffect(() => {
    startRound();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (fakeoutTimeoutRef.current) {
        clearTimeout(fakeoutTimeoutRef.current);
      }
    };
  }, []);

  if (phase === 'complete') {
    const times = roundResults.map(r => r.time);
    const average = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const best = Math.min(...times);
    const worst = Math.max(...times);

    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center transition-all duration-500"
        style={{ backgroundColor: '#1a1a2e' }}
      >
        <div className="text-center space-y-6 p-8">
          <h2 className="text-4xl font-bold text-white mb-8" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Test Complete!
          </h2>

          <div className="space-y-4">
            <div className="text-center">
              <div className="text-gray-400 text-xl mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                Average Reaction Time
              </div>
              <div
                className="text-7xl font-bold mb-4"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: average < 300 ? '#22c55e' : average < 500 ? '#eab308' : '#ef4444',
                  textShadow: `0 0 20px ${average < 300 ? '#22c55e' : average < 500 ? '#eab308' : '#ef4444'}`,
                }}
              >
                {average}ms
              </div>
            </div>

            <div className="flex justify-center gap-12 mt-8">
              <div className="text-center">
                <div className="text-gray-400 text-lg mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Best
                </div>
                <div
                  className="text-3xl font-bold"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#22c55e',
                    textShadow: '0 0 10px #22c55e',
                  }}
                >
                  {best}ms
                </div>
              </div>

              <div className="text-center">
                <div className="text-gray-400 text-lg mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  Worst
                </div>
                <div
                  className="text-3xl font-bold"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    color: '#ef4444',
                    textShadow: '0 0 10px #ef4444',
                  }}
                >
                  {worst}ms
                </div>
              </div>
            </div>

            <div className="mt-8 text-gray-400 text-sm" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              {average < 300 && '⭐⭐⭐ Lightning Fast!'}
              {average >= 300 && average < 500 && '⭐⭐ Great Reflexes!'}
              {average >= 500 && '⭐ Keep Practicing!'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6 flex justify-between items-center">
        <button
          onClick={onBack}
          className="px-6 py-2 bg-gray-800/80 text-white rounded-lg hover:bg-gray-700 transition-colors backdrop-blur-sm"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          ← Back
        </button>

        <div
          className="text-2xl font-bold text-white"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Round {currentRound} / {totalRounds}
        </div>

        <div className="w-24"></div>
      </div>

      {/* Target color indicator for insane mode */}
      {difficulty === 'insane' && (
        <div className="absolute top-20 left-0 right-0 z-10 flex justify-center">
          <div
            className="px-8 py-4 rounded-xl backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              fontFamily: 'Orbitron, sans-serif',
            }}
          >
            <div className="text-gray-300 text-sm mb-2">Target Color:</div>
            <div
              className="text-2xl font-bold uppercase"
              style={{
                color: colorMap[targetColor],
                textShadow: `0 0 10px ${colorMap[targetColor]}`,
              }}
            >
              {targetColor}
            </div>
          </div>
        </div>
      )}

      {/* Main game area */}
      <div
        className="flex-1 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative"
        style={{
          backgroundColor: phase === 'result' && tooEarly ? '#ef4444' : colorMap[currentColor],
        }}
        onClick={handleClick}
      >
        <div className="text-center space-y-8">
          <div
            className="text-8xl font-bold text-white select-none"
            style={{
              fontFamily: 'Orbitron, sans-serif',
              textShadow: '0 0 30px rgba(0, 0, 0, 0.5)',
            }}
          >
            {message}
          </div>

          {phase === 'result' && reactionTime > 0 && (
            <div
              className="text-5xl font-bold"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                color: tooEarly ? '#ffffff' : reactionTime < 300 ? '#fbbf24' : '#ffffff',
                textShadow: tooEarly ? 'none' : `0 0 20px ${reactionTime < 300 ? '#fbbf24' : '#ffffff'}`,
              }}
            >
              {tooEarly ? 'Penalty: +500ms' : reactionTime < 200 ? '🔥 AMAZING!' : reactionTime < 300 ? '⚡ FAST!' : reactionTime < 500 ? '✓ Good' : ''}
            </div>
          )}

          {phase === 'waiting' && (
            <div
              className="text-xl text-white/70"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {difficulty === 'easy' && 'Click when screen turns green'}
              {difficulty === 'hard' && 'Click ONLY when screen is GREEN'}
              {difficulty === 'insane' && 'Click when screen matches target color'}
            </div>
          )}
        </div>

        {/* Round history */}
        {roundResults.length > 0 && (
          <div className="absolute bottom-8 left-8 right-8">
            <div
              className="flex flex-wrap justify-center gap-3"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {roundResults.map((result, index) => (
                <div
                  key={index}
                  className="px-4 py-2 rounded-lg backdrop-blur-sm text-white font-bold"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: result.tooEarly ? '2px solid #ef4444' : '2px solid rgba(255, 255, 255, 0.2)',
                    color: result.tooEarly ? '#ef4444' : result.time < 300 ? '#22c55e' : result.time < 500 ? '#eab308' : '#ffffff',
                  }}
                >
                  {result.tooEarly ? '❌' : ''} {result.time}ms
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
