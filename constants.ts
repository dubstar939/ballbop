
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
  }
];

export const POWER_UP_CHANCE_BASE = 0.08;
export const SHOOTER_Y = CANVAS_HEIGHT - 60;
export const SHOOTER_X = CANVAS_WIDTH / 2;

// Difficulty Scaling Settings
export const MIN_SHOTS_TO_DROP = 3;
export const MAX_SHOTS_TO_DROP = 7;
export const PROJECTILE_BASE_SPEED = 8; 
export const COLLISION_THRESHOLD = 1.95; // Tighter contact
