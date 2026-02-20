import React, { useState, useEffect, useCallback, useRef } from 'react';
import { playClick, playSuccess, playPop } from '@/lib/sound';

interface TileSlideProps {
  difficulty: 'easy' | 'hard' | 'insane';
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

interface Tile {
  value: number; // 0 represents empty space
  position: number; // current position in grid (0 to gridSize^2 - 1)
}

const TileSlide: React.FC<TileSlideProps> = ({ difficulty, level, onComplete, onBack }) => {
  const getGridSize = () => {
    switch (difficulty) {
      case 'easy': return 3;
      case 'hard': return 4;
      case 'insane': return 5;
    }
  };

  const getTimeLimit = () => {
    switch (difficulty) {
      case 'easy': return null;
      case 'hard': return 120;
      case 'insane': return 90;
    }
  };

  const gridSize = getGridSize();
  const timeLimit = getTimeLimit();
  const totalTiles = gridSize * gridSize;

  const [tiles, setTiles] = useState<number[]>([]);
  const [emptyIndex, setEmptyIndex] = useState<number>(totalTiles - 1);
  const [moves, setMoves] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(timeLimit);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [showReference, setShowReference] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize puzzle with proper shuffle
  const initializePuzzle = useCallback(() => {
    // Start with solved state
    const solved = Array.from({ length: totalTiles }, (_, i) => i);
    let current = [...solved];
    let empty = totalTiles - 1;

    // Make 150 random valid moves to shuffle
    const shuffleMoves = 150;
    for (let i = 0; i < shuffleMoves; i++) {
      const validMoves = getValidMoves(empty, gridSize);
      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];

      // Swap empty with the random valid tile
      [current[empty], current[randomMove]] = [current[randomMove], current[empty]];
      empty = randomMove;
    }

    setTiles(current);
    setEmptyIndex(empty);
    setMoves(0);
    setTimeLeft(timeLimit);
    setGameStarted(false);
    setGameOver(false);
  }, [gridSize, totalTiles, timeLimit]);

  // Get valid adjacent tiles that can move into empty space
  const getValidMoves = (emptyPos: number, size: number): number[] => {
    const validMoves: number[] = [];
    const row = Math.floor(emptyPos / size);
    const col = emptyPos % size;

    // Up
    if (row > 0) validMoves.push(emptyPos - size);
    // Down
    if (row < size - 1) validMoves.push(emptyPos + size);
    // Left
    if (col > 0) validMoves.push(emptyPos - 1);
    // Right
    if (col < size - 1) validMoves.push(emptyPos + 1);

    return validMoves;
  };

  // Check if puzzle is solved
  const isSolved = useCallback((tilesArray: number[]): boolean => {
    for (let i = 0; i < tilesArray.length; i++) {
      if (tilesArray[i] !== i) return false;
    }
    return true;
  }, []);

  // Handle tile click
  const handleTileClick = (index: number) => {
    if (gameOver) return;

    // Start game on first move
    if (!gameStarted) {
      setGameStarted(true);
    }

    // Check if clicked tile is adjacent to empty space
    const validMoves = getValidMoves(emptyIndex, gridSize);
    if (!validMoves.includes(index)) {
      return; // Can't move this tile
    }

    playClick();

    // Swap tile with empty space
    const newTiles = [...tiles];
    [newTiles[emptyIndex], newTiles[index]] = [newTiles[index], newTiles[emptyIndex]];

    setTiles(newTiles);
    setEmptyIndex(index);
    setMoves(moves + 1);

    // Check if solved
    if (isSolved(newTiles)) {
      playSuccess();
      setGameOver(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Calculate score
      const maxScore = 1000;
      const optimalMoves = gridSize * gridSize * 2;
      let score = maxScore - (moves + 1 - optimalMoves) * 10;
      score = Math.max(100, Math.min(1000, score));

      setTimeout(() => {
        onComplete(score, maxScore);
      }, 800);
    }
  };

  // Timer effect
  useEffect(() => {
    if (gameStarted && !gameOver && timeLimit !== null) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            setGameOver(true);
            // Game over - failed
            setTimeout(() => {
              onComplete(0, 1000);
            }, 500);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [gameStarted, gameOver, timeLimit, onComplete]);

  // Initialize on mount
  useEffect(() => {
    initializePuzzle();
  }, [initializePuzzle]);

  // Get tile position in grid
  const getTilePosition = (index: number) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    return { row, col };
  };

  // Get tile color based on value
  const getTileColor = (value: number) => {
    const hue = (value * 360) / totalTiles;
    return `hsl(${hue}, 80%, 55%)`;
  };

  // Get tile color gradient
  const getTileGradient = (value: number) => {
    const hue = (value * 360) / totalTiles;
    return `linear-gradient(135deg, hsl(${hue}, 80%, 55%), hsl(${hue}, 70%, 45%))`;
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle reference button
  const handleReferencePress = () => {
    playPop();
    setShowReference(true);
  };

  const handleReferenceRelease = () => {
    setShowReference(false);
  };

  const tileSize = difficulty === 'easy' ? 100 : difficulty === 'hard' ? 80 : 70;
  const gap = difficulty === 'easy' ? 12 : 10;
  const gridWidth = gridSize * tileSize + (gridSize - 1) * gap;

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      background: '#0a0a1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Orbitron, sans-serif',
      color: '#fff',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: `${gridWidth}px`,
        marginBottom: '20px',
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            padding: '10px 20px',
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }}
        >
          Back
        </button>

        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
        }}>
          Level {level}
        </div>

        <button
          onMouseDown={handleReferencePress}
          onMouseUp={handleReferenceRelease}
          onMouseLeave={handleReferenceRelease}
          onTouchStart={handleReferencePress}
          onTouchEnd={handleReferenceRelease}
          style={{
            background: 'rgba(100, 200, 255, 0.2)',
            border: '2px solid rgba(100, 200, 255, 0.5)',
            borderRadius: '8px',
            padding: '10px 20px',
            color: '#64c8ff',
            cursor: 'pointer',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
        >
          Reference
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: `${gridWidth}px`,
        marginBottom: '20px',
        gap: '20px',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          padding: '15px 25px',
          flex: 1,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '5px' }}>MOVES</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', textShadow: '0 0 10px rgba(255, 255, 255, 0.3)' }}>
            {moves}
          </div>
        </div>

        {timeLimit !== null && (
          <div style={{
            background: timeLeft !== null && timeLeft < 20 ? 'rgba(255, 50, 50, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: `2px solid ${timeLeft !== null && timeLeft < 20 ? 'rgba(255, 50, 50, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
            borderRadius: '8px',
            padding: '15px 25px',
            flex: 1,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '5px' }}>TIME</div>
            <div style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: timeLeft !== null && timeLeft < 20 ? '#ff6666' : '#fff',
              textShadow: timeLeft !== null && timeLeft < 20 ? '0 0 10px rgba(255, 50, 50, 0.5)' : '0 0 10px rgba(255, 255, 255, 0.3)',
            }}>
              {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
            </div>
          </div>
        )}
      </div>

      {/* Game Grid */}
      <div style={{
        position: 'relative',
        width: `${gridWidth}px`,
        height: `${gridWidth}px`,
        margin: '20px 0',
      }}>
        {tiles.map((value, index) => {
          const pos = getTilePosition(index);
          const isReference = showReference;
          const displayValue = isReference ? index : value;
          const isEmpty = displayValue === 0;

          if (isEmpty && !isReference) return null;

          return (
            <div
              key={`${index}-${value}`}
              onClick={() => handleTileClick(index)}
              style={{
                position: 'absolute',
                width: `${tileSize}px`,
                height: `${tileSize}px`,
                top: `${pos.row * (tileSize + gap)}px`,
                left: `${pos.col * (tileSize + gap)}px`,
                background: isEmpty ? 'rgba(255, 255, 255, 0.05)' : getTileGradient(displayValue),
                border: isEmpty ? '2px dashed rgba(255, 255, 255, 0.2)' : `3px solid ${getTileColor(displayValue)}`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: difficulty === 'easy' ? '36px' : difficulty === 'hard' ? '28px' : '24px',
                fontWeight: 'bold',
                color: '#fff',
                cursor: isEmpty ? 'default' : 'pointer',
                transition: 'top 0.2s ease, left 0.2s ease, transform 0.1s',
                boxShadow: isEmpty ? 'none' : `0 0 20px ${getTileColor(displayValue)}40, inset 0 0 20px rgba(255, 255, 255, 0.1)`,
                textShadow: isEmpty ? 'none' : '0 0 10px rgba(255, 255, 255, 0.8), 0 2px 4px rgba(0, 0, 0, 0.5)',
                userSelect: 'none',
                opacity: isEmpty ? 0.3 : (isReference ? 0.6 : 1),
              }}
              onMouseEnter={(e) => {
                if (!isEmpty && !gameOver) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isEmpty) {
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {displayValue === 0 ? '' : displayValue}
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      {!gameStarted && (
        <div style={{
          maxWidth: `${gridWidth}px`,
          textAlign: 'center',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          fontSize: '14px',
          lineHeight: '1.6',
          opacity: 0.8,
        }}>
          Click tiles adjacent to the empty space to slide them. Arrange the tiles in order from 1 to {totalTiles - 1}.
        </div>
      )}

      {/* Reference overlay */}
      {showReference && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: '24px',
            color: '#64c8ff',
            textShadow: '0 0 20px rgba(100, 200, 255, 0.8)',
            fontWeight: 'bold',
            letterSpacing: '2px',
          }}>
            REFERENCE STATE
          </div>
        </div>
      )}

      {/* Game Over overlay */}
      {gameOver && timeLeft === 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: 'rgba(255, 50, 50, 0.1)',
            border: '3px solid rgba(255, 50, 50, 0.5)',
            borderRadius: '20px',
          }}>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#ff6666',
              textShadow: '0 0 20px rgba(255, 50, 50, 0.8)',
              marginBottom: '20px',
            }}>
              TIME'S UP!
            </div>
            <div style={{ fontSize: '18px', opacity: 0.8 }}>
              Better luck next time...
            </div>
          </div>
        </div>
      )}

      {/* Victory overlay */}
      {gameOver && isSolved(tiles) && timeLeft !== 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: 'rgba(100, 255, 100, 0.1)',
            border: '3px solid rgba(100, 255, 100, 0.5)',
            borderRadius: '20px',
          }}>
            <div style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#66ff66',
              textShadow: '0 0 20px rgba(100, 255, 100, 0.8)',
              marginBottom: '20px',
            }}>
              SOLVED!
            </div>
            <div style={{ fontSize: '18px', opacity: 0.8 }}>
              {moves} moves
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TileSlide;
