'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import Link from 'next/link';
import { GameProgress, getGameProgress, completeLevel } from '@/lib/storage';
import { DIFFICULTY_LABELS } from '@/lib/gameData';
import { playClick, playLevelComplete, playStarEarn, playBackgroundMusic, stopBackgroundMusic, isMuted, setMuted } from '@/lib/sound';

type Difficulty = 'easy' | 'hard' | 'insane';

interface GameShellProps {
  slug: string;
  name: string;
  emoji: string;
  renderGame: (props: {
    difficulty: Difficulty;
    level: number;
    onComplete: (score: number, maxScore: number) => void;
    onBack: () => void;
  }) => ReactNode;
}

export default function GameShell({ slug, name, emoji, renderGame }: GameShellProps) {
  const [progress, setProgress] = useState<GameProgress | null>(null);
  const [view, setView] = useState<'select' | 'playing' | 'complete'>('select');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy');
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [completionStars, setCompletionStars] = useState(0);
  const [completionScore, setCompletionScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mute, setMute] = useState(true);

  useEffect(() => {
    setProgress(getGameProgress(slug));
    setMute(isMuted());
  }, [slug]);

  // Start/stop background music based on view
  useEffect(() => {
    if (view === 'playing') {
      playBackgroundMusic(slug);
    } else {
      stopBackgroundMusic();
    }

    return () => {
      stopBackgroundMusic();
    };
  }, [view, slug]);

  // Handle pause with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && view === 'playing') {
        e.preventDefault();
        setIsPaused(!isPaused);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isPaused]);

  const toggleMute = () => {
    const newMuted = !mute;
    setMute(newMuted);
    setMuted(newMuted);
    if (newMuted) {
      stopBackgroundMusic();
    } else {
      if (view === 'playing') {
        playBackgroundMusic(slug);
      }
      playClick();
    }
  };

  const handleComplete = useCallback((score: number, maxScore: number) => {
    const pct = maxScore > 0 ? score / maxScore : 0;
    let stars = 1;
    if (pct >= 0.9) stars = 3;
    else if (pct >= 0.6) stars = 2;

    setCompletionStars(stars);
    setCompletionScore(score);
    const updated = completeLevel(slug, selectedDifficulty, selectedLevel, stars, score);
    setProgress(updated);
    setView('complete');
    stopBackgroundMusic();
    playLevelComplete();
    setTimeout(() => playStarEarn(), 400);
  }, [slug, selectedDifficulty, selectedLevel]);

  const startLevel = (diff: Difficulty, lvl: number) => {
    playClick();
    setSelectedDifficulty(diff);
    setSelectedLevel(lvl);
    setView('playing');
  };

  const goToSelect = () => {
    playClick();
    setView('select');
    setProgress(getGameProgress(slug));
  };

  const nextLevel = () => {
    playClick();
    const levels = progress?.levels[selectedDifficulty] || [];
    if (selectedLevel + 1 < levels.length && levels[selectedLevel + 1]?.unlocked) {
      setSelectedLevel(selectedLevel + 1);
      setView('playing');
    } else {
      setView('select');
      setProgress(getGameProgress(slug));
    }
  };

  if (!progress) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="neon-spinner" /></div>;

  // Complete screen
  if (view === 'complete') {
    return (
      <div className="slide-up" style={{ maxWidth: 500, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontFamily: 'Orbitron', fontSize: 28, color: '#00f0ff', marginBottom: 8 }}>Level Complete!</h2>
        <p style={{ color: '#8888aa', marginBottom: 24, fontFamily: 'Space Mono' }}>Score: {completionScore}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map(i => (
            <span key={i} className={i <= completionStars ? 'star-pop' : ''} style={{
              fontSize: 40,
              animationDelay: `${i * 0.15}s`,
              opacity: i <= completionStars ? 1 : 0.2,
              filter: i <= completionStars ? 'drop-shadow(0 0 8px #f0ff00)' : 'none',
            }}>⭐</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-neon" onClick={goToSelect}>Level Select</button>
          <button className="btn-neon btn-neon-green" onClick={nextLevel} style={{ borderColor: '#00ff88', color: '#00ff88' }}>
            Next Level →
          </button>
        </div>
      </div>
    );
  }

  // Playing
  if (view === 'playing') {
    return (
      <div style={{ padding: '20px', maxWidth: 900, margin: '0 auto', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={goToSelect} className="btn-neon" style={{ padding: '6px 16px', fontSize: 12 }}>
            ← Back
          </button>
          <span style={{ fontFamily: 'Orbitron', fontSize: 14, color: '#8888aa' }}>
            {DIFFICULTY_LABELS[selectedDifficulty].icon} {DIFFICULTY_LABELS[selectedDifficulty].label} - Level {selectedLevel + 1}
          </span>
          <button
            onClick={toggleMute}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 18,
              color: '#e0e0ff',
            }}
            title={mute ? 'Unmute' : 'Mute'}
          >
            {mute ? '🔇' : '🔊'}
          </button>
        </div>
        {renderGame({
          difficulty: selectedDifficulty,
          level: selectedLevel,
          onComplete: handleComplete,
          onBack: goToSelect,
        })}

        {/* Pause Menu */}
        {isPaused && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 10, 15, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              border: '2px solid #00f0ff',
              borderRadius: 20,
              padding: 40,
              textAlign: 'center',
              boxShadow: '0 0 40px rgba(0,240,255,0.3)',
            }}>
              <h2 style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: 32,
                color: '#00f0ff',
                marginBottom: 20,
                textShadow: '0 0 20px rgba(0,240,255,0.5)',
              }}>
                PAUSED
              </h2>
              <p style={{ color: '#aaa', marginBottom: 30 }}>Press ESC to resume</p>
              <div style={{ display: 'flex', gap: 15, flexDirection: 'column' }}>
                <button
                  onClick={() => setIsPaused(false)}
                  className="btn-neon"
                  style={{ padding: '12px 30px', fontSize: 16 }}
                >
                  Resume Game
                </button>
                <button
                  onClick={toggleMute}
                  className="btn-neon"
                  style={{ padding: '12px 30px', fontSize: 16, borderColor: '#f0ff00', color: '#f0ff00' }}
                >
                  {mute ? '🔇 Unmute' : '🔊 Mute'}
                </button>
                <button
                  onClick={goToSelect}
                  className="btn-neon"
                  style={{ padding: '12px 30px', fontSize: 16, borderColor: '#ff00aa', color: '#ff00aa' }}
                >
                  Exit to Menu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Level select
  return (
    <div className="slide-up" style={{ maxWidth: 700, margin: '0 auto', padding: '30px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{emoji}</div>
        <h1 style={{ fontFamily: 'Orbitron', fontSize: 28, color: '#00f0ff', margin: '0 0 8px' }}>{name}</h1>
        <Link href="/" style={{ color: '#8888aa', fontSize: 13, textDecoration: 'none' }}>← Back to Games</Link>
      </div>

      {/* Difficulty Tabs */}
      {(['easy', 'hard', 'insane'] as Difficulty[]).map(diff => {
        const diffInfo = DIFFICULTY_LABELS[diff];
        const isUnlocked = diff === 'easy' ||
          (diff === 'hard' && (progress.unlockedDifficulty === 'hard' || progress.unlockedDifficulty === 'insane')) ||
          (diff === 'insane' && progress.unlockedDifficulty === 'insane');
        const levels = progress.levels[diff];
        const totalStars = levels.reduce((s, l) => s + l.stars, 0);

        return (
          <div key={diff} style={{
            marginBottom: 20,
            background: '#12121a',
            border: `1px solid ${isUnlocked ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 12,
            padding: 20,
            opacity: isUnlocked ? 1 : 0.4,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontFamily: 'Orbitron', fontSize: 16, margin: 0, color: diffInfo.color }}>
                {diffInfo.icon} {diffInfo.label}
              </h3>
              <span style={{ fontSize: 13, color: '#8888aa' }}>⭐ {totalStars}/{levels.length * 3}</span>
            </div>
            {isUnlocked ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {levels.map((lvl, i) => (
                  <button
                    key={i}
                    onClick={() => lvl.unlocked && startLevel(diff, i)}
                    disabled={!lvl.unlocked}
                    style={{
                      width: 70, height: 70,
                      background: lvl.unlocked ? 'rgba(0,240,255,0.06)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${lvl.completed ? diffInfo.color : lvl.unlocked ? 'rgba(0,240,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: 10,
                      cursor: lvl.unlocked ? 'pointer' : 'default',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      transition: 'all 0.2s',
                      opacity: lvl.unlocked ? 1 : 0.3,
                      color: '#e0e0ff',
                      fontFamily: 'Orbitron',
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                    onMouseEnter={e => { if (lvl.unlocked) { e.currentTarget.style.boxShadow = `0 0 15px ${diffInfo.color}44`; e.currentTarget.style.transform = 'scale(1.05)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {lvl.unlocked ? (
                      <>
                        <span>{i + 1}</span>
                        <div style={{ display: 'flex', gap: 1 }}>
                          {[1, 2, 3].map(s => (
                            <span key={s} style={{ fontSize: 10, opacity: s <= lvl.stars ? 1 : 0.2 }}>⭐</span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: 20 }}>🔒</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ color: '#555', fontSize: 13, margin: 0 }}>
                Complete all {diff === 'hard' ? 'Easy' : 'Hard'} levels to unlock
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
