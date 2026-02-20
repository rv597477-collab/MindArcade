'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProfile, saveProfile, ACHIEVEMENTS, getGameProgress, getTotalStarsForGame, getCompletionPercent, PlayerProfile } from '@/lib/storage';
import { GAMES } from '@/lib/gameData';
import { playClick } from '@/lib/sound';

const AVATAR_EMOJIS = ['🎮', '👾', '🤖', '🚀', '⚡', '🔥', '💎', '🎯', '🌟', '🎪', '🦊', '🐉'];

export default function ProfilePage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [stats, setStats] = useState({
    totalGames: 0,
    totalStars: 0,
    currentStreak: 0,
    memberSince: '',
    favoriteCategory: 'N/A',
  });
  const [gameStats, setGameStats] = useState<{ slug: string; stars: number; pct: number; lastPlayed: string }[]>([]);

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setPlayerName(p.name);

    // Calculate stats from individual game progress
    let totalStars = 0;
    const catCount: Record<string, number> = {};
    const gs: typeof gameStats = [];

    for (const game of GAMES) {
      const gp = getGameProgress(game.slug);
      const stars = getTotalStarsForGame(game.slug);
      const pct = getCompletionPercent(game.slug);
      totalStars += stars;
      if (gp.gamesPlayed > 0) {
        catCount[game.category] = (catCount[game.category] || 0) + gp.gamesPlayed;
      }
      gs.push({
        slug: game.slug,
        stars,
        pct,
        lastPlayed: gp.lastPlayed ? new Date(gp.lastPlayed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never',
      });
    }

    const favCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];
    setStats({
      totalGames: p.totalGamesPlayed,
      totalStars: totalStars,
      currentStreak: p.currentStreak,
      memberSince: new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      favoriteCategory: favCat ? favCat[0].charAt(0).toUpperCase() + favCat[0].slice(1) : 'N/A',
    });
    setGameStats(gs);
  }, []);

  const handleAvatarChange = (emoji: string) => {
    playClick();
    if (!profile) return;
    const updated = { ...profile, avatar: emoji };
    saveProfile(updated);
    setProfile(updated);
    setShowAvatarPicker(false);
  };

  const handleNameBlur = () => {
    if (!profile) return;
    if (playerName.trim() && playerName !== profile.name) {
      playClick();
      const updated = { ...profile, name: playerName.trim() };
      saveProfile(updated);
      setProfile(updated);
    } else if (!playerName.trim()) {
      setPlayerName(profile.name);
    }
  };

  const handleReset = () => {
    playClick();
    if (showResetConfirm) {
      localStorage.clear();
      window.location.href = '/';
    } else {
      setShowResetConfirm(true);
      setTimeout(() => setShowResetConfirm(false), 5000);
    }
  };

  if (!profile) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="neon-spinner" /></div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '30px 20px' }}>
      {/* Back */}
      <Link href="/" onClick={() => playClick()} style={{ color: '#00f0ff', textDecoration: 'none', fontSize: 13, fontFamily: 'Orbitron' }}>← Back to Games</Link>

      {/* Player Info */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24, marginTop: 24, marginBottom: 32,
        background: '#12121a', border: '1px solid rgba(255,0,170,0.3)', borderRadius: 16, padding: 24,
      }}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => { playClick(); setShowAvatarPicker(!showAvatarPicker); }} style={{
            fontSize: 60, background: 'rgba(255,255,255,0.05)', border: '2px solid #00f0ff',
            borderRadius: '50%', width: 90, height: 90, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s',
          }}>
            {profile.avatar}
          </button>
          {showAvatarPicker && (
            <div style={{
              position: 'absolute', top: 100, left: 0, background: '#0a0a0f', border: '1px solid #00f0ff',
              borderRadius: 12, padding: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8, zIndex: 100, boxShadow: '0 0 20px rgba(0,240,255,0.3)',
            }}>
              {AVATAR_EMOJIS.map(e => (
                <button key={e} onClick={() => handleAvatarChange(e)} style={{
                  fontSize: 32, background: e === profile.avatar ? 'rgba(0,240,255,0.15)' : 'transparent',
                  border: e === profile.avatar ? '1px solid #00f0ff' : '1px solid transparent',
                  borderRadius: 8, padding: 8, cursor: 'pointer',
                }}>{e}</button>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            style={{
              fontSize: 28, fontFamily: 'Orbitron', fontWeight: 700, background: 'transparent',
              border: 'none', borderBottom: '2px solid rgba(0,240,255,0.3)', color: '#e0e0ff',
              width: '100%', maxWidth: 400, outline: 'none', padding: '4px 0',
            }}
          />
          <p style={{ color: '#8888aa', fontSize: 13, margin: '8px 0 0' }}>Click to edit name</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Games Played', value: stats.totalGames, color: '#00f0ff' },
          { label: 'Total Stars', value: `⭐ ${stats.totalStars}`, color: '#f0ff00' },
          { label: 'Streak', value: `${stats.currentStreak}d`, color: '#ff00aa' },
          { label: 'Member Since', value: stats.memberSince, color: '#00ff88' },
          { label: 'Fav Category', value: stats.favoriteCategory, color: '#ff8844' },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#12121a', border: `1px solid ${s.color}33`, borderRadius: 12, padding: 16, textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#8888aa', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <h2 style={{ fontFamily: 'Orbitron', fontSize: 20, color: '#f0ff00', marginBottom: 16 }}>🏆 Achievements</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 32 }}>
        {Object.entries(ACHIEVEMENTS).map(([key, a]) => {
          const unlocked = profile.achievements.includes(key);
          return (
            <div key={key} style={{
              background: unlocked ? 'rgba(240,255,0,0.05)' : '#12121a',
              border: `1px solid ${unlocked ? '#f0ff0066' : '#ffffff10'}`,
              borderRadius: 12, padding: 16, textAlign: 'center', opacity: unlocked ? 1 : 0.4,
              boxShadow: unlocked ? '0 0 15px rgba(240,255,0,0.15)' : 'none',
            }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{a.icon}</div>
              <div style={{ fontFamily: 'Orbitron', fontSize: 13, fontWeight: 600, color: unlocked ? '#f0ff00' : '#666', marginBottom: 4 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: unlocked ? '#aaa' : '#555' }}>{a.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Game Progress */}
      <h2 style={{ fontFamily: 'Orbitron', fontSize: 20, color: '#00f0ff', marginBottom: 16 }}>🎮 Game Progress</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 40 }}>
        {GAMES.map((game, i) => {
          const gs = gameStats[i];
          if (!gs) return null;
          return (
            <Link key={game.slug} href={`/game/${game.slug}`} style={{ textDecoration: 'none' }}>
              <div className="neon-glow-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>{game.emoji}</span>
                  <div>
                    <div style={{ fontFamily: 'Orbitron', fontSize: 14, fontWeight: 600, color: '#e0e0ff' }}>{game.name}</div>
                    <div style={{ fontSize: 11, color: '#8888aa' }}>{game.category}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: '#f0ff00' }}>⭐ {gs.stars}/45</span>
                  <span style={{ color: '#00f0ff' }}>{gs.pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${gs.pct}%` }} />
                </div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 6, textAlign: 'right' }}>Last: {gs.lastPlayed}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Reset */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <button onClick={handleReset} style={{
          fontFamily: 'Orbitron', fontSize: 13, padding: '12px 32px', borderRadius: 8,
          background: showResetConfirm ? 'rgba(255,0,0,0.15)' : 'transparent',
          border: `1px solid ${showResetConfirm ? '#ff0000' : '#ff4444'}`,
          color: showResetConfirm ? '#ff0000' : '#ff4444', cursor: 'pointer', transition: 'all 0.3s',
        }}>
          {showResetConfirm ? 'CONFIRM RESET - Click Again' : 'Reset All Progress'}
        </button>
        {showResetConfirm && <p style={{ color: '#ff4444', fontSize: 12, marginTop: 8 }}>This will permanently delete all progress!</p>}
      </div>
    </div>
  );
}
