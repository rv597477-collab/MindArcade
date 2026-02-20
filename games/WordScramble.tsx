import React, { useState, useEffect, useCallback } from 'react';
import { playClick, playSuccess, playFailure } from '@/lib/sound';

interface WordScrambleProps {
  difficulty: 'easy' | 'hard' | 'insane';
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

interface WordData {
  original: string;
  scrambled: string[];
}

const WORD_LISTS = {
  easy: [
    "game", "play", "code", "life", "time", "fire", "star", "moon", "tree", "fish",
    "bird", "word", "jump", "swim", "help", "mind", "love", "dark", "rain", "snow",
    "blue", "fast", "glow", "bold", "neon", "cube", "maze", "hero", "zero", "grid",
    "peak", "wave", "wind", "gold", "echo", "beam", "rust", "tide", "leaf", "claw"
  ],
  hard: [
    "brain", "pixel", "quest", "realm", "tower", "light", "power", "magic", "flame", "storm",
    "swift", "royal", "dream", "ghost", "blade", "pulse", "spark", "cyber", "nexus", "orbit",
    "prism", "forge", "crypt", "vault", "sonic", "chase", "blitz", "turbo", "omega", "alpha",
    "lunar", "solar", "flare", "phase", "vortex", "elite", "titan", "aegis", "karma", "abyss"
  ],
  insane: [
    "enigma", "cyborg", "matrix", "galaxy", "portal", "legend", "phoenix", "quantum", "nebula", "thunder",
    "eclipse", "phantom", "cascade", "voltage", "stellar", "anomaly", "paradox", "crystal", "arcadia", "destiny",
    "horizon", "digital", "odyssey", "synergy", "triumph", "radiant", "genesis", "catalyst", "spectrum", "infinity",
    "vanguard", "tempest", "citadel", "basilisk", "maelstrom", "labyrinth", "obsidian", "covenant", "sentinel", "dominion"
  ]
};

const DIFFICULTY_CONFIG = {
  easy: { timeLimit: 30, wordsPerRound: 3, hasHints: true },
  hard: { timeLimit: 25, wordsPerRound: 4, hasHints: false },
  insane: { timeLimit: 20, wordsPerRound: 5, hasHints: false }
};

const WordScramble: React.FC<WordScrambleProps> = ({ difficulty, level, onComplete, onBack }) => {
  const config = DIFFICULTY_CONFIG[difficulty];
  const totalWords = config.wordsPerRound + level;

  const [words, setWords] = useState<WordData[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [placedLetters, setPlacedLetters] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [showHint, setShowHint] = useState(false);
  const [shake, setShake] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  // Fisher-Yates shuffle
  const shuffleArray = (array: string[]): string[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Initialize game
  useEffect(() => {
    const wordList = WORD_LISTS[difficulty];
    const shuffledWords = shuffleArray([...wordList]);
    const selectedWords = shuffledWords.slice(0, totalWords);

    const wordData = selectedWords.map(word => {
      const letters = word.toUpperCase().split('');
      let scrambled = shuffleArray(letters);

      // Ensure scrambled is different from original
      let attempts = 0;
      while (scrambled.join('') === letters.join('') && attempts < 10) {
        scrambled = shuffleArray(letters);
        attempts++;
      }

      return {
        original: word.toUpperCase(),
        scrambled
      };
    });

    setWords(wordData);
    if (wordData.length > 0) {
      setAvailableLetters(wordData[0].scrambled);
    }
  }, [difficulty, level, totalWords]);

  // Timer
  useEffect(() => {
    if (gameOver || words.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up, move to next word
          handleNextWord(false);
          return config.timeLimit;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentWordIndex, gameOver, words, config.timeLimit]);

  const handleNextWord = useCallback((isCorrect: boolean) => {
    if (isCorrect) {
      playSuccess();
      setScore(prev => prev + 1);
    } else {
      playFailure();
    }

    const nextIndex = currentWordIndex + 1;
    if (nextIndex >= words.length) {
      // Game over
      setGameOver(true);
      setTimeout(() => {
        onComplete(isCorrect ? score + 1 : score, words.length);
      }, 500);
    } else {
      // Next word
      setCurrentWordIndex(nextIndex);
      setAvailableLetters(words[nextIndex].scrambled);
      setPlacedLetters([]);
      setTimeLeft(config.timeLimit);
      setShowHint(false);
    }
  }, [currentWordIndex, words, score, onComplete, config.timeLimit]);

  // Check answer when all letters are placed
  useEffect(() => {
    if (placedLetters.length === 0 || words.length === 0) return;
    if (placedLetters.length !== words[currentWordIndex].original.length) return;

    const answer = placedLetters.join('');
    const correct = answer === words[currentWordIndex].original;

    if (correct) {
      setTimeout(() => handleNextWord(true), 300);
    } else {
      // Wrong answer - shake and clear
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setAvailableLetters(words[currentWordIndex].scrambled);
        setPlacedLetters([]);
      }, 500);
    }
  }, [placedLetters, currentWordIndex, words, handleNextWord]);

  const handleLetterClick = (letter: string, index: number, isPlaced: boolean) => {
    playClick();

    if (isPlaced) {
      // Remove from placed, add back to available
      const newPlaced = [...placedLetters];
      newPlaced.splice(index, 1);
      setPlacedLetters(newPlaced);
      setAvailableLetters([...availableLetters, letter]);
    } else {
      // Add to placed, remove from available
      setPlacedLetters([...placedLetters, letter]);
      const newAvailable = [...availableLetters];
      const availIndex = newAvailable.indexOf(letter);
      if (availIndex > -1) {
        newAvailable.splice(availIndex, 1);
      }
      setAvailableLetters(newAvailable);
    }
  };

  const handleHint = () => {
    if (config.hasHints && !showHint) {
      playClick();
      setShowHint(true);
    }
  };

  const handleSkip = () => {
    playClick();
    handleNextWord(false);
  };

  if (words.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div style={styles.container}>
        <div style={styles.gameOverCard}>
          <h1 style={styles.gameOverTitle}>Game Complete!</h1>
          <div style={styles.finalScore}>
            Score: {score} / {words.length}
          </div>
        </div>
      </div>
    );
  }

  const currentWord = words[currentWordIndex];
  const timePercentage = (timeLeft / config.timeLimit) * 100;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          ← Back
        </button>
        <div style={styles.scoreInfo}>
          <span style={styles.scoreText}>
            Word {currentWordIndex + 1} / {words.length}
          </span>
          <span style={styles.scoreText}>Score: {score}</span>
        </div>
      </div>

      {/* Timer Bar */}
      <div style={styles.timerContainer}>
        <div
          style={{
            ...styles.timerBar,
            width: `${timePercentage}%`,
            backgroundColor: timePercentage > 50 ? '#00ffff' : timePercentage > 25 ? '#ffaa00' : '#ff0066'
          }}
        />
        <div style={styles.timerText}>{timeLeft}s</div>
      </div>

      {/* Game Content */}
      <div style={styles.gameContent}>
        <h2 style={styles.instruction}>Unscramble the word!</h2>

        {/* Hint */}
        {config.hasHints && (
          <div style={styles.hintContainer}>
            {showHint ? (
              <div style={styles.hintText}>
                Hint: Starts with "{currentWord.original[0]}"
              </div>
            ) : (
              <button onClick={handleHint} style={styles.hintButton}>
                Show Hint
              </button>
            )}
          </div>
        )}

        {/* Answer Slots */}
        <div style={styles.answerContainer}>
          <div style={styles.answerSlots}>
            {Array.from({ length: currentWord.original.length }).map((_, index) => (
              <div
                key={`slot-${index}`}
                style={{
                  ...styles.answerSlot,
                  ...(shake ? styles.shake : {})
                }}
              >
                {placedLetters[index] && (
                  <button
                    onClick={() => handleLetterClick(placedLetters[index], index, true)}
                    style={styles.placedLetter}
                  >
                    {placedLetters[index]}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scrambled Letters */}
        <div style={styles.scrambledContainer}>
          <div style={styles.scrambledLetters}>
            {availableLetters.map((letter, index) => (
              <button
                key={`available-${index}-${letter}`}
                onClick={() => handleLetterClick(letter, index, false)}
                style={styles.letterTile}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Skip Button */}
        <button onClick={handleSkip} style={styles.skipButton}>
          Skip Word
        </button>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100vh',
    backgroundColor: '#0a0a1a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif'
  },
  loading: {
    color: '#00ffff',
    fontSize: '24px',
    marginTop: '50px'
  },
  header: {
    width: '100%',
    maxWidth: '800px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid #00ffff',
    borderRadius: '8px',
    color: '#00ffff',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  scoreInfo: {
    display: 'flex',
    gap: '20px'
  },
  scoreText: {
    color: '#00ffff',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  timerContainer: {
    width: '100%',
    maxWidth: '800px',
    height: '30px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: '30px'
  },
  timerBar: {
    height: '100%',
    transition: 'width 1s linear, background-color 0.3s',
    borderRadius: '15px',
    boxShadow: '0 0 20px currentColor'
  },
  timerText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '16px'
  },
  gameContent: {
    width: '100%',
    maxWidth: '800px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px'
  },
  instruction: {
    color: '#ffffff',
    fontSize: '28px',
    margin: 0,
    textAlign: 'center'
  },
  hintContainer: {
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  hintButton: {
    padding: '10px 20px',
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
    border: '2px solid #ffaa00',
    borderRadius: '8px',
    color: '#ffaa00',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  hintText: {
    color: '#ffaa00',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  answerContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    minHeight: '80px'
  },
  answerSlots: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  answerSlot: {
    width: '60px',
    height: '60px',
    border: '3px solid #00ffff',
    borderRadius: '8px',
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s'
  },
  shake: {
    animation: 'shake 0.5s',
    borderColor: '#ff0066'
  },
  placedLetter: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 255, 255, 0.3)',
    border: 'none',
    borderRadius: '4px',
    color: '#00ffff',
    fontSize: '28px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 0 15px rgba(0, 255, 255, 0.5)'
  },
  scrambledContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    minHeight: '80px'
  },
  scrambledLetters: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '600px'
  },
  letterTile: {
    width: '60px',
    height: '60px',
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    border: '3px solid #00ffff',
    borderRadius: '8px',
    color: '#00ffff',
    fontSize: '28px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  skipButton: {
    padding: '12px 30px',
    backgroundColor: 'rgba(255, 0, 102, 0.2)',
    border: '2px solid #ff0066',
    borderRadius: '8px',
    color: '#ff0066',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '20px'
  },
  gameOverCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '3px solid #00ffff',
    borderRadius: '20px',
    padding: '60px',
    textAlign: 'center',
    boxShadow: '0 0 40px rgba(0, 255, 255, 0.3)',
    marginTop: '100px'
  },
  gameOverTitle: {
    color: '#00ffff',
    fontSize: '48px',
    margin: '0 0 30px 0',
    textShadow: '0 0 20px rgba(0, 255, 255, 0.8)'
  },
  finalScore: {
    color: '#ffffff',
    fontSize: '32px',
    fontWeight: 'bold'
  }
};

// Add shake animation via style tag
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default WordScramble;
