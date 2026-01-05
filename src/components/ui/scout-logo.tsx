// Scout Logo Components
'use client'

import React from 'react';

interface LogoProps {
  className?: string;
  color?: 'light' | 'dark' | 'brown' | 'blue';
}

// Terrain Line Mark (standalone)
export function ScoutTerrainMark({ className = '', color = 'dark' }: LogoProps) {
  const strokeColor = {
    light: '#ffffff',
    dark: '#8b4513',
    brown: '#8b4513',
    blue: '#4a90a4',
  }[color];

  return (
    <svg
      viewBox="0 0 200 30"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M0 25 L20 15 L35 20 L50 8 L70 18 L90 5 L110 15 L130 10 L150 18 L170 12 L200 20"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Full Logo (Terrain + Wordmark)
export function ScoutLogo({ className = '', color = 'dark' }: LogoProps) {
  const textColor = color === 'light' ? '#ffffff' : '#8b4513';
  const strokeColor = color === 'light' ? '#ffffff' : '#8b4513';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 200 30"
        className="w-9 h-[18px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 25 L20 15 L35 20 L50 8 L70 18 L90 5 L110 15 L130 10 L150 18 L170 12 L200 20"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="font-bold text-xl tracking-[0.15em]"
        style={{
          fontFamily: "'Bitter', Georgia, serif",
          color: textColor
        }}
      >
        SCOUT
      </span>
    </div>
  );
}

// Favicon/Icon Mark
export function ScoutIcon({ className = '', size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="64" height="64" rx="12" fill="#8b4513"/>
      <path
        d="M8 42 L16 30 L24 36 L32 20 L42 32 L56 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// App Header Logo (for the header bar)
export function ScoutAppLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 200 30"
        className="w-9 h-[18px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 25 L20 15 L35 20 L50 8 L70 18 L90 5 L110 15 L130 10 L150 18 L170 12 L200 20"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="font-bold text-xl tracking-[0.15em] text-white"
        style={{ fontFamily: "'Bitter', Georgia, serif" }}
      >
        SCOUT
      </span>
    </div>
  );
}

// Scout AI Icon - terrain line with sparkle
export function ScoutAIIcon({ className = '', size = 24, style }: { className?: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Terrain line */}
      <path
        d="M2 16 L6 12 L9 14 L12 8 L16 13 L22 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sparkle top */}
      <path
        d="M17 3 L17.5 5 L19.5 5.5 L17.5 6 L17 8 L16.5 6 L14.5 5.5 L16.5 5 Z"
        fill="currentColor"
      />
      {/* Small sparkle */}
      <circle cx="21" cy="3" r="1" fill="currentColor" />
    </svg>
  );
}

// Scout AI Badge - for floating button
export function ScoutAIBadge({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <ScoutAIIcon size={18} />
      <span
        className="text-xs font-semibold tracking-wide"
        style={{ fontFamily: "'Bitter', Georgia, serif" }}
      >
        AI
      </span>
    </div>
  );
}

export default ScoutLogo;
