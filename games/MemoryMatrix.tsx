'use client';

import { useState, useEffect } from 'react';
import { playClick, playSuccess, playFailure } from '@/lib/sound';

type GameState = 'showing' | 'playing' | 'result';

interface MemoryMatrixProps {
  difficulty: 'easy' | 'hard' | 'insane';
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

export default function MemoryMatrix({
  difficulty,
  level,
  onComplete,
  onBack,
}: MemoryMatrixProps) {
  // Grid configuration based on difficulty
  const gridSize =
    difficulty === 'easy' ? 3 : difficulty === 'hard' ? 4 : 5;
  const baseFlashCount =
    difficulty === 'easy' ? 3 : difficulty === 'hard' ? 4 : 5;
  const flashCount = baseFlashCount + level;

  const totalTiles = gridSize * gridSize;

  const [gameState, setGameState] = useState<GameState>('showing');
  const [pattern, setPattern] = useState<Set<number>>(new Set());
  const [selectedTiles, setSelectedTiles] = useState<Set<number>>(new Set());
  const [correctTiles, setCorrectTiles] = useState<Set<number>>(new Set());
  const [wrongTiles, setWrongTiles] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);

  // Generate random pattern on mount
  useEffect(() => {
    const newPattern = new Set<number>();
    while (newPattern.size < Math.min(flashCount, totalTiles)) {
      const randomIndex = Math.floor(Math.random() * totalTiles);
      newPattern.add(randomIndex);
    }
    setPattern(newPattern);

    // Show pattern for 1.5-2 seconds based on difficulty
    const showDuration =
      difficulty === 'easy' ? 2000 : difficulty === 'hard' ? 1700 : 1500;

    const timer = setTimeout(() => {
      setGameState('playing');
    }, showDuration);

    return () => clearTimeout(timer);
  }, [difficulty, level, flashCount, totalTiles]);

  // Check if player has selected enough tiles
  useEffect(() => {
    if (gameState === 'playing' && selectedTiles.size === pattern.size) {
      // Check accuracy
      const correct = new Set<number>();
      const wrong = new Set<number>();
      let correctCount = 0;

      selectedTiles.forEach((tile) => {
        if (pattern.has(tile)) {
          correct.add(tile);
          correctCount++;
        } else {
          wrong.add(tile);
        }
      });

      // Also mark unselected pattern tiles as wrong (missed)
      pattern.forEach((tile) => {
        if (!selectedTiles.has(tile)) {
          wrong.add(tile);
        }
      });

      setCorrectTiles(correct);
      setWrongTiles(wrong);
      setScore(correctCount);

      // Calculate stars
      const wrongCount = pattern.size - correctCount;
      let earnedStars = 0;
      if (wrongCount === 0) {
        earnedStars = 3;
        playSuccess();
      } else if (wrongCount <= 2) {
        earnedStars = 2;
        playSuccess();
      } else if (correctCount > pattern.size / 2) {
        earnedStars = 1;
        playSuccess();
      } else {
        playFailure();
      }

      setStars(earnedStars);
      setGameState('result');

      // Call onComplete after a brief delay
      setTimeout(() => {
        onComplete(correctCount, pattern.size);
      }, 1500);
    }
  }, [selectedTiles, pattern, gameState, onComplete]);

  const handleTileClick = (index: number) => {
    if (gameState !== 'playing') return;

    playClick();

    setSelectedTiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getTileStyle = (index: number): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: '100%',
      paddingBottom: '100%',
      position: 'relative',
      borderRadius: '12px',
      border: '2px solid rgba(0, 240, 255, 0.2)',
      background: '#1a1a24',
      cursor: gameState === 'playing' ? 'pointer' : 'default',
      transition: 'all 0.3s ease',
    };

    // Showing pattern
    if (gameState === 'showing' && pattern.has(index)) {
      return {
        ...baseStyle,
        background: '#00f0ff',
        boxShadow: '0 0 20px #00f0ff, 0 0 40px #00f0ff',
        border: '2px solid #00f0ff',
      };
    }

    // Playing - show selected tiles
    if (gameState === 'playing' && selectedTiles.has(index)) {
      return {
        ...baseStyle,
        background: '#ff00aa',
        boxShadow: '0 0 20px #ff00aa, 0 0 40px #ff00aa',
        border: '2px solid #ff00aa',
      };
    }

    // Result - show correct and wrong
    if (gameState === 'result') {
      if (correctTiles.has(index)) {
        return {
          ...baseStyle,
          background: '#00ff88',
          boxShadow: '0 0 20px #00ff88',
          border: '2px solid #00ff88',
          cursor: 'default',
        };
      }
      if (wrongTiles.has(index)) {
        return {
          ...baseStyle,
          background: '#ff4444',
          boxShadow: '0 0 20px #ff4444',
          border: '2px solid #ff4444',
          cursor: 'default',
        };
      }
    }

    return baseStyle;
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#12121a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        color: '#ffffff',
      }}
    >
      {/* Header */}
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          marginBottom: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => {
            playClick();
            onBack();
          }}
          style={{
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          Back
        </button>

        <div style={{ textAlign: 'center' }}>
          <h2
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 8px 0',
              textTransform: 'capitalize',
            }}
          >
            {difficulty} - Level {level}
          </h2>
          <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>
            {gameState === 'showing' && 'Memorize the pattern...'}
            {gameState === 'playing' &&
              `Select ${pattern.size} tiles (${selectedTiles.size}/${pattern.size})`}
            {gameState === 'result' && `Score: ${score}/${pattern.size}`}
          </p>
        </div>

        <div style={{ width: '120px' }} />
      </div>

      {/* Game Grid */}
      <div
        style={{
          width: '100%',
          maxWidth: gridSize === 3 ? '400px' : gridSize === 4 ? '480px' : '550px',
          aspectRatio: '1',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gap: '12px',
            width: '100%',
            height: '100%',
          }}
        >
          {Array.from({ length: totalTiles }).map((_, index) => (
            <div
              key={index}
              onClick={() => handleTileClick(index)}
              style={getTileStyle(index)}
            />
          ))}
        </div>
      </div>

      {/* Result Stars */}
      {gameState === 'result' && (
        <div
          style={{
            marginTop: '40px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
          }}
        >
          {[1, 2, 3].map((star) => (
            <div
              key={star}
              style={{
                fontSize: '48px',
                opacity: star <= stars ? 1 : 0.2,
                transition: 'all 0.5s ease',
                animation:
                  star <= stars
                    ? `starPop 0.5s ease ${star * 0.2}s backwards`
                    : 'none',
              }}
            >
              {star <= stars ? '⭐' : '☆'}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      {gameState === 'playing' && (
        <div
          style={{
            marginTop: '30px',
            textAlign: 'center',
            color: '#888',
            fontSize: '14px',
            maxWidth: '400px',
          }}
        >
          Click the tiles that were highlighted. Click again to deselect.
        </div>
      )}

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes starPop {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.3) rotate(180deg);
          }
          100% {
            transform: scale(1) rotate(360deg);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
