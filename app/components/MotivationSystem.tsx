'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Flame, Target, Zap, Sword, TrendingUp, X } from 'lucide-react';

export type MotivationType = 
  | 'POPUP_STREAK_3' 
  | 'POPUP_STREAK_5' 
  | 'POPUP_STREAK_10' 
  | 'POPUP_HIGH_ACCURACY' 
  | 'POPUP_BOUNCE_BACK' 
  | 'POPUP_BATTLE_READY';

interface MotivationMessage {
  type: MotivationType;
  text: string;
  icon: React.ReactNode;
}

const MESSAGE_POOLS: Record<MotivationType, string[]> = {
  POPUP_STREAK_3: [
    "🔥 3 in a row! You're heating up.",
    "🎯 Sharp! Keep this momentum going.",
    "⚡ Three correct — you're locked in."
  ],
  POPUP_STREAK_5: [
    "🏆 5 correct in a row! You're battle-ready.",
    "🚀 Unstoppable! 5 straight answers.",
    "🎯 Your accuracy is elite. Challenge someone!"
  ],
  POPUP_STREAK_10: [
    "👑 10 in a row. You're dominating.",
    "🔥 LEGENDARY streak. Time to go live!",
    "⚡ Nobody stopping you today."
  ],
  POPUP_HIGH_ACCURACY: [
    "📊 80%+ accuracy. You're performing at champion level.",
    "🏆 Your performance is leaderboard quality.",
    "🎯 Top-tier accuracy. Ready to battle?"
  ],
  POPUP_BOUNCE_BACK: [
    "💪 Bounced back strong. That's a champion mindset.",
    "🔄 Mistakes build winners. Keep going.",
    "🧠 Good recovery. Stay focused."
  ],
  POPUP_BATTLE_READY: [
    "⚔️ Real players are waiting. Ready for a challenge?",
    "🌐 Students are live right now. Join them.",
    "🏟️ You've warmed up enough. Battle time?"
  ]
};

const ICONS: Record<MotivationType, React.ReactNode> = {
  POPUP_STREAK_3: <Flame className="text-orange-500" />,
  POPUP_STREAK_5: <Zap className="text-yellow-500" />,
  POPUP_STREAK_10: <TrendingUp className="text-gold-500" />,
  POPUP_HIGH_ACCURACY: <Target className="text-cyan-500" />,
  POPUP_BOUNCE_BACK: <Zap className="text-green-500" />,
  POPUP_BATTLE_READY: <Sword className="text-purple-500" />
};

export const useMotivationEngine = () => {
  const [currentMotivation, setCurrentMotivation] = useState<MotivationMessage | null>(null);
  const [usedMessages, setUsedMessages] = useState<Set<string>>(new Set());
  const [hasTriggeredHighAccuracy, setHasTriggeredHighAccuracy] = useState(false);

  const triggerMotivation = useCallback((type: MotivationType, context?: any) => {
    const pool = MESSAGE_POOLS[type];
    const availableMessages = pool.filter(msg => !usedMessages.has(msg));
    
    if (availableMessages.length === 0) return; // All messages in pool used

    let selectedText = availableMessages[Math.floor(Math.random() * availableMessages.length)];
    
    // Context-specific replacements
    if (type === 'POPUP_BATTLE_READY' && context?.accuracy) {
      selectedText = selectedText.replace('[X]', context.accuracy.toString());
    }

    setUsedMessages(prev => new Set(prev).add(selectedText));
    setCurrentMotivation({
      type,
      text: selectedText,
      icon: ICONS[type]
    });
  }, [usedMessages]);

  const checkTriggers = useCallback((stats: { 
    streak: number; 
    accuracy: number; 
    isBounceBack: boolean; 
    totalQuestions: number; 
  }) => {
    // Streak triggers
    if (stats.streak === 3) triggerMotivation('POPUP_STREAK_3');
    else if (stats.streak === 5) triggerMotivation('POPUP_STREAK_5');
    else if (stats.streak === 10) triggerMotivation('POPUP_STREAK_10');
    
    // Accuracy trigger (first time crossing 80%)
    if (!hasTriggeredHighAccuracy && stats.accuracy >= 80 && stats.totalQuestions >= 5) {
      triggerMotivation('POPUP_HIGH_ACCURACY');
      setHasTriggeredHighAccuracy(true);
    }
    
    // Bounce back trigger
    if (stats.isBounceBack) triggerMotivation('POPUP_BOUNCE_BACK');
    
    // Battle ready trigger
    if (stats.totalQuestions === 10) triggerMotivation('POPUP_BATTLE_READY', { accuracy: Math.round(stats.accuracy) });
  }, [triggerMotivation, hasTriggeredHighAccuracy]);

  const dismiss = () => setCurrentMotivation(null);

  return { currentMotivation, checkTriggers, dismiss };
};

export const MotivationPopup: React.FC<{
  motivation: MotivationMessage | null;
  onDismiss: () => void;
}> = ({ motivation, onDismiss }) => {
  const router = useRouter();

  useEffect(() => {
    if (motivation) {
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [motivation, onDismiss]);

  return (
    <AnimatePresence>
      {motivation && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm"
        >
          <div 
            className="bg-[#1A1A35] border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4 cursor-pointer"
            onClick={onDismiss}
          >
            <div className="bg-white/5 p-3 rounded-xl">
              {motivation.icon}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm leading-tight">
                {motivation.text}
              </p>
              {motivation.type === 'POPUP_BATTLE_READY' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/battle/quick-match');
                  }}
                  className="mt-2 text-xs font-bold text-[#F5A623] hover:text-[#FFD166] transition-colors flex items-center gap-1"
                >
                  Join battle now <Sword size={12} />
                </button>
              )}
            </div>
            <button className="text-white/30 hover:text-white/60">
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
