'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamificationStore } from '../../lib/gamificationStore';

export const LevelUpBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const handleLevelUp = (e: any) => {
      setLevel(e.detail.level);
      setShow(true);
      setTimeout(() => setShow(false), 2500);
    };

    window.addEventListener('level-up', handleLevelUp);
    return () => window.removeEventListener('level-up', handleLevelUp);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.5, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                rotateY: [0, 360],
                filter: ['drop-shadow(0 0 10px #F5A623)', 'drop-shadow(0 0 30px #F5A623)', 'drop-shadow(0 0 10px #F5A623)']
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              ⭐
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-black text-[#F5A623] font-orbitron mb-2 tracking-widest">
              LEVEL UP!
            </h2>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#F5A623] to-transparent mb-4" />
            <p className="text-2xl font-bold text-white uppercase tracking-wider">
              You reached Level <span className="text-[#F5A623]">{level}</span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const NotificationPreferences: React.FC = () => {
  const [prefs, setPrefs] = useState({
    streakReminders: true,
    battleAlerts: true,
    rankChanges: false,
    studyMotivation: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem('quiz-arena-notif-prefs');
    if (saved) setPrefs(JSON.parse(saved));
  }, []);

  const toggle = (key: keyof typeof prefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    localStorage.setItem('quiz-arena-notif-prefs', JSON.stringify(newPrefs));
  };

  const items = [
    { id: 'streakReminders', label: 'Streak Reminders', sub: 'Get alerted when your streak is at risk' },
    { id: 'battleAlerts', label: 'Battle Alerts', sub: 'Notifications for new challenges and results' },
    { id: 'rankChanges', label: 'Rank Changes', sub: 'Know when you climb or drop on the leaderboard' },
    { id: 'studyMotivation', label: 'Study Motivation', sub: 'Daily tips and encouragement for your prep' },
  ];

  return (
    <div className="bg-[#12122A] rounded-3xl p-6 border border-white/5 w-full">
      <h3 className="text-lg font-bold text-white mb-6 font-orbitron">NOTIFICATION SETTINGS</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors">
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{item.label}</p>
              <p className="text-[10px] text-white/40">{item.sub}</p>
            </div>
            <button
              onClick={() => toggle(item.id as any)}
              className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${
                prefs[item.id as keyof typeof prefs] ? 'bg-purple-600' : 'bg-white/10'
              }`}
            >
              <motion.div
                animate={{ x: prefs[item.id as keyof typeof prefs] ? 24 : 4 }}
                className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
