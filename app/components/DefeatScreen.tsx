'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RefreshCw, BookOpen, X, RotateCcw, Target, Zap, TrendingUp } from 'lucide-react';

interface DefeatScreenProps {
  playerName: string;
  opponentName: string;
  subject: string;
  examType: string;
  playerScore: number;
  opponentScore: number;
  accuracy: number;
  xpEarned: number;
  onRematch: () => void;
  onPractice: () => void;
  onClose: () => void;
}

const ENCOURAGEMENT_MESSAGES = [
  "💪 Every champion started with a loss. Train harder.",
  "📚 Study the questions you got wrong — they're your best teachers.",
  "🔥 Your opponent won this round. Win the next one.",
  "⚡ Close battle. A little more prep and you'll dominate."
];

const DefeatScreen: React.FC<DefeatScreenProps> = (props) => {
  const [key, setKey] = useState(0);

  const handleReplay = () => {
    setKey(prev => prev + 1);
  };

  return (
    <DefeatScreenContent key={key} {...props} onReplay={handleReplay} />
  );
};

const DefeatScreenContent: React.FC<DefeatScreenProps & { onReplay: () => void }> = ({
  playerName,
  opponentName,
  subject,
  examType,
  playerScore,
  opponentScore,
  accuracy,
  xpEarned,
  onRematch,
  onPractice,
  onClose,
  onReplay,
}) => {
  const message = useMemo(() => {
    return ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-[#0A0A1A] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Blue Radial Gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
      </div>

      <div className="w-full max-w-md px-6 flex flex-col items-center relative h-full">
        {/* Close Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-50"
        >
          <X size={24} />
        </motion.button>

        <div className="flex-1 flex flex-col items-center justify-center w-full">
          {/* Icon Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="w-24 h-24 bg-[#1A1A35] rounded-full flex items-center justify-center border border-white/10">
              <Shield size={48} className="text-white/40" />
            </div>
          </motion.div>

          {/* Defeated Text */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="text-4xl font-black text-white/40 font-orbitron mb-2"
          >
            DEFEATED
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-white/60 text-lg mb-8 text-center px-4"
          >
            {message}
          </motion.p>

          {/* Score Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="w-full flex items-center justify-center gap-8 mb-10"
          >
            <div className="text-center">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">You</p>
              <p className="text-4xl font-black text-white/40 font-orbitron">{playerScore}</p>
            </div>
            <div className="text-2xl font-black text-white/20 font-orbitron">VS</div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">{opponentName}</p>
              <p className="text-4xl font-black text-white font-orbitron">{opponentScore}</p>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 w-full mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="bg-[#12122A] p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center"
            >
              <Zap size={20} className="text-purple-400 mb-2" />
              <div className="text-xs text-white/50 mb-1">Accuracy</div>
              <div className="text-lg font-bold text-white font-orbitron">{Math.round(accuracy)}%</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="bg-[#12122A] p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center"
            >
              <TrendingUp size={20} className="text-blue-400 mb-2" />
              <div className="text-xs text-white/50 mb-1">XP Earned</div>
              <div className="text-lg font-bold text-white font-orbitron">+{xpEarned}</div>
            </motion.div>
          </div>
        </div>

        {/* Buttons at bottom with iOS Safe Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
          className="w-full grid grid-cols-1 gap-3 mt-auto mb-4"
        >
          <button
            onClick={onRematch}
            className="flex items-center justify-center gap-2 bg-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/20 transition-colors"
          >
            <RefreshCw size={20} />
            Rematch
          </button>
          <button
            onClick={onPractice}
            className="flex items-center justify-center gap-2 border border-[#7C3AED]/50 text-[#7C3AED] font-bold py-4 rounded-2xl hover:bg-[#7C3AED]/10 transition-colors"
          >
            <BookOpen size={20} />
            Practice {subject}
          </button>

          {/* Replay Button */}
          <button
            onClick={onReplay}
            className="flex items-center justify-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors py-2"
          >
            <RotateCcw size={10} />
            Replay animation
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DefeatScreen;
