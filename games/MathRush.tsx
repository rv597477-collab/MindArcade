'use client';

import { useState, useEffect, useCallback } from 'react';
import { playClick, playSuccess, playFailure } from '@/lib/sound';

interface MathRushProps {
  difficulty: 'easy' | 'hard' | 'insane';
  level: number;
  onComplete: (score: number, maxScore: number) => void;
  onBack: () => void;
}

interface Problem {
  question: string;
  correctAnswer: number;
  answers: number[];
}

export default function MathRush({ difficulty, level, onComplete, onBack }: MathRushProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Generate a random number within range
  const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  // Generate wrong answers that are plausible
  const generateWrongAnswers = (correct: number, count: number): number[] => {
    const wrong = new Set<number>();
    const range = Math.max(5, Math.floor(Math.abs(correct) * 0.3));

    while (wrong.size < count) {
      const offset = random(-range, range);
      if (offset !== 0) {
        const wrongAnswer = correct + offset;
        if (wrongAnswer !== correct && wrongAnswer >= 0) {
          wrong.add(wrongAnswer);
        }
      }
    }

    return Array.from(wrong);
  };

  // Generate a single problem based on difficulty
  const generateProblem = useCallback((): Problem => {
    let question = '';
    let correctAnswer = 0;

    if (difficulty === 'easy') {
      // Addition/subtraction under 20
      const operation = random(0, 1);
      const a = random(1, 15);
      const b = random(1, 15);

      if (operation === 0) {
        question = `${a} + ${b}`;
        correctAnswer = a + b;
      } else {
        const larger = Math.max(a, b);
        const smaller = Math.min(a, b);
        question = `${larger} - ${smaller}`;
        correctAnswer = larger - smaller;
      }
    } else if (difficulty === 'hard') {
      // Multiplication/division with small numbers
      const operation = random(0, 1);

      if (operation === 0) {
        const a = random(2, 12);
        const b = random(2, 12);
        question = `${a} × ${b}`;
        correctAnswer = a * b;
      } else {
        const b = random(2, 12);
        const result = random(2, 12);
        const a = b * result;
        question = `${a} ÷ ${b}`;
        correctAnswer = result;
      }
    } else {
      // Insane: mixed operations with larger numbers
      const operation = random(0, 3);

      if (operation === 0) {
        const a = random(10, 50);
        const b = random(10, 50);
        question = `${a} + ${b}`;
        correctAnswer = a + b;
      } else if (operation === 1) {
        const a = random(20, 50);
        const b = random(1, 30);
        question = `${a} - ${b}`;
        correctAnswer = a - b;
      } else if (operation === 2) {
        const a = random(5, 15);
        const b = random(5, 15);
        question = `${a} × ${b}`;
        correctAnswer = a * b;
      } else {
        const b = random(2, 12);
        const result = random(5, 20);
        const a = b * result;
        question = `${a} ÷ ${b}`;
        correctAnswer = result;
      }
    }

    // Generate 3 wrong answers and shuffle with correct answer
    const wrongAnswers = generateWrongAnswers(correctAnswer, 3);
    const allAnswers = [correctAnswer, ...wrongAnswers];

    // Fisher-Yates shuffle
    for (let i = allAnswers.length - 1; i > 0; i--) {
      const j = random(0, i);
      [allAnswers[i], allAnswers[j]] = [allAnswers[j], allAnswers[i]];
    }

    return {
      question,
      correctAnswer,
      answers: allAnswers,
    };
  }, [difficulty]);

  // Initialize game
  useEffect(() => {
    const problemCount =
      difficulty === 'easy' ? 5 + level :
      difficulty === 'hard' ? 7 + level :
      10 + level;

    const timePerProblem =
      difficulty === 'easy' ? 15 :
      difficulty === 'hard' ? 10 :
      7;

    const generatedProblems = Array.from({ length: problemCount }, () => generateProblem());
    setProblems(generatedProblems);
    setMaxTime(timePerProblem);
    setTimeLeft(timePerProblem);
    setCurrentProblemIndex(0);
    setScore(0);
    setGameOver(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
  }, [difficulty, level, generateProblem]);

  // Timer countdown
  useEffect(() => {
    if (gameOver || selectedAnswer !== null) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          // Time's up
          playFailure();
          handleTimeout();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [gameOver, selectedAnswer, currentProblemIndex]);

  const handleTimeout = () => {
    // Move to next problem or end game
    if (currentProblemIndex + 1 < problems.length) {
      setTimeout(() => {
        setCurrentProblemIndex((prev) => prev + 1);
        setTimeLeft(maxTime);
        setSelectedAnswer(null);
        setIsCorrect(null);
      }, 500);
    } else {
      // Game over
      setTimeout(() => {
        setGameOver(true);
        onComplete(score, problems.length);
      }, 500);
    }
  };

  const handleAnswerClick = (answer: number) => {
    if (selectedAnswer !== null || gameOver) return;

    playClick();
    setSelectedAnswer(answer);

    const currentProblem = problems[currentProblemIndex];
    const correct = answer === currentProblem.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      playSuccess();
      setScore((prev) => prev + 1);
    } else {
      playFailure();
    }

    // Move to next problem after a brief delay
    setTimeout(() => {
      if (currentProblemIndex + 1 < problems.length) {
        setCurrentProblemIndex((prev) => prev + 1);
        setTimeLeft(maxTime);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        // Game over
        setGameOver(true);
        onComplete(correct ? score + 1 : score, problems.length);
      }
    }, 800);
  };

  const handleBackClick = () => {
    playClick();
    onBack();
  };

  if (problems.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Orbitron, sans-serif',
      }}>
        Loading...
      </div>
    );
  }

  const currentProblem = problems[currentProblemIndex];
  const timerPercentage = (timeLeft / maxTime) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 100%)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <button
          onClick={handleBackClick}
          style={{
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s',
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
          ← BACK
        </button>

        <div style={{
          color: 'white',
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '20px',
        }}>
          Score: {score}/{problems.length}
        </div>
      </div>

      {/* Timer Bar */}
      <div style={{
        width: '100%',
        height: '20px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '40px',
        border: '2px solid rgba(255, 255, 255, 0.2)',
      }}>
        <div style={{
          width: `${timerPercentage}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #00f5ff 0%, #ff00ff 100%)',
          transition: 'width 0.1s linear',
          boxShadow: '0 0 20px rgba(0, 245, 255, 0.5)',
        }} />
      </div>

      {/* Problem Counter */}
      <div style={{
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: 'Orbitron, sans-serif',
        fontSize: '16px',
        marginBottom: '20px',
      }}>
        Problem {currentProblemIndex + 1} of {problems.length}
      </div>

      {/* Problem Display */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%',
      }}>
        <div style={{
          fontSize: '72px',
          fontWeight: 'bold',
          color: '#00f5ff',
          fontFamily: 'Orbitron, sans-serif',
          marginBottom: '60px',
          textShadow: '0 0 30px rgba(0, 245, 255, 0.8)',
          textAlign: 'center',
        }}>
          {currentProblem.question}
        </div>

        {/* Answer Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          width: '100%',
          maxWidth: '600px',
        }}>
          {currentProblem.answers.map((answer, index) => {
            const isSelected = selectedAnswer === answer;
            const isThisCorrect = isSelected && isCorrect === true;
            const isThisWrong = isSelected && isCorrect === false;

            return (
              <button
                key={index}
                onClick={() => handleAnswerClick(answer)}
                disabled={selectedAnswer !== null}
                style={{
                  padding: '30px',
                  background: isThisCorrect
                    ? 'rgba(0, 255, 0, 0.3)'
                    : isThisWrong
                    ? 'rgba(255, 0, 0, 0.3)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isThisCorrect
                    ? '3px solid #00ff00'
                    : isThisWrong
                    ? '3px solid #ff0000'
                    : '3px solid rgba(0, 245, 255, 0.5)',
                  borderRadius: '15px',
                  color: 'white',
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: '36px',
                  fontWeight: 'bold',
                  cursor: selectedAnswer !== null ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: isThisCorrect
                    ? '0 0 30px rgba(0, 255, 0, 0.6)'
                    : isThisWrong
                    ? '0 0 30px rgba(255, 0, 0, 0.6)'
                    : '0 0 20px rgba(0, 245, 255, 0.3)',
                  opacity: selectedAnswer !== null && !isSelected ? 0.4 : 1,
                }}
                onMouseEnter={(e) => {
                  if (selectedAnswer === null) {
                    e.currentTarget.style.background = 'rgba(0, 245, 255, 0.2)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 245, 255, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedAnswer === null) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 245, 255, 0.3)';
                  }
                }}
              >
                {answer}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
