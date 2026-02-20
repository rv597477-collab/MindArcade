'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GAMES, CATEGORIES } from '@/lib/gameData';
import { getProfile, getGameProgress, getTotalStarsForGame, getCompletionPercent } from '@/lib/storage';
import { playClick } from '@/lib/sound';

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [totalGamesPlayed, setTotalGamesPlayed] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [gameProgressData, setGameProgressData] = useState<Record<string, any>>({});

  useEffect(() => {
    // Load progress data from localStorage
    const profile = getProfile();
    setCurrentStreak(profile.currentStreak || 0);

    let gamesPlayed = 0;
    let totalStarsCount = 0;
    const progressData: Record<string, any> = {};

    GAMES.forEach((game) => {
      const progress = getGameProgress(game.slug);
      progressData[game.slug] = progress;

      if (progress && Object.keys(progress).length > 0) {
        gamesPlayed++;
      }

      const stars = getTotalStarsForGame(game.slug);
      totalStarsCount += stars;
    });

    setTotalGamesPlayed(gamesPlayed);
    setTotalStars(totalStarsCount);
    setGameProgressData(progressData);
  }, []);

  const categories = [
    { id: 'all', label: 'All Games', emoji: '' },
    { id: 'brain', label: 'Brain Games', emoji: '🧠' },
    { id: 'fun', label: 'Fun Games', emoji: '🎮' },
    { id: 'attractive', label: 'Attractive Games', emoji: '✨' },
  ];

  const filteredGames = selectedCategory === 'all'
    ? GAMES
    : GAMES.filter(game => game.category === selectedCategory);

  const handleCategoryClick = (categoryId: string) => {
    playClick();
    setSelectedCategory(categoryId);
  };

  const handleCardClick = () => {
    playClick();
  };

  const getHighestUnlockedDifficulty = (slug: string) => {
    const progress = gameProgressData[slug];
    if (!progress) return null;

    const difficulties = ['easy', 'medium', 'hard', 'expert'];
    let highest = null;

    for (const diff of difficulties) {
      if (progress[diff]) {
        highest = diff;
      }
    }

    return highest;
  };

  const getBestScore = (slug: string) => {
    const progress = gameProgressData[slug];
    if (!progress) return 0;

    let bestScore = 0;
    ['easy', 'medium', 'hard', 'expert'].forEach(diff => {
      if (progress[diff]?.bestScore > bestScore) {
        bestScore = progress[diff].bestScore;
      }
    });

    return bestScore;
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0f',
      color: '#fff',
      fontFamily: "'Space Mono', monospace",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Floating animated shapes in background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        <div className="float-shape shape-1" style={{
          position: 'absolute',
          width: '150px',
          height: '150px',
          background: 'linear-gradient(135deg, #00f0ff33, #ff00aa33)',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          top: '10%',
          left: '10%',
          animation: 'float1 20s infinite ease-in-out',
        }} />
        <div className="float-shape shape-2" style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          background: 'linear-gradient(135deg, #f0ff0033, #00ff8833)',
          borderRadius: '50%',
          top: '60%',
          right: '15%',
          animation: 'float2 25s infinite ease-in-out',
        }} />
        <div className="float-shape shape-3" style={{
          position: 'absolute',
          width: '100px',
          height: '100px',
          background: 'linear-gradient(135deg, #ff00aa33, #f0ff0033)',
          transform: 'rotate(45deg)',
          bottom: '20%',
          left: '20%',
          animation: 'float3 15s infinite ease-in-out',
        }} />
        <div className="float-shape shape-4" style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          background: 'linear-gradient(135deg, #00ff8833, #00f0ff33)',
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          top: '40%',
          right: '5%',
          animation: 'float4 18s infinite ease-in-out',
        }} />
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Space+Mono:wght@400;700&display=swap');

        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -50px) rotate(120deg); }
          66% { transform: translate(-20px, 30px) rotate(240deg); }
        }

        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
          33% { transform: translate(-40px, 40px) rotate(-120deg) scale(1.1); }
          66% { transform: translate(20px, -30px) rotate(-240deg) scale(0.9); }
        }

        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) rotate(45deg); }
          50% { transform: translate(50px, -40px) rotate(225deg); }
        }

        @keyframes float4 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-30px, -30px) rotate(90deg); }
          66% { transform: translate(40px, 20px) rotate(180deg); }
        }

        @keyframes flicker {
          0%, 100% { opacity: 1; text-shadow: 0 0 20px #00f0ff, 0 0 40px #00f0ff, 0 0 60px #00f0ff; }
          2% { opacity: 0.8; }
          4% { opacity: 1; }
          8% { opacity: 0.9; }
          10% { opacity: 1; }
          12% { opacity: 0.85; }
          14% { opacity: 1; }
        }

        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 10px #00f0ff, 0 0 20px #00f0ff; }
          50% { box-shadow: 0 0 20px #00f0ff, 0 0 40px #00f0ff, 0 0 60px #00f0ff; }
        }

        .neon-title {
          font-family: 'Orbitron', sans-serif;
          font-weight: 900;
          color: #00f0ff;
          text-shadow: 0 0 20px #00f0ff, 0 0 40px #00f0ff, 0 0 60px #00f0ff, 0 0 80px #00f0ff;
          animation: flicker 8s infinite;
        }

        .neon-glow-card {
          transition: all 0.3s ease;
        }

        .neon-glow-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 0 30px #00f0ff, 0 0 50px #ff00aa;
        }

        .category-tab {
          transition: all 0.3s ease;
        }

        .category-tab-selected {
          box-shadow: 0 0 20px #00f0ff, 0 0 40px #00f0ff;
          animation: glow-pulse 2s infinite;
        }

        @media (max-width: 640px) {
          .game-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (min-width: 641px) and (max-width: 1024px) {
          .game-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (min-width: 1025px) {
          .game-grid {
            grid-template-columns: repeat(4, 1fr) !important;
          }
        }
      `}</style>

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '20px',
      }}>
        {/* Hero Section */}
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          marginBottom: '40px',
        }}>
          <h1 className="neon-title" style={{
            fontSize: 'clamp(3rem, 10vw, 7rem)',
            margin: '0 0 20px 0',
            letterSpacing: '0.1em',
          }}>
            GAMEVAULT
          </h1>
          <p style={{
            fontSize: 'clamp(1rem, 3vw, 1.5rem)',
            color: '#f0ff00',
            textShadow: '0 0 10px #f0ff00',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
          }}>
            Level Up Your Brain. No Login Required.
          </p>
        </div>

        {/* Quick Stats Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          flexWrap: 'wrap',
          marginBottom: '60px',
          padding: '30px',
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          borderRadius: '20px',
          border: '2px solid #00f0ff33',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#00f0ff',
              fontFamily: "'Orbitron', sans-serif",
            }}>
              {totalGamesPlayed}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '5px' }}>
              Total Games Played
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#ff00aa',
              fontFamily: "'Orbitron', sans-serif",
            }}>
              {currentStreak}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '5px' }}>
              Current Streak
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#f0ff00',
              fontFamily: "'Orbitron', sans-serif",
            }}>
              {totalStars}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '5px' }}>
              Total Stars
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          flexWrap: 'wrap',
          marginBottom: '50px',
        }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`category-tab ${selectedCategory === cat.id ? 'category-tab-selected' : ''}`}
              style={{
                padding: '15px 30px',
                fontSize: '1rem',
                fontWeight: 'bold',
                fontFamily: "'Orbitron', sans-serif",
                background: selectedCategory === cat.id
                  ? 'linear-gradient(135deg, #00f0ff22, #ff00aa22)'
                  : '#1a1a2e',
                color: selectedCategory === cat.id ? '#00f0ff' : '#aaa',
                border: selectedCategory === cat.id ? '2px solid #00f0ff' : '2px solid #333',
                borderRadius: '12px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {cat.emoji && <span style={{ marginRight: '8px' }}>{cat.emoji}</span>}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Game Cards Grid */}
        <div className="game-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '30px',
          marginBottom: '60px',
        }}>
          {filteredGames.map((game) => {
            const highestDifficulty = getHighestUnlockedDifficulty(game.slug);
            const bestScore = getBestScore(game.slug);
            const stars = getTotalStarsForGame(game.slug);
            const completion = getCompletionPercent(game.slug);

            return (
              <Link
                key={game.slug}
                href={`/game/${game.slug}`}
                onClick={handleCardClick}
                style={{ textDecoration: 'none' }}
              >
                <div className="neon-glow-card" style={{
                  background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                  borderRadius: '20px',
                  padding: '25px',
                  border: '2px solid #333',
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {/* Game Icon */}
                  <div style={{
                    fontSize: '4rem',
                    textAlign: 'center',
                    marginBottom: '15px',
                  }}>
                    {game.emoji}
                  </div>

                  {/* Game Name */}
                  <h3 style={{
                    fontFamily: "'Orbitron', sans-serif",
                    fontSize: '1.3rem',
                    color: '#fff',
                    textAlign: 'center',
                    marginBottom: '15px',
                    minHeight: '60px',
                  }}>
                    {game.name}
                  </h3>

                  {/* Category Badge */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '15px',
                  }}>
                    <span style={{
                      padding: '5px 15px',
                      background: game.category === 'brain'
                        ? '#00f0ff22'
                        : game.category === 'fun'
                        ? '#ff00aa22'
                        : '#f0ff0022',
                      color: game.category === 'brain'
                        ? '#00f0ff'
                        : game.category === 'fun'
                        ? '#ff00aa'
                        : '#f0ff00',
                      border: game.category === 'brain'
                        ? '1px solid #00f0ff'
                        : game.category === 'fun'
                        ? '1px solid #ff00aa'
                        : '1px solid #f0ff00',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                    }}>
                      {CATEGORIES.find(c => c.id === game.category)?.label || game.category}
                    </span>
                  </div>

                  {/* Difficulty Indicator */}
                  <div style={{
                    marginBottom: '15px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#aaa',
                      marginBottom: '5px',
                    }}>
                      Highest Unlocked
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      color: highestDifficulty === 'expert'
                        ? '#ff00aa'
                        : highestDifficulty === 'hard'
                        ? '#f0ff00'
                        : highestDifficulty === 'medium'
                        ? '#00ff88'
                        : highestDifficulty === 'easy'
                        ? '#00f0ff'
                        : '#555',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}>
                      {highestDifficulty || 'Not Started'}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{
                    marginBottom: '15px',
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#aaa',
                      marginBottom: '8px',
                      textAlign: 'center',
                    }}>
                      Progress: {completion}%
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: '#0a0a0f',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '1px solid #333',
                    }}>
                      <div style={{
                        width: `${completion}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #00f0ff, #00ff88)',
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>

                  {/* Best Score and Stars */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 'auto',
                  }}>
                    <div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#aaa',
                      }}>
                        Best Score
                      </div>
                      <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: '#00ff88',
                        fontFamily: "'Orbitron', sans-serif",
                      }}>
                        {bestScore.toLocaleString()}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      color: '#f0ff00',
                      textShadow: '0 0 10px #f0ff00',
                    }}>
                      ⭐ {stars}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
