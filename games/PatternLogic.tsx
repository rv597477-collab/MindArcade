import React, { useState, useEffect } from 'react';
import { playClick, playSuccess, playFailure } from '@/lib/sound';

interface PatternLogicProps {
  difficulty: 'easy' | 'hard' | 'insane';
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon';
type ColorType = '#00f0ff' | '#ff00aa' | '#f0ff00' | '#00ff88' | '#ff4444' | '#aa44ff';

interface PatternItem {
  shape: ShapeType;
  color: ColorType;
  size: number;
  number?: number;
}

const COLORS: ColorType[] = ['#00f0ff', '#ff00aa', '#f0ff00', '#00ff88', '#ff4444', '#aa44ff'];
const SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon'];

// Seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

const PatternLogic: React.FC<PatternLogicProps> = ({ difficulty, level, onComplete, onBack }) => {
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [pattern, setPattern] = useState<PatternItem[]>([]);
  const [choices, setChoices] = useState<PatternItem[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<PatternItem | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const totalRounds = difficulty === 'easy' ? 3 + level : difficulty === 'hard' ? 4 + level : 5 + level;

  useEffect(() => {
    generateRound(currentRound);
  }, [currentRound, difficulty, level]);

  const generateRound = (roundIndex: number) => {
    const seed = level * 1000 + roundIndex * 100 + (difficulty === 'easy' ? 1 : difficulty === 'hard' ? 2 : 3);
    const rng = new SeededRandom(seed);

    let generatedPattern: PatternItem[] = [];
    let answer: PatternItem | null = null;

    if (difficulty === 'easy') {
      // Simple patterns: numbers, shapes, or colors
      const patternType = rng.nextInt(0, 2);

      if (patternType === 0) {
        // Number arithmetic sequence
        const start = rng.nextInt(1, 10);
        const step = rng.nextInt(1, 5);
        const shape = rng.choice(SHAPES);
        const color = rng.choice(COLORS);

        for (let i = 0; i < 5; i++) {
          generatedPattern.push({
            shape,
            color,
            size: 50,
            number: start + i * step
          });
        }
        answer = {
          shape,
          color,
          size: 50,
          number: start + 5 * step
        };
      } else if (patternType === 1) {
        // Shape sequence
        const startIdx = rng.nextInt(0, SHAPES.length - 1);
        const color = rng.choice(COLORS);

        for (let i = 0; i < 5; i++) {
          generatedPattern.push({
            shape: SHAPES[(startIdx + i) % SHAPES.length],
            color,
            size: 50
          });
        }
        answer = {
          shape: SHAPES[(startIdx + 5) % SHAPES.length],
          color,
          size: 50
        };
      } else {
        // Color sequence
        const startIdx = rng.nextInt(0, COLORS.length - 1);
        const shape = rng.choice(SHAPES);

        for (let i = 0; i < 5; i++) {
          generatedPattern.push({
            shape,
            color: COLORS[(startIdx + i) % COLORS.length],
            size: 50
          });
        }
        answer = {
          shape,
          color: COLORS[(startIdx + 5) % COLORS.length],
          size: 50
        };
      }
    } else if (difficulty === 'hard') {
      // Combined patterns: shape + color
      const patternType = rng.nextInt(0, 2);

      if (patternType === 0) {
        // Alternating shapes, cycling colors
        const shapes = rng.shuffle([SHAPES[0], SHAPES[1]]);
        const colorStart = rng.nextInt(0, COLORS.length - 1);

        for (let i = 0; i < 5; i++) {
          generatedPattern.push({
            shape: shapes[i % 2],
            color: COLORS[(colorStart + i) % COLORS.length],
            size: 50
          });
        }
        answer = {
          shape: shapes[5 % 2],
          color: COLORS[(colorStart + 5) % COLORS.length],
          size: 50
        };
      } else if (patternType === 1) {
        // Geometric number sequence with shape change
        const start = rng.nextInt(1, 4);
        const multiplier = 2;
        const shapeStart = rng.nextInt(0, SHAPES.length - 1);
        const color = rng.choice(COLORS);

        for (let i = 0; i < 5; i++) {
          generatedPattern.push({
            shape: SHAPES[(shapeStart + i) % SHAPES.length],
            color,
            size: 50,
            number: start * Math.pow(multiplier, i)
          });
        }
        answer = {
          shape: SHAPES[(shapeStart + 5) % SHAPES.length],
          color,
          size: 50,
          number: start * Math.pow(multiplier, 5)
        };
      } else {
        // Fibonacci-like with colors
        const colorStart = rng.nextInt(0, COLORS.length - 1);
        const shape = rng.choice(SHAPES);
        const fib = [1, 1];

        for (let i = 2; i < 7; i++) {
          fib.push(fib[i - 1] + fib[i - 2]);
        }

        for (let i = 0; i < 5; i++) {
          generatedPattern.push({
            shape,
            color: COLORS[(colorStart + i) % COLORS.length],
            size: 50,
            number: fib[i]
          });
        }
        answer = {
          shape,
          color: COLORS[(colorStart + 5) % COLORS.length],
          size: 50,
          number: fib[5]
        };
      }
    } else {
      // Insane: multi-variable (shape + color + size)
      const patternType = rng.nextInt(0, 2);

      if (patternType === 0) {
        // Shape cycles forward, color cycles backward, size increases
        const shapeStart = rng.nextInt(0, SHAPES.length - 1);
        const colorStart = rng.nextInt(0, COLORS.length - 1);

        for (let i = 0; i < 5; i++) {
          generatedPattern.push({
            shape: SHAPES[(shapeStart + i) % SHAPES.length],
            color: COLORS[(colorStart - i + COLORS.length * 10) % COLORS.length],
            size: 40 + i * 4
          });
        }
        answer = {
          shape: SHAPES[(shapeStart + 5) % SHAPES.length],
          color: COLORS[(colorStart - 5 + COLORS.length * 10) % COLORS.length],
          size: 40 + 5 * 4
        };
      } else if (patternType === 1) {
        // Numbers with alternating shapes and rotating colors
        const start = rng.nextInt(2, 5);
        const step = rng.nextInt(2, 4);
        const shapes = rng.shuffle([SHAPES[0], SHAPES[1]]);
        const colorStart = rng.nextInt(0, COLORS.length - 1);

        for (let i = 0; i < 5; i++) {
          generatedPattern.push({
            shape: shapes[i % 2],
            color: COLORS[(colorStart + Math.floor(i / 2)) % COLORS.length],
            size: 50,
            number: start + i * step
          });
        }
        answer = {
          shape: shapes[5 % 2],
          color: COLORS[(colorStart + Math.floor(5 / 2)) % COLORS.length],
          size: 50,
          number: start + 5 * step
        };
      } else {
        // Complex: shape+2, color+1, size oscillates
        const shapeStart = rng.nextInt(0, SHAPES.length - 1);
        const colorStart = rng.nextInt(0, COLORS.length - 1);
        const sizes = [45, 55, 45, 55, 45, 55];

        for (let i = 0; i < 5; i++) {
          generatedPattern.push({
            shape: SHAPES[(shapeStart + i * 2) % SHAPES.length],
            color: COLORS[(colorStart + i) % COLORS.length],
            size: sizes[i]
          });
        }
        answer = {
          shape: SHAPES[(shapeStart + 5 * 2) % SHAPES.length],
          color: COLORS[(colorStart + 5) % COLORS.length],
          size: sizes[5]
        };
      }
    }

    // Generate wrong choices
    const wrongChoices: PatternItem[] = [];
    const rng2 = new SeededRandom(seed + 999);

    while (wrongChoices.length < 3) {
      const wrong: PatternItem = {
        shape: rng2.choice(SHAPES),
        color: rng2.choice(COLORS),
        size: rng2.nextInt(40, 60),
        number: answer.number !== undefined ? answer.number + rng2.nextInt(-5, 5) : undefined
      };

      // Make sure it's different from answer
      if (JSON.stringify(wrong) !== JSON.stringify(answer)) {
        wrongChoices.push(wrong);
      }
    }

    const allChoices = rng2.shuffle([answer, ...wrongChoices]);

    setPattern(generatedPattern);
    setCorrectAnswer(answer);
    setChoices(allChoices);
    setSelectedChoice(null);
    setShowResult(false);
  };

  const handleChoiceClick = (index: number) => {
    if (showResult) return;

    playClick();
    setSelectedChoice(index);

    const selected = choices[index];
    const correct = JSON.stringify(selected) === JSON.stringify(correctAnswer);
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      playSuccess();
      setScore(score + 1);
    } else {
      playFailure();
    }
  };

  const handleNext = () => {
    playClick();

    if (currentRound + 1 >= totalRounds) {
      // Game complete
      onComplete(score + (isCorrect ? 1 : 0), totalRounds);
    } else {
      setCurrentRound(currentRound + 1);
    }
  };

  const renderShape = (item: PatternItem, size?: number) => {
    const actualSize = size || item.size;
    const baseStyle: React.CSSProperties = {
      width: `${actualSize}px`,
      height: `${actualSize}px`,
      backgroundColor: item.color,
      boxShadow: `0 0 15px ${item.color}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#000',
      fontWeight: 'bold',
      fontSize: item.number !== undefined ? '18px' : '0',
      flexShrink: 0
    };

    switch (item.shape) {
      case 'circle':
        return (
          <div style={{ ...baseStyle, borderRadius: '50%' }}>
            {item.number !== undefined ? item.number : ''}
          </div>
        );

      case 'square':
        return (
          <div style={baseStyle}>
            {item.number !== undefined ? item.number : ''}
          </div>
        );

      case 'triangle':
        return (
          <div style={{ width: `${actualSize}px`, height: `${actualSize}px`, position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 0,
              height: 0,
              borderLeft: `${actualSize / 2}px solid transparent`,
              borderRight: `${actualSize / 2}px solid transparent`,
              borderBottom: `${actualSize}px solid ${item.color}`,
              boxShadow: `0 0 15px ${item.color}`,
              filter: `drop-shadow(0 0 15px ${item.color})`
            }} />
            {item.number !== undefined && (
              <div style={{
                position: 'absolute',
                top: '60%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>
                {item.number}
              </div>
            )}
          </div>
        );

      case 'diamond':
        return (
          <div style={{ width: `${actualSize}px`, height: `${actualSize}px`, position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: `${actualSize * 0.7}px`,
              height: `${actualSize * 0.7}px`,
              backgroundColor: item.color,
              transform: 'rotate(45deg)',
              boxShadow: `0 0 15px ${item.color}`,
              position: 'absolute',
              top: '15%',
              left: '15%'
            }} />
            {item.number !== undefined && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '18px',
                zIndex: 1
              }}>
                {item.number}
              </div>
            )}
          </div>
        );

      case 'star':
        return (
          <div style={{ width: `${actualSize}px`, height: `${actualSize}px`, position: 'relative', flexShrink: 0 }}>
            <svg width={actualSize} height={actualSize} viewBox="0 0 51 48">
              <path
                d="M25.5 0l7.854 16.764L51 19.764l-12.75 12.618L41.208 51 25.5 42.382 9.792 51l2.958-18.618L0 19.764l17.646-3-7.854-16.764z"
                fill={item.color}
                style={{ filter: `drop-shadow(0 0 10px ${item.color})` }}
              />
            </svg>
            {item.number !== undefined && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>
                {item.number}
              </div>
            )}
          </div>
        );

      case 'hexagon':
        return (
          <div style={{ width: `${actualSize}px`, height: `${actualSize}px`, position: 'relative', flexShrink: 0 }}>
            <svg width={actualSize} height={actualSize} viewBox="0 0 100 100">
              <polygon
                points="50 1 95 25 95 75 50 99 5 75 5 25"
                fill={item.color}
                style={{ filter: `drop-shadow(0 0 10px ${item.color})` }}
              />
            </svg>
            {item.number !== undefined && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '18px'
              }}>
                {item.number}
              </div>
            )}
          </div>
        );

      default:
        return <div style={baseStyle}>{item.number !== undefined ? item.number : ''}</div>;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%)',
      padding: '20px',
      color: '#fff',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <button
          onClick={() => {
            playClick();
            onBack();
          }}
          style={{
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid #00f0ff',
            borderRadius: '8px',
            color: '#00f0ff',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Back
        </button>
        <div style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Pattern Logic
        </div>
        <div style={{ fontSize: '18px' }}>
          Round {currentRound + 1}/{totalRounds}
        </div>
      </div>

      {/* Score */}
      <div style={{
        textAlign: 'center',
        fontSize: '20px',
        marginBottom: '30px',
        color: '#00f0ff'
      }}>
        Score: {score}/{currentRound}
      </div>

      {/* Pattern Sequence */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '50px',
        flexWrap: 'wrap'
      }}>
        {pattern.map((item, index) => (
          <React.Fragment key={index}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '80px',
              minHeight: '80px'
            }}>
              {renderShape(item)}
            </div>
            {index < pattern.length - 1 && (
              <div style={{
                fontSize: '24px',
                color: '#00f0ff',
                fontWeight: 'bold'
              }}>
                →
              </div>
            )}
          </React.Fragment>
        ))}
        <div style={{
          fontSize: '24px',
          color: '#00f0ff',
          fontWeight: 'bold'
        }}>
          →
        </div>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '3px dashed #f0ff00',
          borderRadius: '8px',
          padding: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '80px',
          minHeight: '80px',
          fontSize: '36px',
          color: '#f0ff00',
          fontWeight: 'bold'
        }}>
          ?
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        textAlign: 'center',
        fontSize: '18px',
        marginBottom: '30px',
        color: '#aaa'
      }}>
        What comes next in the pattern?
      </div>

      {/* Choices */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '30px',
        marginBottom: '40px',
        flexWrap: 'wrap'
      }}>
        {choices.map((choice, index) => {
          const isSelected = selectedChoice === index;
          const isCorrectChoice = showResult && JSON.stringify(choice) === JSON.stringify(correctAnswer);
          const isWrongChoice = showResult && isSelected && !isCorrect;

          return (
            <div
              key={index}
              onClick={() => handleChoiceClick(index)}
              style={{
                background: isCorrectChoice
                  ? 'rgba(0, 255, 136, 0.2)'
                  : isWrongChoice
                  ? 'rgba(255, 68, 68, 0.2)'
                  : isSelected
                  ? 'rgba(0, 240, 255, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: isCorrectChoice
                  ? '3px solid #00ff88'
                  : isWrongChoice
                  ? '3px solid #ff4444'
                  : isSelected
                  ? '3px solid #00f0ff'
                  : '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '20px',
                cursor: showResult ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '100px',
                minHeight: '100px',
                transition: 'all 0.3s ease',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                boxShadow: isCorrectChoice
                  ? '0 0 30px rgba(0, 255, 136, 0.5)'
                  : isWrongChoice
                  ? '0 0 30px rgba(255, 68, 68, 0.5)'
                  : 'none'
              }}
            >
              {renderShape(choice)}
            </div>
          );
        })}
      </div>

      {/* Result Message */}
      {showResult && (
        <div style={{
          textAlign: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: isCorrect ? '#00ff88' : '#ff4444',
            marginBottom: '20px'
          }}>
            {isCorrect ? 'Correct!' : 'Wrong!'}
          </div>
          <button
            onClick={handleNext}
            style={{
              padding: '15px 40px',
              background: 'linear-gradient(135deg, #00f0ff 0%, #0088ff 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)'
            }}
          >
            {currentRound + 1 >= totalRounds ? 'Complete' : 'Next Round'}
          </button>
        </div>
      )}

      {/* Progress Bar */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        height: '10px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${((currentRound + (showResult ? 1 : 0)) / totalRounds) * 100}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #00f0ff 0%, #00ff88 100%)',
          transition: 'width 0.3s ease',
          boxShadow: '0 0 10px rgba(0, 240, 255, 0.8)'
        }} />
      </div>
    </div>
  );
};

export default PatternLogic;
