export const RANKS = [ 
  { name: 'Rookie Mind',       xp: 0,        tier: 'beginner',     color: '#22c55e', emoji: '🌱' }, 
  { name: 'Brain Starter',     xp: 1000,     tier: 'beginner',     color: '#16a34a', emoji: '📖' }, 
  { name: 'Quiz Scout',        xp: 3000,     tier: 'beginner',     color: '#15803d', emoji: '🔍' }, 
  { name: 'Knowledge Hunter',  xp: 5000,     tier: 'beginner',     color: '#14532d', emoji: '🏹' }, 
  { name: 'Battle Scholar',    xp: 8000,     tier: 'intermediate', color: '#7c3aed', emoji: '📚' }, 
  { name: 'Arena Challenger',  xp: 12000,    tier: 'intermediate', color: '#6d28d9', emoji: '⚔️' }, 
  { name: 'Wisdom Raider',     xp: 20000,    tier: 'intermediate', color: '#5b21b6', emoji: '🛡️' }, 
  { name: 'Elite Thinker',     xp: 25000,    tier: 'intermediate', color: '#4c1d95', emoji: '🧠' }, 
  { name: 'Brainstorm Knight', xp: 30000,    tier: 'advanced',     color: '#d97706', emoji: '⚡' }, 
  { name: 'Quiz Commander',    xp: 40000,    tier: 'advanced',     color: '#b45309', emoji: '🎯' }, 
  { name: 'Mind Gladiator',    xp: 60000,    tier: 'advanced',     color: '#92400e', emoji: '🗡️' }, 
  { name: 'Genius Vanguard',   xp: 100000,   tier: 'advanced',     color: '#78350f', emoji: '👁️' }, 
  { name: 'Trivia Phantom',    xp: 150000,   tier: 'elite',        color: '#dc2626', emoji: '👻' }, 
  { name: 'IQ Dominator',      xp: 250000,   tier: 'elite',        color: '#b91c1c', emoji: '💀' }, 
  { name: 'Academic Titan',    xp: 350000,   tier: 'elite',        color: '#991b1b', emoji: '🔱' }, 
  { name: 'Master Strategist', xp: 700000,   tier: 'elite',        color: '#7f1d1d', emoji: '♟️' }, 
  { name: 'Legend Scholar',    xp: 1000000,  tier: 'legendary',    color: '#f59e0b', emoji: '🌟' }, 
  { name: 'Supreme Champion',  xp: 2000000,  tier: 'legendary',    color: '#d97706', emoji: '👑' }, 
  { name: 'Arena Immortal',    xp: 5000000,  tier: 'legendary',    color: '#b45309', emoji: '⚜️' }, 
  { name: 'Grand Quiz Emperor',xp: 10000000, tier: 'legendary',    color: '#f59e0b', emoji: '🏆' }, 
]; 

export const XP_REWARDS = { 
  battle_win:        50, 
  battle_loss:       10, 
  practice_complete: 5, 
  daily_login:       20, 
  league_join:       20, 
  referral:          100, 
  spin_xp:           0, // handled by spin wheel directly 
}; 

export function getRankFromXp(xp: number) { 
  let current = RANKS[0]; 
  for (const rank of RANKS) { 
    if (xp >= rank.xp) current = rank; 
    else break; 
  } 
  return current; 
} 

export function getNextRank(xp: number) { 
  const current = getRankFromXp(xp); 
  const idx = RANKS.findIndex(r => r.name === current.name); 
  return RANKS[idx + 1] || null; 
} 

export function getXpProgress(xp: number) { 
  const current = getRankFromXp(xp); 
  const next = getNextRank(xp); 
  if (!next) return { percent: 100, xpNeeded: 0, xpIntoRank: 0 }; 
  const xpIntoRank = xp - current.xp; 
  const xpNeeded = next.xp - current.xp; 
  return { 
    percent: Math.floor((xpIntoRank / xpNeeded) * 100), 
    xpNeeded: next.xp - xp, 
    xpIntoRank, 
  }; 
} 

export const TIER_COLORS: Record<string, string> = { 
  beginner:     '#22c55e', 
  intermediate: '#7c3aed', 
  advanced:     '#d97706', 
  elite:        '#dc2626', 
  legendary:    '#f59e0b', 
}; 
