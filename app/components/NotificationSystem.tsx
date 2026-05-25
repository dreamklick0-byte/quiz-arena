'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Flame, Sword, Trophy, Book, Coins, Check, X, Clock } from 'lucide-react';
import { useGamificationStore, Notification as NotificationType } from '@/lib/gamificationStore';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  STREAK: <Flame className="text-orange-500" size={18} />,
  BATTLE: <Sword className="text-purple-500" size={18} />,
  RANK: <Trophy className="text-gold-500" size={18} />,
  STUDY: <Book className="text-cyan-500" size={18} />,
  REWARD: <Coins className="text-green-500" size={18} />,
};

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export const NotificationBell: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const unreadCount = useGamificationStore((state) => state.unreadCount);

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
    >
      <Bell size={24} className="text-white/80" />
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute top-1 right-1 w-5 h-5 bg-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#080818]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};

export const NotificationItem: React.FC<{ notification: NotificationType }> = ({ notification }) => {
  const markRead = useGamificationStore((state) => state.markNotificationRead);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => markRead(notification.id)}
      className={`relative p-4 cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5 ${
        !notification.read ? 'border-l-[3px] border-l-purple-600' : ''
      }`}
    >
      <div className="flex gap-4">
        <div className="bg-white/5 p-2 rounded-xl h-fit mt-1">
          {TYPE_ICONS[notification.type] || <Bell size={18} />}
        </div>
        <div className="flex-1">
          <p className={`text-sm leading-snug mb-1 ${notification.read ? 'text-white/60' : 'text-white'}`}>
            {notification.message}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-white/30">
            <Clock size={10} />
            {getRelativeTime(notification.timestamp)}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const NotificationCenter: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { notifications, markAllRead } = useGamificationStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#080818] z-[70] shadow-2xl border-l border-white/10 flex flex-col"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white font-orbitron">NOTIFICATIONS</h2>
                <p className="text-xs text-white/40 mt-1">Stay updated with your progress</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 text-white/60"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                <div className="flex flex-col">
                  <div className="p-4 flex justify-end">
                    <button
                      onClick={markAllRead}
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="flex flex-col">
                    {[...notifications]
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((notification) => (
                        <NotificationItem key={notification.id} notification={notification} />
                      ))
                    }
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Bell size={32} className="text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm">No notifications yet.</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
