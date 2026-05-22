'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Trophy, Share2, RefreshCw, X, TrendingUp, Coins, Zap, Target, RotateCcw } from 'lucide-react';

interface VictoryScreenProps {
  playerName: string;
  opponentName: string;
  subject: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  coinsWon: number;
  xpGained: number;
  oldRank: number;
  newRank: number;
  currentXP: number;
  xpToNextLevel: number;
  level: number;
  onShare: () => void;
  onRematch: () => void;
  onClose: () => void;
}

const VictoryScreen: React.FC<VictoryScreenProps> = (props) => {
  const [key, setKey] = useState(0);

  const handleReplay = () => {
    setKey(prev => prev + 1);
  };

  return (
    <VictoryScreenContent key={key} {...props} onReplay={handleReplay} />
  );
};

const VictoryScreenContent: React.FC<VictoryScreenProps & { onReplay: () => void }> = ({
  playerName,
  opponentName,
  subject,
  score,
  totalQuestions,
  accuracy,
  coinsWon,
  xpGained,
  oldRank,
  newRank,
  currentXP,
  xpToNextLevel,
  level,
  onShare,
  onRematch,
  onClose,
  onReplay,
}) => {
  const [showContent, setShowContent] = useState(false);
  const [xpFill, setXpFill] = useState(0);
  const [showShimmer, setShowShimmer] = useState(false);

  const launchConfetti = useCallback(() => {
    const duration = 6000;
    const end = Date.now() + duration;
    const colors = ['#F5A623', '#7C3AED', '#06B6D4', '#10B981', '#FFD166', '#A78BFA'];

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.5 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.5 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  useEffect(() => {
    // t=0ms: screen fades in from black (opacity 0 → 1, 200ms)
    const startTimer = setTimeout(() => setShowContent(true), 0);

    // t=800ms: confetti begins
    const confettiTimer = setTimeout(launchConfetti, 800);

    // t=2200ms: XP bar fills
    const xpTimer = setTimeout(() => {
      const percentage = (currentXP / (currentXP + xpToNextLevel)) * 100;
      setXpFill(percentage);
    }, 2200);

    // t=3300ms: XP shimmer sweep
    const shimmerTimer = setTimeout(() => {
      setShowShimmer(true);
    }, 3300);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(confettiTimer);
      clearTimeout(xpTimer);
      clearTimeout(shimmerTimer);
      confetti.reset();
    };
  }, [launchConfetti, currentXP, xpToNextLevel]);

  const rankDiff = oldRank - newRank;

  const springTransition = {
    duration: 0.9,
    ease: [0.22, 1, 0.36, 1]
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-[#080818] flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="w-full max-w-md px-6 flex flex-col items-center relative h-full">
        {/* Close Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-50"
        >
          <X size={24} />
        </motion.button>

        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {/* Trophy Section */}
          <div className="relative mb-8">
            {/* t=200ms: trophy spring entrance begins */}
            <motion.div
              initial={{ scale: 0, y: 80 }}
              animate={{ scale: [0, 1.12, 1], y: 0 }}
              transition={{
                delay: 0.2,
                duration: 0.9,
                times: [0, 0.7, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative z-10"
            >
              {/* Floating Idle Loop at t=950ms */}
              <motion.div
                animate={{ y: [-6, 6, -6] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.95,
                }}
              >
                <div className="w-32 h-32 bg-gradient-to-b from-[#FFD166] via-[#F5A623] to-[#C47A00] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(245,166,35,0.4)]">
                  <Trophy size={64} className="text-[#080818]" />
                </div>
              </motion.div>
            </motion.div>

            {/* t=900ms: Concentric Rings */}
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{
                  delay: 0.9,
                  duration: 1,
                  ease: "easeOut",
                }}
                className="absolute inset-0 border-2 border-[#F5A623] rounded-full"
              />
            ))}

            {/* t=900ms: Gold Beams */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: [0, 6, 0], opacity: [0, 1, 0] }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="absolute top-1/2 left-1/2 w-32 h-[2px] bg-[#F5A623] origin-center -translate-y-1/2 -translate-x-1/2"
            />
          </div>

          {/* t=1000ms: Champion Text */}
          <div className="relative flex flex-col items-center mb-6">
            <motion.h1
              initial={{ scaleX: 0, letterSpacing: "24px", opacity: 0 }}
              animate={{ scaleX: 1, letterSpacing: "2px", opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="text-4xl font-black text-[#F5A623] font-orbitron text-center"
            >
              CHAMPION
            </motion.h1>

            {/* t=1600ms: Underline */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "120%" }}
              transition={{ delay: 1.6, duration: 0.5 }}
              className="h-1 bg-gradient-to-r from-transparent via-[#F5A623] to-transparent mt-1"
            />
          </div>

          {/* t=1700ms: Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.7, duration: 0.4 }}
            className="text-white/80 text-lg mb-4 text-center"
          >
            Defeated <span className="text-white font-bold">{opponentName}</span> in {subject}
          </motion.p>

          {/* t=1800ms: Rank Badge */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.4 }}
            className="bg-[#1A1A35] px-4 py-2 rounded-full border border-white/10 mb-8 flex items-center gap-2"
          >
            <TrendingUp size={16} className="text-green-400" />
            <span className="text-white text-sm">
              Rank #{oldRank} → #{newRank} · 
              <span className="text-green-400 ml-1">Up {rankDiff} positions</span>
            </span>
          </motion.div>

          {/* t=1900ms: Stats Grid */}
          <div className="grid grid-cols-2 gap-4 w-full mb-8">
            {[
              { label: 'Score', value: `${score}/${totalQuestions}`, icon: Target, color: 'text-cyan-400', delay: 1.9 },
              { label: 'Accuracy', value: `${Math.round(accuracy)}%`, icon: Zap, color: 'text-purple-400', delay: 1.98 },
              { label: 'Coins', value: `+${coinsWon}`, icon: Coins, color: 'text-gold-400', delay: 2.06 },
              { label: 'XP Gained', value: `+${xpGained}`, icon: TrendingUp, color: 'text-blue-400', delay: 2.14 },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: stat.delay, duration: 0.4 }}
                className="bg-[#12122A] p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center"
              >
                <stat.icon size={20} className={`${stat.color} mb-2`} />
                <div className="text-xs text-white/50 mb-1">{stat.label}</div>
                <div className="text-lg font-bold text-white font-orbitron">{stat.value}</div>
              </motion.div>
            ))}
          </div>

          {/* t=2200ms: XP Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
            className="w-full mb-6"
          >
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-white/60">LEVEL {level}</span>
              <span className="text-xs text-white/40">{xpToNextLevel} XP to Level {level + 1}</span>
            </div>
            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpFill}%` }}
                transition={{ delay: 2.2, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#F5A623] to-[#FFD166] rounded-full"
              >
                {/* t=3300ms: XP shimmer sweep */}
                <AnimatePresence>
                  {showShimmer && (
                    <motion.div
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Buttons at bottom with iOS Safe Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.6, duration: 0.5 }}
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          className="w-full grid grid-cols-2 gap-4 mt-auto"
        >
          <button
            onClick={onRematch}
            className="flex items-center justify-center gap-2 bg-[#F5A623] text-[#080818] font-bold py-4 rounded-2xl hover:bg-[#FFD166] transition-colors"
          >
            <RefreshCw size={20} />
            Rematch
          </button>
          <button
            onClick={onShare}
            className="flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/20 transition-colors"
          >
            <Share2 size={20} />
            Share
          </button>

          {/* Replay Button */}
          <button
            onClick={onReplay}
            className="col-span-2 flex items-center justify-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors py-2"
          >
            <RotateCcw size={10} />
            Replay animation
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default VictoryScreen;
