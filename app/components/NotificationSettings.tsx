'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Shield, Clock, TrendingUp, BookOpen, Sword } from 'lucide-react';
import { useGamificationStore } from '@/lib/gamificationStore';
import { supabase } from '@/lib/supabase';

// --- NOTIFICATION SCHEDULER SERVICE ---

export const useNotificationScheduler = () => {
  const { addNotification, updateRank, rank: currentRank } = useGamificationStore();

  const checkActivityAndSchedule = async (userId: string) => {
    try {
      // 1. Check Inactivity
      const lastLogin = localStorage.getItem('quiz-arena-last-login');
      const now = new Date();
      
      if (lastLogin) {
        const lastLoginDate = new Date(lastLogin);
        const diffInHours = (now.getTime() - lastLoginDate.getTime()) / (1000 * 3600);
        
        if (diffInHours > 20 && diffInHours < 48) {
          addNotification({
            type: 'STUDY',
            message: "⚡ Students battled while you were away. Come back and reclaim your rank.",
          });
        } else if (diffInHours >= 48 && diffInHours < 72) {
          addNotification({
            type: 'STUDY',
            message: "📚 2 days without practice. Your WAEC prep needs consistency.",
          });
        }
      }
      
      localStorage.setItem('quiz-arena-last-login', now.toISOString());

      // 2. Check Streak Risk (after 6 PM)
      const hour = now.getHours();
      if (hour >= 18) {
        const streaks = useGamificationStore.getState().streaks;
        const lastUpdated = streaks.lastUpdated ? new Date(streaks.lastUpdated) : null;
        const isTodayCompleted = lastUpdated?.toDateString() === now.toDateString();
        
        if (!isTodayCompleted && streaks.learning > 0) {
          addNotification({
            type: 'STREAK',
            message: `⚠️ Your ${streaks.learning}-day streak ends tonight. One battle keeps it alive.`,
          });
        }
      }

      // 3. Check Rank Changes (Online/Offline)
      // In a real app, this would be triggered by a backend webhook or sync
      // For now, we'll simulate a check against a leaderboard or profile field
      const { data: profile } = await supabase
        .from('profiles')
        .select('rank')
        .eq('id', userId)
        .single();
      
      if (profile?.rank && profile.rank !== currentRank) {
        if (profile.rank < currentRank) {
          addNotification({
            type: 'RANK',
            message: `🏆 You climbed to Rank #${profile.rank}! Keep battling to go higher.`,
          });
        } else if (profile.rank > currentRank && currentRank !== 0) {
          addNotification({
            type: 'RANK',
            message: `🚨 Someone just passed you on the leaderboard. Time to fight back.`,
          });
        }
        updateRank(profile.rank);
      }
    } catch (err) {
      console.error('Notification scheduler error:', err);
    }
  };

  return { checkActivityAndSchedule };
};

// --- NOTIFICATION PREFERENCES COMPONENT ---

interface PreferenceToggleProps {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
}

const PreferenceToggle: React.FC<PreferenceToggleProps> = ({ label, sublabel, icon, enabled, onToggle }) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
    <div className="flex items-center gap-4">
      <div className="bg-white/5 p-2.5 rounded-xl text-[#F5A623]">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-[11px] text-white/40">{sublabel}</p>
      </div>
    </div>
    <button
      onClick={onToggle}
      className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? 'bg-purple-600' : 'bg-white/10'}`}
    >
      <motion.div
        animate={{ x: enabled ? 26 : 2 }}
        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </button>
  </div>
);

export const NotificationPreferences: React.FC = () => {
  const [prefs, setPrefs] = useState({
    streakReminders: true,
    battleAlerts: true,
    rankChanges: false,
    studyMotivation: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem('quiz-arena-notification-prefs');
    if (saved) setPrefs(JSON.parse(saved));
  }, []);

  const toggle = (key: keyof typeof prefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    localStorage.setItem('quiz-arena-notification-prefs', JSON.stringify(newPrefs));
    
    // In a real app, sync to backend here
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Bell size={18} className="text-purple-400" />
        <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Notification Settings</h3>
      </div>
      
      <div className="grid gap-3">
        <PreferenceToggle
          label="Streak Reminders"
          sublabel="Don't lose your progress. We'll remind you before it's too late."
          icon={<Clock size={20} />}
          enabled={prefs.streakReminders}
          onToggle={() => toggle('streakReminders')}
        />
        <PreferenceToggle
          label="Battle Alerts"
          sublabel="Get notified when someone challenges you or a battle ends."
          icon={<Sword size={20} />}
          enabled={prefs.battleAlerts}
          onToggle={() => toggle('battleAlerts')}
        />
        <PreferenceToggle
          label="Rank Changes"
          sublabel="Know immediately if you climb or fall on the leaderboard."
          icon={<TrendingUp size={20} />}
          enabled={prefs.rankChanges}
          onToggle={() => toggle('rankChanges')}
        />
        <PreferenceToggle
          label="Study Motivation"
          sublabel="Daily tips and reminders to keep your WAEC/JAMB prep on track."
          icon={<BookOpen size={20} />}
          enabled={prefs.studyMotivation}
          onToggle={() => toggle('studyMotivation')}
        />
      </div>
    </div>
  );
};
