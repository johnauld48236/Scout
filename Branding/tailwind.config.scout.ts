// Scout Brand - Tailwind Configuration
// Add these to your tailwind.config.ts or tailwind.config.js

// If creating a new config, use this:
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Scout Brand Colors
        scout: {
          'saddle': '#8b4513',        // Primary brand color
          'sky': '#4a90a4',           // Accent/interactive
          'parchment': '#faf8f0',     // Background
          'earth': '#3d3027',         // Primary text
          'earth-light': '#6b5d52',   // Secondary text
          'sunset': '#d2691e',        // Warning/attention
          'trail': '#5d7a5d',         // Success/positive
          'clay': '#a94442',          // Danger/negative
          'border': '#e5e0d8',        // Borders
          'border-dark': '#d4cdc3',   // Darker borders
        }
      },
      fontFamily: {
        'display': ['Bitter', 'Georgia', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'scout-sm': '0 1px 2px rgba(61, 48, 39, 0.1)',
        'scout-md': '0 4px 12px rgba(61, 48, 39, 0.1)',
        'scout-lg': '0 8px 24px rgba(61, 48, 39, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;


// ============================================
// ALTERNATIVELY: If you already have a config,
// just add these to your theme.extend section:
// ============================================

/*
colors: {
  scout: {
    'saddle': '#8b4513',
    'sky': '#4a90a4',
    'parchment': '#faf8f0',
    'earth': '#3d3027',
    'earth-light': '#6b5d52',
    'sunset': '#d2691e',
    'trail': '#5d7a5d',
    'clay': '#a94442',
    'border': '#e5e0d8',
  }
},
fontFamily: {
  'display': ['Bitter', 'Georgia', 'serif'],
},
*/
