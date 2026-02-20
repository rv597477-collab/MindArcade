'use client';

import "./globals.css";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isMuted, setMuted, playClick } from '@/lib/sound';
import { getProfile } from '@/lib/storage';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [mute, setMute] = useState(true);
  const [profileName, setProfileName] = useState('Player');
  const pathname = usePathname();

  useEffect(() => {
    setMute(isMuted());
    const p = getProfile();
    setProfileName(p.name);
  }, []);

  const toggleMute = () => {
    const newMuted = !mute;
    setMute(newMuted);
    setMuted(newMuted);
    if (!newMuted) playClick();
  };

  return (
    <html lang="en">
      <head>
        <title>GameVault - Level Up Your Brain</title>
        <meta name="description" content="A stunning JavaScript games portal with 18+ playable games" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="scanlines grid-bg" style={{ minHeight: '100vh' }}>
        {/* Header */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(10, 10, 15, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0, 240, 255, 0.1)',
          padding: '0 20px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => playClick()}>
            {/* Neon GV Logo */}
            <svg width="40" height="40" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 0 10px rgba(0,240,255,0.8))' }}>
              <defs>
                <linearGradient id="neon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#00f0ff', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#ff00aa', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <text x="50" y="70" fontSize="60" fontWeight="900" fontFamily="Orbitron, sans-serif" fill="url(#neon-grad)" textAnchor="middle" stroke="#00f0ff" strokeWidth="2">
                GV
              </text>
            </svg>
            <span style={{
              fontFamily: 'Orbitron, sans-serif',
              fontSize: 20,
              fontWeight: 800,
              color: '#00f0ff',
              textShadow: '0 0 10px rgba(0,240,255,0.5)',
              letterSpacing: 2,
            }}>
              GAMEVAULT
            </span>
          </Link>

          {/* Breadcrumb */}
          {pathname !== '/' && (
            <nav style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#8888aa',
              fontFamily: 'Space Mono, monospace',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
            }}>
              <Link href="/" style={{ color: '#00f0ff', textDecoration: 'none' }}>Home</Link>
              <span>›</span>
              <span style={{ color: '#e0e0ff' }}>
                {pathname.includes('/game/') ? decodeURIComponent(pathname.split('/game/')[1] || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Profile'}
              </span>
            </nav>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
                transition: 'all 0.2s',
              }}
              title={mute ? 'Unmute' : 'Mute'}
            >
              {mute ? '🔇' : '🔊'}
            </button>
            <Link href="/leaderboard" onClick={() => playClick()} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              background: 'rgba(240, 255, 0, 0.08)',
              border: '1px solid rgba(240, 255, 0, 0.2)',
              borderRadius: 8,
              padding: '6px 14px',
              color: '#f0ff00',
              fontSize: 13,
              fontFamily: 'Orbitron, sans-serif',
              transition: 'all 0.2s',
            }}>
              <span>🏆</span>
              <span>Leaderboard</span>
            </Link>
            <Link href="/profile" onClick={() => playClick()} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              background: 'rgba(0, 240, 255, 0.08)',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: 8,
              padding: '6px 14px',
              color: '#00f0ff',
              fontSize: 13,
              fontFamily: 'Orbitron, sans-serif',
              transition: 'all 0.2s',
            }}>
              <span>👤</span>
              <span>{profileName}</span>
            </Link>
          </div>
        </header>

        <main style={{ minHeight: 'calc(100vh - 60px)' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
