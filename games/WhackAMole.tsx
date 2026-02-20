'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { playClick, playSuccess, playFailure, playPop } from '@/lib/sound';

interface WhackAMoleProps {
  difficulty: 'easy' | 'hard' | 'insane';
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

type MoleType = 'normal' | 'decoy' | 'golden';

interface ActiveMole {
  type: MoleType;
  timeoutId: NodeJS.Timeout;
}

interface FloatingScore {
  id: number;
  value: number;
  x: number;
  y: number;
}

export default function WhackAMole({ difficulty, level, onComplete, onBack }: WhackAMoleProps) {
  // Game configuration based on difficulty
  const config = {
    easy: {
      gridCols: 3,
      gridRows: 3,
      totalHoles: 9,
      moleDuration: 1200,
      minSimultaneous: 1,
      maxSimultaneous: 1,
      totalMoles: 20 + level * 5,
      timeLimit: 30,
      hasDecoy: false,
      hasGolden: false,
    },
    hard: {
      gridCols: 3,
      gridRows: 4,
      totalHoles: 12,
      moleDuration: 800,
      minSimultaneous: 1,
      maxSimultaneous: 2,
      totalMoles: 25 + level * 5,
      timeLimit: 25,
      hasDecoy: true,
      hasGolden: false,
    },
    insane: {
      gridCols: 4,
      gridRows: 4,
      totalHoles: 16,
      moleDuration: 500,
      minSimultaneous: 2,
      maxSimultaneous: 3,
      totalMoles: 30 + level * 5,
      timeLimit: 20,
      hasDecoy: true,
      hasGolden: true,
    },
  }[difficulty];

  const [activeMoles, setActiveMoles] = useState<Map<number, ActiveMole>>(new Map());
  const [whackedMoles, setWhackedMoles] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [totalMolesSpawned, setTotalMolesSpawned] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);
  const floatingScoreIdRef = useRef(0);

  const gameStartedRef = useRef(false);
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Spawn a mole at a random hole
  const spawnMole = useCallback(() => {
    if (totalMolesSpawned >= config.totalMoles || gameOver) {
      return;
    }

    setActiveMoles((current) => {
      const newMoles = new Map(current);
      const availableHoles = Array.from({ length: config.totalHoles }, (_, i) => i).filter(
        (i) => !newMoles.has(i)
      );

      if (availableHoles.length === 0) return current;

      const numToSpawn = Math.min(
        Math.floor(Math.random() * (config.maxSimultaneous - config.minSimultaneous + 1)) +
          config.minSimultaneous,
        availableHoles.length,
        config.totalMoles - totalMolesSpawned
      );

      for (let i = 0; i < numToSpawn; i++) {
        const randomIndex = Math.floor(Math.random() * availableHoles.length);
        const holeIndex = availableHoles.splice(randomIndex, 1)[0];

        // Determine mole type
        let moleType: MoleType = 'normal';
        const rand = Math.random();

        if (config.hasGolden && rand < 0.1) {
          moleType = 'golden';
        } else if (config.hasDecoy && rand < 0.3) {
          moleType = 'decoy';
        }

        const timeoutId = setTimeout(() => {
          setActiveMoles((m) => {
            const updated = new Map(m);
            const mole = updated.get(holeIndex);
            if (mole) {
              clearTimeout(mole.timeoutId);
            }
            updated.delete(holeIndex);
            return updated;
          });
        }, config.moleDuration);

        newMoles.set(holeIndex, { type: moleType, timeoutId });
      }

      setTotalMolesSpawned((prev) => prev + numToSpawn);
      playPop();
      return newMoles;
    });
  }, [totalMolesSpawned, config, gameOver]);

  // Whack a mole
  const whackMole = useCallback(
    (holeIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
      const mole = activeMoles.get(holeIndex);
      if (!mole || whackedMoles.has(holeIndex)) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      setWhackedMoles((prev) => new Set(prev).add(holeIndex));

      let points = 0;
      if (mole.type === 'normal') {
        points = 1;
        playSuccess();
      } else if (mole.type === 'decoy') {
        points = -1;
        playFailure();
      } else if (mole.type === 'golden') {
        points = 3;
        playSuccess();
      }

      setScore((prev) => Math.max(0, prev + points));

      // Add floating score
      const scoreId = floatingScoreIdRef.current++;
      setFloatingScores((prev) => [...prev, { id: scoreId, value: points, x, y }]);
      setTimeout(() => {
        setFloatingScores((prev) => prev.filter((s) => s.id !== scoreId));
      }, 1000);

      playClick();

      // Remove the mole after a brief delay
      setTimeout(() => {
        setActiveMoles((current) => {
          const updated = new Map(current);
          const m = updated.get(holeIndex);
          if (m) {
            clearTimeout(m.timeoutId);
            updated.delete(holeIndex);
          }
          return updated;
        });
        setWhackedMoles((prev) => {
          const updated = new Set(prev);
          updated.delete(holeIndex);
          return updated;
        });
      }, 200);
    },
    [activeMoles, whackedMoles]
  );

  // Start game timer
  useEffect(() => {
    if (gameStartedRef.current) return;
    gameStartedRef.current = true;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameOver(true);
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
  }, []);

  // Spawn moles periodically
  useEffect(() => {
    if (gameOver) return;

    // Initial spawn
    spawnMole();

    const spawnDelay = difficulty === 'easy' ? 1400 : difficulty === 'hard' ? 1000 : 700;
    spawnIntervalRef.current = setInterval(() => {
      spawnMole();
    }, spawnDelay);

    return () => {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
      }
    };
  }, [spawnMole, gameOver, difficulty]);

  // Handle game over
  useEffect(() => {
    if (gameOver) {
      // Clear all intervals and timeouts
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      activeMoles.forEach((mole) => {
        clearTimeout(mole.timeoutId);
      });

      setTimeout(() => {
        onComplete(score, config.totalMoles);
      }, 1500);
    }
  }, [gameOver, score, config.totalMoles, onComplete, activeMoles]);

  const getMoleComponent = (type: MoleType, isWhacked: boolean) => {
    if (isWhacked) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-yellow-300 animate-whack">
          POW!
        </div>
      );
    }

    switch (type) {
      case 'normal':
        return (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            <span className="mole-emoji">🐹</span>
          </div>
        );
      case 'decoy':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        );
      case 'golden':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg animate-pulse border-2 border-yellow-200">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-amber-900 rounded-full"></div>
                <div className="w-2 h-2 bg-amber-900 rounded-full"></div>
              </div>
            </div>
          </div>
        );
    }
  };

  const timerPercentage = (timeLeft / config.timeLimit) * 100;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 w-full max-w-4xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-white transition-colors"
          >
            ← Back
          </button>
          <div className="flex gap-6">
            <div className="text-right">
              <div className="text-sm text-slate-400 uppercase tracking-wider">Score</div>
              <div className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {score}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400 uppercase tracking-wider">Moles</div>
              <div className="text-2xl font-bold text-white">
                {totalMolesSpawned}/{config.totalMoles}
              </div>
            </div>
          </div>
        </div>

        {/* Timer bar */}
        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${timerPercentage}%` }}
          ></div>
        </div>
        <div className="text-center mt-2 text-lg font-bold text-white">
          {timeLeft}s
        </div>
      </div>

      {/* Game grid */}
      <div className="relative z-10 w-full max-w-4xl flex-1 flex items-center justify-center">
        <div
          className="grid gap-4 p-6"
          style={{
            gridTemplateColumns: `repeat(${config.gridCols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${config.gridRows}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: config.totalHoles }).map((_, index) => {
            const mole = activeMoles.get(index);
            const isWhacked = whackedMoles.has(index);

            return (
              <div
                key={index}
                className="relative w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32"
              >
                {/* Hole */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-800 to-black shadow-2xl overflow-hidden border-4 border-slate-900">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900 opacity-60"></div>
                  <div className="absolute inset-4 rounded-full shadow-inner bg-black opacity-40"></div>
                </div>

                {/* Mole */}
                {mole && (
                  <div
                    onClick={(e) => whackMole(index, e)}
                    className={`absolute inset-0 cursor-pointer ${
                      isWhacked ? 'animate-whack-hide' : 'animate-mole-pop'
                    }`}
                    style={{
                      transformOrigin: 'center bottom',
                    }}
                  >
                    {getMoleComponent(mole.type, isWhacked)}
                  </div>
                )}

                {/* Floating scores */}
                {floatingScores
                  .filter((fs) => {
                    // Check if this score belongs to this hole (approximate)
                    const holeRect = document.getElementById(`hole-${index}`)?.getBoundingClientRect();
                    return holeRect; // Simple check for now
                  })
                  .map((fs) => (
                    <div
                      key={fs.id}
                      className="absolute pointer-events-none animate-float-up font-black text-2xl"
                      style={{
                        left: fs.x,
                        top: fs.y,
                        color: fs.value > 0 ? '#22c55e' : '#ef4444',
                      }}
                    >
                      {fs.value > 0 ? '+' : ''}{fs.value}
                    </div>
                  ))}

                <div id={`hole-${index}`} className="absolute inset-0 pointer-events-none"></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Game over overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-20">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl shadow-2xl text-center border-2 border-slate-700">
            <h2 className="text-4xl font-black text-white mb-4">Time's Up!</h2>
            <div className="text-6xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-4">
              {score}
            </div>
            <div className="text-slate-400 text-lg">
              Out of {config.totalMoles} moles
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes mole-pop {
          0% {
            transform: translateY(100%) scale(0);
            opacity: 0;
          }
          50% {
            transform: translateY(-5%) scale(1.1);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes whack-hide {
          0% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: scale(1.2) rotate(10deg);
          }
          100% {
            transform: scale(0) rotate(20deg);
            opacity: 0;
          }
        }

        @keyframes whack {
          0% {
            transform: scale(0) rotate(-10deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.3) rotate(5deg);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-60px) scale(1.5);
            opacity: 0;
          }
        }

        .animate-mole-pop {
          animation: mole-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-whack-hide {
          animation: whack-hide 0.2s ease-out forwards;
        }

        .animate-whack {
          animation: whack 0.2s ease-out forwards;
        }

        .animate-float-up {
          animation: float-up 1s ease-out forwards;
        }

        .mole-emoji {
          display: inline-block;
          animation: mole-wiggle 0.5s ease-in-out infinite;
        }

        @keyframes mole-wiggle {
          0%, 100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }
      `}</style>
    </div>
  );
}
