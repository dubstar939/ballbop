
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import GameBoard from './components/GameBoard';
import { getAITip } from './services/geminiService';
import { audio } from './services/audioService';

const HIGH_SCORE_KEY = 'ballbop_high_score_939pro';

const App: React.FC = () => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [aiTip, setAiTip] = useState("Welcome to BallBop!");
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover' | 'next_level'>('start');
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  
  const countdownInterval = useRef<number | null>(null);

  // PWA Install logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // Optionally, send analytics event with outcome of user choice
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  // Load high score on mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem(HIGH_SCORE_KEY);
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audio.setMuted(nextMuted);
  };

  const togglePause = () => {
    if (gameState === 'playing') {
      if (isPaused) {
        // Start Resume Countdown
        setIsCountingDown(true);
        setCountdown(3);
        audio.playPop(400);
        
        countdownInterval.current = window.setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              if (countdownInterval.current) clearInterval(countdownInterval.current);
              setIsPaused(false);
              setIsCountingDown(false);
              return 0;
            }
            audio.playPop(400 + (4 - prev) * 100);
            return prev - 1;
          });
        }, 800);
      } else {
        setIsPaused(true);
        if (countdownInterval.current) clearInterval(countdownInterval.current);
        setIsCountingDown(false);
      }
    }
  };

  const updateTip = useCallback(async (s: number, l: number) => {
    const tip = await getAITip(s, l);
    setAiTip(tip);
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && score > 0 && score % 1000 === 0) {
      updateTip(score, level);
    }
  }, [score, level, gameState, updateTip]);

  const handleStart = () => {
    setScore(0);
    setLevel(1);
    setGameState('playing');
    setIsPaused(false);
    setIsCountingDown(false);
    setIsNewHighScore(false);
    audio.playWin();
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setGameState('gameover');
    setIsPaused(false);
    setIsCountingDown(false);
    
    // Check and update high score
    const currentHighScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10);
    if (finalScore > currentHighScore) {
      localStorage.setItem(HIGH_SCORE_KEY, finalScore.toString());
      setHighScore(finalScore);
      setIsNewHighScore(true);
    } else {
      setIsNewHighScore(false);
    }
    
    audio.playGameOver();
  };

  const handleLevelClear = () => {
    setGameState('next_level');
    setIsPaused(false);
    setIsCountingDown(false);
    audio.playWin();
  };

  const startNextLevel = () => {
    setLevel(prev => prev + 1);
    setGameState('playing');
    setIsPaused(false);
    setIsCountingDown(false);
    audio.playPop(800);
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center p-4">
      {/* Header Branding */}
      <div className="w-full max-w-[400px] flex justify-between items-center mb-4 px-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-game text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 tracking-normal">
              BallBop
            </h1>
            <div className="flex gap-2">
              <button 
                onClick={togglePause}
                disabled={gameState !== 'playing' || isCountingDown}
                className={`p-2 rounded-full transition-all duration-300 ${isPaused ? 'bg-cyan-500 scale-110' : 'bg-slate-800 hover:bg-slate-700'} ${gameState !== 'playing' || isCountingDown ? 'opacity-30 pointer-events-none' : ''}`}
                aria-label={isPaused ? "Resume" : "Pause"}
              >
                {isPaused ? (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                ) : (
                  <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                )}
              </button>
              <button 
                onClick={toggleMute}
                className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                ) : (
                  <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77z"/></svg>
                )}
              </button>
            </div>
          </div>
          <span className="text-[10px] text-cyan-500/80 font-bold tracking-[0.2em] uppercase">by 939PRO GAMES</span>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-white font-bold text-lg">Score: <span className="text-cyan-400 font-game">{score}</span></div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Best: <span className="text-fuchsia-400 font-game">{highScore}</span></div>
        </div>
      </div>

      {/* Main Game Container */}
      <div className="relative w-full max-w-[400px] aspect-[2/3] bg-slate-800 rounded-3xl overflow-hidden border-4 border-slate-700 shadow-2xl shadow-cyan-500/20">
        {gameState === 'playing' ? (
          <>
            <GameBoard 
              level={level}
              isPaused={isPaused}
              onScoreChange={setScore} 
              onGameOver={handleGameOver} 
              onWin={handleLevelClear}
            />
            
            {/* Countdown Overlay */}
            {isCountingDown && (
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center z-[150] animate-in fade-in duration-200">
                <div className="relative flex items-center justify-center">
                   <div className="absolute w-40 h-40 border-4 border-cyan-500/20 rounded-full animate-ping"></div>
                   <div className="text-9xl font-game text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-bounce">
                     {countdown}
                   </div>
                </div>
              </div>
            )}

            {/* Enhanced Pause UI */}
            <AnimatePresence>
              {isPaused && !isCountingDown && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl flex flex-col items-center justify-center z-[100] p-6"
                >
                  <div className="absolute top-8 left-8 right-8 flex justify-between items-center opacity-30">
                    <div className="text-[10px] text-cyan-400 font-bold tracking-widest uppercase">939PRO Diagnostic Mode</div>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-75"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse delay-150"></div>
                    </div>
                  </div>
                  
                  <motion.div 
                    initial={{ scale: 0.8, rotate: 0 }}
                    animate={{ scale: 1, rotate: 45 }}
                    className="w-20 h-20 mb-6 border-2 border-cyan-500/50 rounded-2xl flex items-center justify-center"
                  >
                    <div className="-rotate-45 flex gap-1">
                      <div className="w-3 h-8 bg-cyan-500 rounded-full animate-pulse"></div>
                      <div className="w-3 h-8 bg-cyan-500 rounded-full animate-pulse delay-100"></div>
                    </div>
                  </motion.div>

                  <motion.h2 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl font-game text-white mb-2 tracking-widest"
                  >
                    SYSTEM
                  </motion.h2>
                  <motion.h3 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-game text-cyan-500 mb-10 animate-pulse"
                  >
                    SUSPENDED
                  </motion.h3>
                  
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="w-full flex flex-col gap-3"
                  >
                    <button 
                      onClick={togglePause}
                      className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-2xl text-white font-game text-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      RESUME SESSION
                    </button>
                    <button 
                      onClick={() => setGameState('start')}
                      className="w-full py-3 bg-slate-800 text-slate-400 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-700 transition-colors"
                    >
                      EXIT TO HUB
                    </button>
                  </motion.div>

                  <div className="absolute bottom-8 left-0 right-0 text-center opacity-20 pointer-events-none">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.5em]">Auth: 939PRO_SECURE_PROTO_V4</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm z-50 p-8 text-center">
            {gameState === 'start' && (
              <>
                <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex items-center justify-center animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center">
                    <span className="text-3xl font-game text-white">BOP</span>
                  </div>
                </div>
                <h2 className="text-3xl font-game text-white mb-2">Ready to Pop?</h2>
                <div className="mb-6 px-4 py-2 bg-slate-800 rounded-xl border border-slate-700">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Personal Best</p>
                  <p className="text-2xl font-game text-fuchsia-400">{highScore}</p>
                </div>
                <p className="text-slate-400 mb-8 font-medium">Master the physics of BallBop and clear the board.</p>
                <button 
                  onClick={handleStart}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-fuchsia-500 rounded-2xl text-white font-game text-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/40"
                >
                  START GAME
                </button>

                {showInstallButton && (
                  <button 
                    onClick={handleInstallClick}
                    className="mt-4 w-full py-3 bg-slate-800 border border-cyan-500/30 rounded-2xl text-cyan-400 font-bold text-sm uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Install BallBop
                  </button>
                )}
              </>
            )}

            {gameState === 'next_level' && (
              <>
                <h2 className="text-4xl font-game mb-2 text-cyan-400">
                  LEVEL {level} CLEAR!
                </h2>
                <div className="text-slate-300 mb-8">
                  <p className="text-lg font-bold">Bonus points awarded!</p>
                  <p className="text-sm text-slate-500 mt-2 font-medium">Level {level + 1} will be harder.</p>
                </div>
                <button 
                  onClick={startNextLevel}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl text-white font-game text-2xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  NEXT LEVEL
                </button>
              </>
            )}

            {gameState === 'gameover' && (
              <>
                {isNewHighScore ? (
                  <div className="mb-2 animate-bounce">
                    <span className="bg-fuchsia-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-fuchsia-500/50">NEW HIGH SCORE!</span>
                  </div>
                ) : null}
                <h2 className="text-4xl font-game mb-2 text-rose-500">
                  GAME OVER
                </h2>
                <div className="text-slate-300 mb-8 font-medium">
                  <p className="text-xl">Final Score: <span className="font-game text-white">{score}</span></p>
                  <p className="text-sm mt-2 text-slate-400">Current Best: <span className="text-fuchsia-400 font-game">{highScore}</span></p>
                  <p className="text-xs mt-6 text-slate-500 italic">"939PRO: Perfection is just a pop away."</p>
                </div>
                <button 
                  onClick={handleStart}
                  className="w-full py-4 bg-slate-100 rounded-2xl text-slate-900 font-game text-2xl hover:bg-white active:scale-95 transition-all"
                >
                  RETRY
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* AI Tip / Footer */}
      <div className="w-full max-w-[400px] mt-4 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
        <p className="text-sm text-slate-400 text-center leading-relaxed font-medium">
          <span className="text-fuchsia-500 font-bold mr-2 uppercase tracking-wide">AI Insight:</span>
          {aiTip}
        </p>
      </div>

      {/* Navigation Simulation for iOS look */}
      <div className="mt-auto pb-4">
        <div className="w-32 h-1.5 bg-slate-700 rounded-full"></div>
      </div>
    </div>
  );
};

export default App;
