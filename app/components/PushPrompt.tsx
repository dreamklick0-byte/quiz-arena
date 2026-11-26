'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToPush } from '@/lib/pushClient';
import { getSupabaseClient } from '@/lib/supabase';

export const PushPrompt: React.FC = () => {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const checkStatus = async () => {
      // Basic environment checks
      if (typeof window === 'undefined' || !('Notification' in window)) return;

      // Check if logged in
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // iOS detection
      const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOS(iOS);

      // Check dismissal
      const lastDismissed = localStorage.getItem('pushPromptDismissed');
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (lastDismissed && Date.now() - parseInt(lastDismissed) < sevenDays) return;

      // Check permission
      if (Notification.permission === 'default') {
        setShow(true);
      }
    };
    checkStatus();
  }, []);

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await subscribeToPush();
        setShow(false);
      }
    } catch (err) {
      console.error('Failed to subscribe to push:', err);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pushPromptDismissed', Date.now().toString());
    setShow(false);
  };

  if (!isMounted || !show) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[9998] bg-[#161627] border border-purple-500/30 rounded-2xl shadow-2xl p-5 overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex items-start gap-4">
            <div className="bg-purple-600/20 p-3 rounded-xl h-fit">
              <span className="text-2xl">🔔</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm leading-relaxed mb-4">
                Get notified about tournaments and rewards, even when you're not on the app
              </p>
              
              {isIOS && !('PushManager' in window) ? (
                <p className="text-xs text-amber-400/80 bg-amber-400/5 p-2 rounded-lg border border-amber-400/20">
                  On iPhone: tap Share → Add to Home Screen, then open Quiz Arena from the icon to enable notifications.
                </p>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleEnable}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl transition-colors text-xs uppercase tracking-widest shadow-lg shadow-purple-600/20"
                  >
                    Enable
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 bg-white/5 hover:bg-white/10 text-white/60 font-bold py-2 rounded-xl transition-colors text-xs uppercase tracking-widest"
                  >
                    Not now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Decorative background element */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
