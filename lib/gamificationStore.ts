import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 'STREAK' | 'BATTLE' | 'RANK' | 'STUDY' | 'REWARD';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  read: boolean;
}

interface Streaks {
  login: number;
  battle: number;
  practice: number;
  learning: number;
  lastUpdated: string | null;
}

interface GamificationState {
  xp: number;
  level: number;
  xpToNextLevel: number;
  coins: number;
  streaks: Streaks;
  rank: number;
  totalBattles: number;
  totalWins: number;
  accuracy: number;
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  addXP: (amount: number) => void;
  addCoins: (amount: number) => void;
  updateStreak: (type: keyof Omit<Streaks, 'lastUpdated'>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  updateRank: (newRank: number) => void;
  setInitialState: (data: Partial<GamificationState>) => void;
}

const LEVEL_THRESHOLDS = [0, 500, 1200, 2200, 3500, 5000, 7000, 9500, 12500, 16000];

const calculateLevel = (xp: number) => {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  
  if (level > 10) {
    const baseXP = 16000;
    const additionalXP = xp - baseXP;
    const additionalLevels = Math.floor(additionalXP / 4000);
    level = 10 + additionalLevels;
  }
  
  return level;
};

const getXPToNextLevel = (xp: number, level: number) => {
  if (level < 10) {
    return LEVEL_THRESHOLDS[level] - xp;
  }
  const baseXPForLevel = 16000 + (level - 10) * 4000;
  return baseXPForLevel + 4000 - xp;
};

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 0,
      level: 1,
      xpToNextLevel: 500,
      coins: 0,
      streaks: {
        login: 0,
        battle: 0,
        practice: 0,
        learning: 0,
        lastUpdated: null,
      },
      rank: 0,
      totalBattles: 0,
      totalWins: 0,
      accuracy: 0,
      notifications: [],
      unreadCount: 0,

      setInitialState: (data) => set((state) => ({ ...state, ...data })),

      addXP: (amount) => set((state) => {
        const newXP = state.xp + amount;
        const newLevel = calculateLevel(newXP);
        const newXPToNextLevel = getXPToNextLevel(newXP, newLevel);
        
        if (newLevel > state.level) {
          // Trigger LevelUp event (can be handled by a listener or component)
          window.dispatchEvent(new CustomEvent('level-up', { detail: { level: newLevel } }));
        }
        
        return {
          xp: newXP,
          level: newLevel,
          xpToNextLevel: newXPToNextLevel,
        };
      }),

      addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),

      updateStreak: (type) => set((state) => {
        const now = new Date();
        const lastUpdated = state.streaks.lastUpdated ? new Date(state.streaks.lastUpdated) : null;
        const newStreaks = { ...state.streaks };
        
        if (!lastUpdated || now.toDateString() !== lastUpdated.toDateString()) {
          newStreaks[type] += 1;
          newStreaks.learning += 1;
          newStreaks.lastUpdated = now.toISOString();
        }
        
        return { streaks: newStreaks };
      }),

      addNotification: (notification) => set((state) => {
        const newNotification: Notification = {
          ...notification,
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          read: false,
        };
        
        const newNotifications = [newNotification, ...state.notifications].slice(0, 50);
        return {
          notifications: newNotifications,
          unreadCount: state.unreadCount + 1,
        };
      }),

      markNotificationRead: (id) => set((state) => {
        const notification = state.notifications.find(n => n.id === id);
        if (!notification || notification.read) return state;
        
        return {
          notifications: state.notifications.map(n => 
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        };
      }),

      markAllRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      })),

      updateRank: (newRank) => set((state) => {
        if (newRank !== state.rank && state.rank !== 0) {
          const type = newRank < state.rank ? 'RANK_CLIMBED' : 'RANK_OVERTAKEN';
          // Notification will be added via external trigger or here
        }
        return { rank: newRank };
      }),
    }),
    {
      name: 'quiz-arena-gamification-storage',
    }
  )
);
