
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Bubble, BubbleColor, Projectile, Particle, BubbleType } from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, BUBBLE_RADIUS, GRID_ROWS, GRID_COLS, 
  COLOR_PALETTES, BUBBLE_COLORS, SHOOTER_X, SHOOTER_Y, 
  POWER_UP_CHANCE_BASE, PROJECTILE_BASE_SPEED, COLLISION_THRESHOLD,
  MIN_SHOTS_TO_DROP, MAX_SHOTS_TO_DROP
} from '../constants';
import { audio } from '../services/audioService';

interface GameBoardProps {
  level: number;
  isPaused: boolean;
  onScoreChange: (score: number) => void;
  onGameOver: (score: number) => void;
  onWin: () => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ level, isPaused, onScoreChange, onGameOver, onWin }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [grid, setGrid] = useState<(Bubble | null)[][]>([]);
  const [projectile, setProjectile] = useState<Projectile | null>(null);
  const [nextColor, setNextColor] = useState<BubbleColor>(BUBBLE_COLORS[0]);
  const [activeColor, setActiveColor] = useState<BubbleColor>(BUBBLE_COLORS[1]);
  const [storedPowerUp, setStoredPowerUp] = useState<BubbleType>('normal');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shotsTaken, setShotsTaken] = useState(0);
  const [shake, setShake] = useState(0);
  const [showGoal, setShowGoal] = useState(false);
  
  const mousePos = useRef({ x: SHOOTER_X, y: 0 });
  const pulseRef = useRef(0);
  const palette = COLOR_PALETTES[(level - 1) % COLOR_PALETTES.length];

  const currentLevelShotsToDrop = useMemo(() => 
    Math.max(MIN_SHOTS_TO_DROP, MAX_SHOTS_TO_DROP - Math.floor((level - 1) / 3)), 
  [level]);

  const activeColorCount = useMemo(() => 
    Math.min(6, 4 + Math.floor((level - 1) / 2)), 
  [level]);

  const availableColors = useMemo(() => 
    BUBBLE_COLORS.slice(0, activeColorCount), 
  [activeColorCount]);

  const getBubbleCoords = (r: number, c: number) => {
    const x = (r % 2 === 0 ? c * BUBBLE_RADIUS * 2 : c * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS) + BUBBLE_RADIUS;
    const y = r * BUBBLE_RADIUS * 1.732 + BUBBLE_RADIUS;
    return { x, y };
  };

  const generateBubble = useCallback((r: number, c: number): Bubble => {
    const { x, y } = getBubbleCoords(r, c);
    const powerUpChance = POWER_UP_CHANCE_BASE + (level * 0.005);
    const isPowerUp = Math.random() < powerUpChance;
    const type: BubbleType = isPowerUp ? (Math.random() > 0.5 ? 'bomb' : 'laser') : 'normal';
    
    return { 
      x, y, 
      color: availableColors[Math.floor(Math.random() * availableColors.length)],
      row: r,
      col: c,
      type
    };
  }, [availableColors, level]);

  useEffect(() => {
    const startRows = Math.min(GRID_ROWS - 4, 5 + Math.floor(level / 2));
    const newGrid: (Bubble | null)[][] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      newGrid[r] = [];
      const colsInRow = r % 2 === 0 ? GRID_COLS : GRID_COLS - 1;
      for (let c = 0; c < colsInRow; c++) {
        if (r < startRows) {
          newGrid[r][c] = generateBubble(r, c);
        } else {
          newGrid[r][c] = null;
        }
      }
    }
    setGrid(newGrid);
    setShotsTaken(0);
    setStoredPowerUp('normal');
    setNextColor(availableColors[Math.floor(Math.random() * availableColors.length)]);
    setActiveColor(availableColors[Math.floor(Math.random() * availableColors.length)]);
    
    // Show level goal overlay
    setShowGoal(true);
    const timer = setTimeout(() => setShowGoal(false), 2500);
    return () => clearTimeout(timer);
  }, [level, generateBubble, availableColors]);

  const getDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  };

  const getNeighbors = (r: number, c: number) => {
    const neighbors: { r: number, c: number }[] = [];
    const offsets = r % 2 === 0 
      ? [{ dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 0 }]
      : [{ dr: -1, dc: 0 }, { dr: -1, dc: 1 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }];

    for (const off of offsets) {
      const nr = r + off.dr;
      const nc = c + off.dc;
      if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < (nr % 2 === 0 ? GRID_COLS : GRID_COLS - 1)) {
        neighbors.push({ r: nr, c: nc });
      }
    }
    return neighbors;
  };

  const findClosestEmptySlot = (targetX: number, targetY: number, currentGrid: (Bubble | null)[][]) => {
    let bestR = -1;
    let bestC = -1;
    let minD = Infinity;

    const approxR = Math.round((targetY - BUBBLE_RADIUS) / (BUBBLE_RADIUS * 1.732));
    const startR = Math.max(0, approxR - 1);
    const endR = Math.min(GRID_ROWS - 1, approxR + 2);

    for (let r = startR; r <= endR; r++) {
      const cols = r % 2 === 0 ? GRID_COLS : GRID_COLS - 1;
      const offsetX = r % 2 === 0 ? BUBBLE_RADIUS : BUBBLE_RADIUS * 2;
      const approxC = Math.round((targetX - offsetX) / (BUBBLE_RADIUS * 2));
      const startC = Math.max(0, approxC - 1);
      const endC = Math.min(cols - 1, approxC + 1);

      for (let c = startC; c <= endC; c++) {
        if (!currentGrid[r][c]) {
          const { x, y } = getBubbleCoords(r, c);
          const d = getDistance(targetX, targetY, x, y);
          if (d < minD) {
            minD = d;
            bestR = r;
            bestC = c;
          }
        }
      }
    }
    
    if (bestR === -1) {
       for (let r = 0; r < GRID_ROWS; r++) {
          const cols = r % 2 === 0 ? GRID_COLS : GRID_COLS - 1;
          for (let c = 0; c < cols; c++) {
            if (!currentGrid[r][c]) return { bestR: r, bestC: c };
          }
       }
    }

    return { bestR, bestC };
  };

  const explode = (x: number, y: number, color: string, count: number = 12, velocityMult: number = 1.0) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        x, y,
        vx: (Math.random() - 0.5) * 12 * velocityMult,
        vy: (Math.random() - 0.5) * 12 * velocityMult,
        radius: Math.random() * 5 + 1.5,
        color,
        life: 1.0
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  const triggerLaser = useCallback((r: number, currentGrid: (Bubble | null)[][]) => {
    const newGrid = [...currentGrid.map(row => [...row])];
    const colsInRow = r % 2 === 0 ? GRID_COLS : GRID_COLS - 1;
    let clearedCount = 0;
    audio.playLaser();
    setShake(10);
    setParticles(prev => [...prev, {
      x: CANVAS_WIDTH / 2, y: r * BUBBLE_RADIUS * 1.732 + BUBBLE_RADIUS,
      vx: 0, vy: 0, radius: 28, color: '#00ffff', life: 1.0, type: 'beam'
    }]);
    for (let c = 0; c < colsInRow; c++) {
      if (newGrid[r][c]) {
        const b = newGrid[r][c]!;
        explode(b.x, b.y, '#ffffff', 16, 1.4);
        newGrid[r][c] = null;
        clearedCount++;
      }
    }
    const bonus = clearedCount * 25;
    setScore(s => { onScoreChange(s + bonus); return s + bonus; });
    return newGrid;
  }, [onScoreChange]);

  const triggerBomb = useCallback((r: number, c: number, currentGrid: (Bubble | null)[][], centerX?: number, centerY?: number) => {
    const newGrid = [...currentGrid.map(row => [...row])];
    
    let cx = centerX;
    let cy = centerY;
    if (cx === undefined || cy === undefined) {
      const b = newGrid[r]?.[c];
      if (b) { cx = b.x; cy = b.y; }
      else { const coords = getBubbleCoords(r, c); cx = coords.x; cy = coords.y; }
    }

    audio.playBomb();
    setShake(30);
    explode(cx, cy, '#ff5500', 60, 1.8);
    let clearedCount = 0;
    const explosionRadius = BUBBLE_RADIUS * 6.5;
    for (let row = 0; row < GRID_ROWS; row++) {
      const cols = row % 2 === 0 ? GRID_COLS : GRID_COLS - 1;
      for (let col = 0; col < cols; col++) {
        const b = newGrid[row][col];
        if (b) {
          const dist = getDistance(cx, cy, b.x, b.y);
          if (dist <= explosionRadius) {
            explode(b.x, b.y, palette[b.color] || '#ffffff', 12, 1.2);
            newGrid[row][col] = null;
            clearedCount++;
          }
        }
      }
    }
    if (newGrid[r] && newGrid[r][c] !== undefined) newGrid[r][c] = null;
    const bonus = clearedCount * 20;
    setScore(s => { onScoreChange(s + bonus); return s + bonus; });
    return newGrid;
  }, [palette, onScoreChange]);

  const collectPowerUp = useCallback((type: BubbleType, startX: number, startY: number) => {
    if (type === 'normal') return;
    setStoredPowerUp(type);
    audio.playWin(); 
    setParticles(prev => [...prev, {
      x: startX, y: startY,
      vx: 0, vy: 0, radius: 10,
      color: type === 'bomb' ? '#f97316' : '#38bdf8',
      life: 1.0, type: 'collection',
      targetX: SHOOTER_X, targetY: SHOOTER_Y
    }]);
  }, []);

  const dropGrid = useCallback(() => {
    setGrid(oldGrid => {
      const newGrid: (Bubble | null)[][] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        newGrid[r] = [];
        const colsInRow = r % 2 === 0 ? GRID_COLS : GRID_COLS - 1;
        if (r === 0) {
          for (let c = 0; c < colsInRow; c++) {
            newGrid[r][c] = generateBubble(r, c);
          }
        } else {
          const prevRow = oldGrid[r - 1];
          const prevCols = (r - 1) % 2 === 0 ? GRID_COLS : GRID_COLS - 1;
          for (let c = 0; c < colsInRow; c++) {
            const source = c < prevCols ? prevRow[c] : null;
            const { x, y } = getBubbleCoords(r, c);
            if (source) {
              newGrid[r][c] = { ...source, x, y, row: r, col: c };
            } else {
              newGrid[r][c] = null;
            }
          }
        }
      }
      if (newGrid[GRID_ROWS - 3].some(b => b !== null)) onGameOver(score);
      return newGrid;
    });
  }, [score, onGameOver, generateBubble]);

  const handleShoot = useCallback(() => {
    if (projectile || isPaused) return;
    const dx = mousePos.current.x - SHOOTER_X;
    const dy = mousePos.current.y - SHOOTER_Y;
    const angle = Math.atan2(dy, dx);
    const speed = PROJECTILE_BASE_SPEED + (level * 0.15);
    explode(SHOOTER_X, SHOOTER_Y, palette[activeColor] || '#ffffff', 18, 0.9);
    setShake(5);
    
    setProjectile({
      x: SHOOTER_X, y: SHOOTER_Y, 
      vx: Math.cos(angle) * speed, 
      vy: Math.sin(angle) * speed, 
      color: activeColor,
      type: storedPowerUp
    });

    audio.playShoot();
    setStoredPowerUp('normal'); 
    setShotsTaken(prev => prev + 1);
    setActiveColor(nextColor);
    setNextColor(availableColors[Math.floor(Math.random() * availableColors.length)]);
  }, [projectile, activeColor, nextColor, level, palette, availableColors, isPaused, storedPowerUp]);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const update = () => {
      pulseRef.current += 0.05;
      if (!isPaused) {
        setParticles(prev => prev.map(p => {
          if (p.type === 'collection' && p.targetX !== undefined && p.targetY !== undefined) {
             const dx = p.targetX - p.x;
             const dy = p.targetY - p.y;
             return { ...p, x: p.x + dx * 0.1, y: p.y + dy * 0.1, life: p.life - 0.01 };
          }
          return {
            ...p, x: p.x + p.vx, y: p.y + p.vy, vx: p.vx * 0.97, vy: p.vy * 0.97, life: p.life - (p.type === 'beam' ? 0.02 : 0.015)
          };
        }).filter(p => p.life > 0));

        if (shake > 0) setShake(s => Math.max(0, s - 0.4));

        if (projectile) {
          const SUB_STEPS = 10;
          let collided = false;
          let hitBubble: Bubble | null = null;
          let bestR = -1, bestC = -1;

          for (let i = 0; i < SUB_STEPS && !collided; i++) {
            projectile.x += projectile.vx / SUB_STEPS;
            projectile.y += projectile.vy / SUB_STEPS;

            if (projectile.x - BUBBLE_RADIUS < 0) {
              projectile.x = BUBBLE_RADIUS;
              projectile.vx *= -1;
            } else if (projectile.x + BUBBLE_RADIUS > CANVAS_WIDTH) {
              projectile.x = CANVAS_WIDTH - BUBBLE_RADIUS;
              projectile.vx *= -1;
            }

            if (projectile.y - BUBBLE_RADIUS < 0) {
              collided = true;
              const slot = findClosestEmptySlot(projectile.x, projectile.y + 1, grid);
              bestR = slot.bestR;
              bestC = slot.bestC;
            } else {
              for (let r = 0; r < GRID_ROWS; r++) {
                const cols = r % 2 === 0 ? GRID_COLS : GRID_COLS - 1;
                for (let c = 0; c < cols; c++) {
                  const b = grid[r][c];
                  if (b && getDistance(projectile.x, projectile.y, b.x, b.y) < BUBBLE_RADIUS * COLLISION_THRESHOLD) {
                    collided = true;
                    hitBubble = b;
                    const backX = projectile.x - (projectile.vx / SUB_STEPS) * 1.5;
                    const backY = projectile.y - (projectile.vy / SUB_STEPS) * 1.5;
                    const slot = findClosestEmptySlot(backX, backY, grid);
                    bestR = slot.bestR;
                    bestC = slot.bestC;
                  }
                }
              }
            }
          }

          if (collided) {
            let updatedGrid = [...grid.map(row => [...row])];
            
            if (projectile.type === 'bomb') {
              updatedGrid = triggerBomb(bestR, bestC, updatedGrid, projectile.x, projectile.y);
            } else if (projectile.type === 'laser') {
              updatedGrid = triggerLaser(bestR === -1 ? 0 : bestR, updatedGrid);
            } else {
              if (hitBubble?.type === 'bomb') {
                collectPowerUp('bomb', hitBubble.x, hitBubble.y);
                updatedGrid[hitBubble.row][hitBubble.col] = null;
              } else if (hitBubble?.type === 'laser') {
                collectPowerUp('laser', hitBubble.x, hitBubble.y);
                updatedGrid[hitBubble.row][hitBubble.col] = null;
              } else if (bestR !== -1) {
                const { x: px, y: py } = getBubbleCoords(bestR, bestC);
                updatedGrid[bestR][bestC] = { x: px, y: py, color: projectile.color, row: bestR, col: bestC, type: 'normal' };
                const matches: {r: number, c: number}[] = [{ r: bestR, c: bestC }];
                const visited = new Set<string>(); visited.add(`${bestR},${bestC}`);
                let mi = 0;
                while (mi < matches.length) {
                  const curr = matches[mi++];
                  for (const n of getNeighbors(curr.r, curr.c)) {
                    const b = updatedGrid[n.r][n.c];
                    if (b && b.color === projectile.color && b.type === 'normal' && !visited.has(`${n.r},${n.c}`)) {
                      visited.add(`${n.r},${n.c}`); matches.push(n);
                    }
                  }
                }
                if (matches.length >= 3) {
                  audio.playPop(450 + matches.length * 30);
                  setShake(4 + matches.length * 0.7);
                  matches.forEach(m => {
                    const b = updatedGrid[m.r][m.c];
                    if (b) {
                      explode(b.x, b.y, palette[b.color], 16, 1.1);
                      if (b.type && b.type !== 'normal') collectPowerUp(b.type, b.x, b.y);
                    }
                    updatedGrid[m.r][m.c] = null;
                  });
                  setScore(s => { onScoreChange(s + matches.length * 20); return s + matches.length * 20; });
                } else {
                  audio.playShoot();
                }
              }
            }

            const anchored = new Set<string>();
            const q: {r: number, c: number}[] = [];
            for (let c = 0; c < GRID_COLS; c++) { if (updatedGrid[0][c]) { anchored.add(`0,${c}`); q.push({ r: 0, c }); } }
            let qi = 0;
            while (qi < q.length) {
              const curr = q[qi++];
              for (const n of getNeighbors(curr.r, curr.c)) {
                if (updatedGrid[n.r][n.c] && !anchored.has(`${n.r},${n.c}`)) {
                  anchored.add(`${n.r},${n.c}`); q.push(n);
                }
              }
            }
            let fallingCount = 0;
            for (let r = 0; r < GRID_ROWS; r++) {
              const cols = r % 2 === 0 ? GRID_COLS : GRID_COLS - 1;
              for (let c = 0; c < cols; c++) {
                if (updatedGrid[r][c] && !anchored.has(`${r},${c}`)) {
                  const b = updatedGrid[r][c]!;
                  explode(b.x, b.y, palette[b.color], 10, 0.9);
                  if (b.type && b.type !== 'normal') collectPowerUp(b.type, b.x, b.y);
                  updatedGrid[r][c] = null;
                  fallingCount++;
                  setScore(s => { onScoreChange(s + 30); return s + 30; });
                }
              }
            }
            if (fallingCount > 0) audio.playPop(380);
            setGrid(updatedGrid);
            setProjectile(null);
            if (shotsTaken > 0 && shotsTaken % currentLevelShotsToDrop === 0) { dropGrid(); audio.playPop(250); setShake(6); }
            if (!updatedGrid.some(row => row.some(b => b !== null))) onWin();
            if (bestR >= GRID_ROWS - 3) onGameOver(score);
          }
        }
      }
      render();
      animationFrameId = requestAnimationFrame(update);
    };

    const drawBubble = (b: Bubble | Projectile, radius: number = BUBBLE_RADIUS, alpha: number = 1.0) => {
      const { x, y, color, type } = b;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, radius - 1, 0, Math.PI * 2);
      if (type === 'bomb') { ctx.fillStyle = '#1e1e2e'; ctx.shadowBlur = 20; ctx.shadowColor = '#f97316'; } 
      else if (type === 'laser') { ctx.fillStyle = '#0f172a'; ctx.shadowBlur = 20; ctx.shadowColor = '#38bdf8'; } 
      else { ctx.fillStyle = palette[color]; ctx.shadowBlur = 14; ctx.shadowColor = palette[color]; }
      ctx.fill();
      if (type === 'bomb') { ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(x, y, radius / 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 10, 4, 12); } 
      else if (type === 'laser') { ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - radius/2, y); ctx.lineTo(x + radius/2, y); ctx.stroke(); } 
      else { ctx.beginPath(); ctx.arc(x - radius/3, y - radius/3, radius/4, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill(); }
      ctx.restore();
    };

    const render = () => {
      ctx.save();
      if (shake > 0) ctx.translate(Math.random() * shake - shake/2, Math.random() * shake - shake/2);
      ctx.clearRect(-40, -40, CANVAS_WIDTH + 80, CANVAS_HEIGHT + 80);
      
      // Visual indicator for pause: subtle desaturation/darkening
      if (isPaused) {
         ctx.filter = 'grayscale(0.6) brightness(0.4)';
      }

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.3)';
      ctx.setLineDash([5, 5]);
      const dangerY = (GRID_ROWS - 3) * BUBBLE_RADIUS * 1.732 + BUBBLE_RADIUS * 2;
      ctx.moveTo(0, dangerY); ctx.lineTo(CANVAS_WIDTH, dangerY); ctx.stroke(); ctx.setLineDash([]);
      grid.forEach(row => row.forEach(b => b && drawBubble(b)));
      
      const dx = mousePos.current.x - SHOOTER_X, dy = mousePos.current.y - SHOOTER_Y;
      const angle = Math.atan2(dy, dx);
      
      if (!isPaused) {
        ctx.beginPath(); 
        ctx.setLineDash([6, 8]); 
        ctx.lineWidth = 2.5; 
        ctx.moveTo(SHOOTER_X, SHOOTER_Y); 
        ctx.lineTo(SHOOTER_X + Math.cos(angle) * 160, SHOOTER_Y + Math.sin(angle) * 160); 
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; 
        ctx.stroke(); 
        ctx.setLineDash([]);
      }

      if (projectile) drawBubble(projectile);
      
      particles.forEach(p => {
        if (p.type === 'beam') { ctx.save(); ctx.beginPath(); ctx.fillStyle = `rgba(0, 255, 255, ${p.life})`; ctx.fillRect(0, p.y - 15, CANVAS_WIDTH, 30); ctx.fillStyle = `rgba(255, 255, 255, ${p.life * 1.8})`; ctx.fillRect(0, p.y - 5, CANVAS_WIDTH, 10); ctx.restore(); } 
        else { ctx.save(); ctx.globalAlpha = p.life; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill(); ctx.restore(); }
      });
      
      const dropsIn = currentLevelShotsToDrop - (shotsTaken % currentLevelShotsToDrop);
      ctx.fillStyle = dropsIn <= 1 ? 'rgba(244, 63, 94, 1.0)' : 'rgba(255, 255, 255, 0.5)';
      ctx.font = '700 16px Luckiest Guy'; ctx.textAlign = 'left'; ctx.fillText(`THREAT IN: ${dropsIn}`, 20, CANVAS_HEIGHT - 20);
      
      if (storedPowerUp !== 'normal') {
        const glowScale = 1 + Math.sin(pulseRef.current * 4) * 0.1;
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = storedPowerUp === 'bomb' ? '#f97316' : '#38bdf8';
        drawBubble({ x: CANVAS_WIDTH - 40, y: CANVAS_HEIGHT - 30, color: 'sky', row: 0, col: 0, type: storedPowerUp }, BUBBLE_RADIUS * glowScale);
        ctx.fillStyle = 'white';
        ctx.font = '800 10px Fredoka';
        ctx.textAlign = 'center';
        ctx.fillText('READY!', CANVAS_WIDTH - 40, CANVAS_HEIGHT - 5);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(pulseRef.current * 4) * 0.2;
        ctx.beginPath();
        ctx.arc(SHOOTER_X, SHOOTER_Y, BUBBLE_RADIUS + 15, 0, Math.PI * 2);
        ctx.fillStyle = storedPowerUp === 'bomb' ? '#f97316' : '#38bdf8';
        ctx.fill();
        ctx.restore();
      }

      drawBubble({ x: SHOOTER_X, y: SHOOTER_Y, color: activeColor, row: 0, col: 0, type: storedPowerUp }, BUBBLE_RADIUS + 4);
      drawBubble({ x: SHOOTER_X + 80, y: SHOOTER_Y + 15, color: nextColor, row: 0, col: 0, type: 'normal' }, BUBBLE_RADIUS * 0.8);
      
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '600 12px Fredoka'; ctx.textAlign = 'center'; ctx.fillText('NEXT', SHOOTER_X + 80, SHOOTER_Y + 45);
      ctx.restore();
    };
    update();
    return () => cancelAnimationFrame(animationFrameId);
  }, [grid, projectile, activeColor, nextColor, particles, onGameOver, onScoreChange, onWin, score, palette, shotsTaken, dropGrid, triggerBomb, triggerLaser, shake, level, currentLevelShotsToDrop, isPaused, storedPowerUp, collectPowerUp]);

  const handlePointer = (e: React.PointerEvent) => {
    if (isPaused) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mousePos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onPointerMove={handlePointer}
        onPointerDown={(e) => { handlePointer(e); handleShoot(); }}
        className={`w-full h-full cursor-crosshair touch-none select-none transition-opacity ${isPaused ? 'opacity-50' : 'opacity-100'}`}
      />
      
      {/* Level Goal Overlay */}
      {showGoal && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md px-10 py-8 rounded-[40px] border-4 border-cyan-500/50 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <h3 className="text-cyan-400 font-game text-4xl mb-2">LEVEL {level}</h3>
            <p className="text-white font-game text-xl tracking-wider uppercase">GOAL: CLEAR ALL BUBBLES</p>
            <div className="mt-4 w-12 h-1 bg-cyan-500/30 rounded-full overflow-hidden">
               <div className="h-full bg-cyan-400 animate-[progress_2s_ease-in-out_infinite]"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
