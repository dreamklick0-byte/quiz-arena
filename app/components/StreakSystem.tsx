'use client';

import React, { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Flame, Info } from 'lucide-react';
import { useGamificationStore } from '@/lib/gamificationStore';
import { supabase } from '@/lib/supabase';

export const useStreakTracker = (userId: string | undefined) => {
  const { streaks, updateStreak, setInitialState, addNotification } = useGamificationStore();

  const syncStreaksWithBackend = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('streaks_data, last_active_at')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (profile?.streaks_data) {
        setInitialState({ streaks: profile.streaks_data });
      }

      // Logic to check if streak was lost
      const lastActive = profile.last_active_at ? new Date(profile.last_active_at) : null;
      const now = new Date();
      
      if (lastActive) {
        const diffInHours = (now.getTime() - lastActive.getTime()) / (1000 * 3600);
        if (diffInHours > 48) {
          // Streak lost logic
          addNotification({
            type: 'STREAK',
            message: "💔 Streak lost. But champions don't stay down. Start a new one today.",
          });
        }
      }
    } catch (err) {
      console.error('Error syncing streaks:', err);
    }
  }, [userId, setInitialState, addNotification]);

  useEffect(() => {
    syncStreaksWithBackend();
  }, [syncStreaksWithBackend]);

  const trackAction = async (type: 'battle' | 'practice' | 'login') => {
    updateStreak(type);
    
    // Sync to backend
    if (userId) {
      const currentStreaks = useGamificationStore.getState().streaks;
      await supabase
        .from('profiles')
        .update({ 
          streaks_data: currentStreaks,
          last_active_at: new Date().toISOString()
        })
        .eq('id', userId);
    }
  };

  return { trackAction };
};

export const StreakCalendar: React.FC = () => {
  const streaks = useGamificationStore((state) => state.streaks);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIndex = (new Date().getDay() + 6) % 7; // Mon is 0
  
  const lastUpdated = streaks.lastUpdated ? new Date(streaks.lastUpdated) : null;
  const isTodayCompleted = lastUpdated?.toDateString() === new Date().toDateString();

  return (
    <div className="bg-[#12122A] p-6 rounded-3xl border border-white/5 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
            <Flame className="text-orange-500" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">
              {streaks.learning}-day streak
            </h3>
            <p className="text-xs text-white/40">Keep the momentum going!</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        {days.map((day, i) => {
          const isPast = i < todayIndex;
          const isToday = i === todayIndex;
          const isCompleted = (isPast || (isToday && isTodayCompleted)) && streaks.learning > (todayIndex - i);

          return (
            <div key={day} className="flex flex-col items-center gap-2">
              <span className="text-[10px] font-bold text-white/30 uppercase">{day}</span>
              <div className="relative">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                    isCompleted 
                      ? 'bg-gold-primary border-gold-primary shadow-[0_0_15px_rgba(245,166,35,0.4)]' 
                      : isToday 
                        ? 'border-gold-primary/50 border-dashed animate-pulse' 
                        : 'border-white/10'
                  }`}
                >
                  {isCompleted && <Flame size={20} className="text-[#080818]" />}
                </div>
                {isToday && !isTodayCompleted && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#12122A]"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isTodayCompleted && (
        <div className="bg-white/5 p-3 rounded-2xl flex items-center gap-3 border border-white/5">
          <Info size={16} className="text-gold-primary" />
          <p className="text-xs text-white/70">
            Battle or practice today to keep your streak alive!
          </p>
        </div>
      )}
    </div>
  );
};
