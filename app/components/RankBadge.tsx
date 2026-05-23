'use client'; 
import { getRankFromXp, getXpProgress, TIER_COLORS } from '@/lib/rankSystem'; 

interface Props { 
  xp: number; 
  size?: 'sm' | 'md' | 'lg'; 
  showProgress?: boolean; 
} 

export default function RankBadge({ xp, size = 'md', showProgress = false }: Props) { 
  const rank = getRankFromXp(xp); 
  const progress = getXpProgress(xp); 
  const tierColor = TIER_COLORS[rank.tier]; 

  const sizes = { 
    sm: { badge: '28px', font: '10px', emoji: '14px' }, 
    md: { badge: '40px', font: '12px', emoji: '18px' }, 
    lg: { badge: '60px', font: '14px', emoji: '28px' }, 
  }; 
  const s = sizes[size]; 

  return ( 
    <div style={{ display: 'inline-flex', flexDirection: 'column', 
      alignItems: 'center', gap: '4px' }}> 
      <div style={{ 
        width: s.badge, height: s.badge, 
        borderRadius: '50%', 
        background: `radial-gradient(circle, ${tierColor}33, ${tierColor}11)`, 
        border: `2px solid ${tierColor}`, 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        fontSize: s.emoji, 
        boxShadow: `0 0 10px ${tierColor}66`, 
      }}> 
        {rank.emoji} 
      </div> 
      {size !== 'sm' && ( 
        <span style={{ 
          color: tierColor, fontSize: s.font, 
          fontWeight: 'bold', whiteSpace: 'nowrap' 
        }}> 
          {rank.name} 
        </span> 
      )} 
      {showProgress && progress.percent < 100 && ( 
        <div style={{ width: '100%', marginTop: '4px' }}> 
          <div style={{ 
            height: '4px', background: '#1e1b4b', 
            borderRadius: '2px', overflow: 'hidden', width: '120px', 
          }}> 
            <div style={{ 
              height: '100%', width: `${progress.percent}%`, 
              background: tierColor, 
              borderRadius: '2px', 
              transition: 'width 0.5s ease', 
            }} /> 
          </div> 
          <p style={{ 
            color: '#9ca3af', fontSize: '10px', 
            textAlign: 'center', margin: '2px 0 0' 
          }}> 
            {progress.xpNeeded.toLocaleString()} XP to next rank 
          </p> 
        </div> 
      )} 
    </div> 
  ); 
} 
