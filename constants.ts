
import { BubbleColor } from './types';

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;

export const BUBBLE_RADIUS = 20;
export const GRID_ROWS = 14; 
export const GRID_COLS = 8;

export const BUBBLE_COLORS: BubbleColor[] = ['rose', 'amber', 'lime', 'sky', 'violet', 'fuchsia'];

export const COLOR_PALETTES: Record<BubbleColor, string>[] = [
  { // Standard Neon
    rose: '#f43f5e',
    amber: '#f59e0b',
    lime: '#84cc16',
    sky: '#0ea5e9',
    violet: '#8b5cf6',
    fuchsia: '#d946ef'
  },
  { // Cyberpunk Night
    rose: '#ff0055',
    amber: '#ffcc00',
    lime: '#00ff66',
    sky: '#00ffff',
    violet: '#9900ff',
    fuchsia: '#ff00ff'
  },
  { // Retro Sunset
    rose: '#ef4444',
    amber: '#f97316',
    lime: '#fbbf24',
    sky: '#38bdf8',
    violet: '#818cf8',
    fuchsia: '#c084fc'
  },
  { // Arctic Pulse
    rose: '#fb7185',
    amber: '#fbbf24',
    lime: '#4ade80',
    sky: '#22d3ee',
    violet: '#a78bfa',
    fuchsia: '#f472b6'
  },
  { // Midnight Electric
    rose: '#4f46e5',
    amber: '#3b82f6',
    lime: '#06b6d4',
    sky: '#2dd4bf',
    violet: '#6366f1',
    fuchsia: '#8b5cf6'
  },
  { // Solar Flare
    rose: '#f43f5e',
    amber: '#fb923c',
    lime: '#facc15',
    sky: '#f87171',
    violet: '#fb7185',
    fuchsia: '#e11d48'
  },
  { // Jungle Pulse
    rose: '#10b981',
    amber: '#84cc16',
    lime: '#22c55e',
    sky: '#06b6d4',
    violet: '#14b8a6',
    fuchsia: '#2dd4bf'
  },
  { // Deep Sea
    rose: '#3b82f6',
    amber: '#60a5fa',
    lime: '#93c5fd',
    sky: '#bfdbfe',
    violet: '#1d4ed8',
    fuchsia: '#1e40af'
  },
  { // Candy Pop
    rose: '#ff7eb9',
    amber: '#ffb1de',
    lime: '#7afcff',
    sky: '#feff9c',
    violet: '#ff9cee',
    fuchsia: '#ff7eb9'
  },
  { // Neon Desert
    rose: '#f97316',
    amber: '#fbbf24',
    lime: '#ea580c',
    sky: '#9a3412',
    violet: '#c2410c',
    fuchsia: '#7c2d12'
  },
  { // Glitch City
    rose: '#ff0055',
    amber: '#00ffcc',
    lime: '#99ff00',
    sky: '#00ccff',
    violet: '#ff00ff',
    fuchsia: '#ffffff'
  },
  { // Lava Lamp
    rose: '#ff4d00',
    amber: '#ff9900',
    lime: '#ffcc00',
    sky: '#ff0000',
    violet: '#660000',
    fuchsia: '#ff0066'
  }
];

export const WALLPAPERS = [
  'grid',
  'dots',
  'waves',
  'hexagons',
  'diagonal-lines',
  'crosshatch',
  'circles',
  'triangles'
];

export const POWER_UP_CHANCE_BASE = 0.08;
export const SHOOTER_Y = CANVAS_HEIGHT - 60;
export const SHOOTER_X = CANVAS_WIDTH / 2;

// Difficulty Scaling Settings
export const MIN_SHOTS_TO_DROP = 3;
export const MAX_SHOTS_TO_DROP = 7;
export const PROJECTILE_BASE_SPEED = 6; 
export const COLLISION_THRESHOLD = 1.95; // Tighter contact
