'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GAMES } from '@/lib/gameData';
import { playClick } from '@/lib/sound';

interface LeaderboardEntry {
  playerName: string;
  gameSlug: string;
  gameName: string;
  score: number;
  difficulty: string;
  date: string;
}

export default function LeaderboardPage() {
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    // Load leaderboard data from localStorage
    const loadLeaderboard = () => {
      const entries: LeaderboardEntry[] = [];

      // Generate sample data if no data exists
      const storedData = localStorage.getItem('globalLeaderboard');
      if (storedData) {
        const data = JSON.parse(storedData);
        entries.push(...data);
      } else {
        // Generate sample leaderboard data
        const sampleNames = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery', 'Drew'];
        const difficulties = ['easy', 'hard', 'insane'];

        GAMES.forEach(game => {
          for (let i = 0; i < 3; i++) {
            entries.push({
              playerName: sampleNames[Math.floor(Math.random() * sampleNames.length)],
              gameSlug: game.slug,
              gameName: game.name,
              score: Math.floor(Math.random() * 10000) + 1000,
              difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
              date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            });
          }
        });

        // Sort by score
        entries.sort((a, b) => b.score - a.score);

        // Save to localStorage
        localStorage.setItem('globalLeaderboard', JSON.stringify(entries));
      }

      setLeaderboard(entries);
    };

    loadLeaderboard();
  }, []);

  const filteredLeaderboard = selectedGame === 'all'
    ? leaderboard
    : leaderboard.filter(entry => entry.gameSlug === selectedGame);

  const topEntries = filteredLeaderboard.slice(0, 50);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#00ff88';
      case 'hard': return '#f0ff00';
      case 'insane': return '#ff00aa';
      default: return '#00f0ff';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0f',
      color: '#fff',
      fontFamily: "'Space Mono', monospace",
      padding: '40px 20px',
    }}>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Space+Mono:wght@400;700&display=swap');

        @keyframes neon-pulse {
          0%, 100% { text-shadow: 0 0 20px #00f0ff, 0 0 40px #00f0ff; }
          50% { text-shadow: 0 0 30px #00f0ff, 0 0 60px #00f0ff, 0 0 80px #00f0ff; }
        }

        .leaderboard-row {
          transition: all 0.3s ease;
        }

        .leaderboard-row:hover {
          transform: translateX(10px);
          background: rgba(0, 240, 255, 0.05) !important;
        }

        @media (max-width: 768px) {
          .leaderboard-table {
            font-size: 12px;
          }
        }
      `}</style>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: 'clamp(2.5rem, 8vw, 5rem)',
            fontWeight: 900,
            color: '#00f0ff',
            marginBottom: '20px',
            animation: 'neon-pulse 2s infinite',
          }}>
            🏆 GLOBAL LEADERBOARD
          </h1>
          <p style={{
            fontSize: '1.2rem',
            color: '#f0ff00',
            textShadow: '0 0 10px #f0ff00',
          }}>
            Top players across all games
          </p>
        </div>

        {/* Game Filter */}
        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '40px',
        }}>
          <button
            onClick={() => { setSelectedGame('all'); playClick(); }}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, sans-serif',
              background: selectedGame === 'all' ? 'linear-gradient(135deg, #00f0ff22, #ff00aa22)' : '#1a1a2e',
              color: selectedGame === 'all' ? '#00f0ff' : '#888',
              border: selectedGame === 'all' ? '2px solid #00f0ff' : '2px solid #333',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: selectedGame === 'all' ? '0 0 20px rgba(0,240,255,0.3)' : 'none',
            }}
          >
            All Games
          </button>
          {GAMES.map(game => (
            <button
              key={game.slug}
              onClick={() => { setSelectedGame(game.slug); playClick(); }}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 'bold',
                fontFamily: 'Orbitron, sans-serif',
                background: selectedGame === game.slug ? 'linear-gradient(135deg, #00f0ff22, #ff00aa22)' : '#1a1a2e',
                color: selectedGame === game.slug ? '#00f0ff' : '#888',
                border: selectedGame === game.slug ? '2px solid #00f0ff' : '2px solid #333',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: selectedGame === game.slug ? '0 0 20px rgba(0,240,255,0.3)' : 'none',
              }}
            >
              {game.emoji} {game.name}
            </button>
          ))}
        </div>

        {/* Leaderboard Table */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          borderRadius: '20px',
          border: '2px solid #00f0ff33',
          overflow: 'hidden',
        }}>
          <div className="leaderboard-table">
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 1.5fr 120px 120px 150px',
              gap: '10px',
              padding: '20px',
              background: 'rgba(0, 240, 255, 0.1)',
              borderBottom: '2px solid #00f0ff33',
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#00f0ff',
              fontFamily: 'Orbitron, sans-serif',
            }}>
              <div>Rank</div>
              <div>Player</div>
              <div>Game</div>
              <div>Score</div>
              <div>Difficulty</div>
              <div>Date</div>
            </div>

            {/* Entries */}
            {topEntries.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#888',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎮</div>
                <p>No scores yet. Be the first to play!</p>
              </div>
            ) : (
              topEntries.map((entry, index) => (
                <div
                  key={index}
                  className="leaderboard-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 1.5fr 120px 120px 150px',
                    gap: '10px',
                    padding: '15px 20px',
                    borderBottom: '1px solid #333',
                    background: index % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'transparent',
                  }}
                >
                  <div style={{
                    fontFamily: 'Orbitron, sans-serif',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color: index === 0 ? '#f0ff00' : index === 1 ? '#00f0ff' : index === 2 ? '#ff00aa' : '#888',
                  }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div style={{
                    fontWeight: 'bold',
                    color: '#e0e0ff',
                  }}>
                    {entry.playerName}
                  </div>
                  <div style={{
                    color: '#aaa',
                  }}>
                    {GAMES.find(g => g.slug === entry.gameSlug)?.emoji} {entry.gameName}
                  </div>
                  <div style={{
                    fontFamily: 'Orbitron, sans-serif',
                    fontWeight: 'bold',
                    color: '#00ff88',
                    fontSize: '16px',
                  }}>
                    {entry.score.toLocaleString()}
                  </div>
                  <div style={{
                    fontWeight: 'bold',
                    color: getDifficultyColor(entry.difficulty),
                    textTransform: 'uppercase',
                    fontSize: '12px',
                  }}>
                    {entry.difficulty}
                  </div>
                  <div style={{
                    color: '#888',
                    fontSize: '12px',
                  }}>
                    {formatDate(entry.date)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Back Button */}
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <Link
            href="/"
            onClick={() => playClick()}
            style={{
              display: 'inline-block',
              padding: '15px 40px',
              fontSize: '16px',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, sans-serif',
              background: '#1a1a2e',
              color: '#00f0ff',
              border: '2px solid #00f0ff',
              borderRadius: '12px',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            ← Back to Games
          </Link>
        </div>
      </div>
    </div>
  );
}
