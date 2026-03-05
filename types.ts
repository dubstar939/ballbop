
export type BubbleColor = 'rose' | 'amber' | 'lime' | 'sky' | 'violet' | 'fuchsia';
export type BubbleType = 'normal' | 'bomb' | 'laser';

export interface Bubble {
  x: number;
  y: number;
  color: BubbleColor;
  row: number;
  col: number;
  type?: BubbleType;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: BubbleColor;
  type: BubbleType;
}

export interface GameState {
  score: number;
  level: number;
  grid: (Bubble | null)[][];
  currentBubble: BubbleColor;
  nextBubble: BubbleColor;
  isGameOver: boolean;
  isWon: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  type?: 'sparkle' | 'smoke' | 'beam' | 'collection';
  targetX?: number;
  targetY?: number;
}
