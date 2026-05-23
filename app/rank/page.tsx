'use client'; 
import { useEffect, useState } from 'react'; 
import { getSupabaseClient } from '@/lib/supabase'; 
import { getRankFromXp, getNextRank, getXpProgress, RANKS, TIER_COLORS } from '@/lib/rankSystem'; 
import { PageShell } from '@/app/components/PageShell'; 
import RankBadge from '@/app/components/RankBadge'; 

export default function RankPage() { 
  const [rankData, setRankData] = useState<any>(null); 
  const [loading, setLoading] = useState(true); 
  const [showLevelUp, setShowLevelUp] = useState(false); 

  useEffect(() => { 
    const fetchRank = async () => { 
      const supabase = getSupabaseClient(); 
      const { data: { user } } = await supabase.auth.getUser(); 
      if (!user) { setLoading(false); return; } 

      const { data } = await supabase 
        .from('user_ranks') 
        .select('*') 
        .eq('user_id', user.id) 
        .maybeSingle(); 

      if (data) { 
        setRankData(data); 
      } else { 
        setRankData({ total_xp: 0, current_rank: 'Rookie Mind', 
          rank_tier: 'beginner', battle_wins: 0, current_streak: 0 }); 
      } 
      setLoading(false); 
    }; 
    fetchRank(); 
  }, []); 

  if (loading) return ( 
    <PageShell overlay="rgba(15, 15, 26, 0.8)"> 
      <div style={{ display: 'flex', justifyContent: 'center', 
        alignItems: 'center', minHeight: '60vh' }}> 
        <div style={{ color: '#f59e0b', fontSize: '24px' }}>Loading rank...</div> 
      </div> 
    </PageShell> 
  ); 

  const xp = rankData?.total_xp || 0; 
  const rank = getRankFromXp(xp); 
  const nextRank = getNextRank(xp); 
  const progress = getXpProgress(xp); 
  const tierColor = TIER_COLORS[rank.tier]; 

  return ( 
    <PageShell overlay="rgba(15, 15, 26, 0.8)"> 
      <style>{` 
        @keyframes glow { 
          0%,100% { box-shadow: 0 0 20px ${tierColor}66; } 
          50% { box-shadow: 0 0 50px ${tierColor}cc, 0 0 80px ${tierColor}44; } 
        } 
        @keyframes float { 
          0%,100% { transform: translateY(0); } 
          50% { transform: translateY(-10px); } 
        } 
        @keyframes shimmer { 
          0% { background-position: -200% center; } 
          100% { background-position: 200% center; } 
        } 
        @keyframes levelup { 
          0% { transform: scale(0.5); opacity: 0; } 
          50% { transform: scale(1.2); opacity: 1; } 
          100% { transform: scale(1); opacity: 1; } 
        } 
      `}</style> 

      <div style={{ 
        minHeight: '100vh', padding: '24px 16px', 
        background: 'linear-gradient(135deg, #0a0015 0%, #0f0f1a 50%, #1a0a2e 100%)', 
      }}> 
        <div style={{ maxWidth: '600px', margin: '0 auto' }}> 

          {/* Header */} 
          <h1 style={{ 
            textAlign: 'center', fontSize: '32px', fontWeight: '900', 
            background: `linear-gradient(90deg, ${tierColor}, #ffffff, ${tierColor})`, 
            backgroundSize: '200% auto', 
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', 
            animation: 'shimmer 3s linear infinite', 
            marginBottom: '8px', 
          }}> 
            MY RANK 
          </h1> 

          {/* Main Rank Card */} 
          <div style={{ 
            background: `linear-gradient(135deg, ${tierColor}22, #0f0f1a)`, 
            border: `2px solid ${tierColor}`, 
            borderRadius: '24px', padding: '32px', 
            textAlign: 'center', marginBottom: '24px', 
            animation: 'glow 3s ease-in-out infinite', 
          }}> 
            <div style={{ fontSize: '80px', animation: 'float 3s ease-in-out infinite' }}> 
              {rank.emoji} 
            </div> 
            <h2 style={{ 
              color: tierColor, fontSize: '28px', fontWeight: '900', 
              margin: '8px 0 4px', textTransform: 'uppercase', 
              letterSpacing: '2px', 
            }}> 
              {rank.name} 
            </h2> 
            <p style={{ 
              color: '#9ca3af', fontSize: '14px', 
              textTransform: 'uppercase', letterSpacing: '3px', 
              margin: '0 0 24px', 
            }}> 
              {rank.tier} tier 
            </p> 

            {/* XP Display */} 
            <div style={{ 
              background: 'rgba(0,0,0,0.4)', borderRadius: '16px', 
              padding: '16px', marginBottom: '16px', 
            }}> 
              <p style={{ color: '#9ca3af', fontSize: '12px', 
                letterSpacing: '2px', margin: '0 0 4px' }}> 
                TOTAL XP 
              </p> 
              <p style={{ 
                color: '#f59e0b', fontSize: '36px', fontWeight: '900', margin: 0, 
              }}> 
                ⚡ {xp.toLocaleString()} 
              </p> 
            </div> 

            {/* Progress Bar */} 
            {nextRank && ( 
              <div> 
                <div style={{ 
                  display: 'flex', justifyContent: 'space-between', 
                  marginBottom: '8px', 
                }}> 
                  <span style={{ color: tierColor, fontSize: '12px', fontWeight: 'bold' }}> 
                    {rank.name} 
                  </span> 
                  <span style={{ color: '#9ca3af', fontSize: '12px' }}> 
                    {progress.xpNeeded.toLocaleString()} XP to go 
                  </span> 
                  <span style={{ color: TIER_COLORS[nextRank.tier], 
                    fontSize: '12px', fontWeight: 'bold' }}> 
                    {nextRank.name} 
                  </span> 
                </div> 
                <div style={{ 
                  height: '12px', background: '#1e1b4b', 
                  borderRadius: '6px', overflow: 'hidden', 
                }}> 
                  <div style={{ 
                    height: '100%', width: `${progress.percent}%`, 
                    background: `linear-gradient(90deg, ${tierColor}, ${TIER_COLORS[nextRank.tier]})`, 
                    borderRadius: '6px', 
                    transition: 'width 1s ease', 
                    boxShadow: `0 0 10px ${tierColor}`, 
                  }} /> 
                </div> 
                <p style={{ color: '#6b7280', fontSize: '11px', 
                  textAlign: 'center', marginTop: '8px' }}> 
                  {progress.percent}% progress to {nextRank.emoji} {nextRank.name} 
                </p> 
              </div> 
            )} 

            {!nextRank && ( 
              <div style={{ 
                color: '#f59e0b', fontSize: '20px', fontWeight: 'bold', 
                padding: '16px', background: 'rgba(245,158,11,0.1)', 
                borderRadius: '12px', border: '1px solid #f59e0b', 
              }}> 
                👑 MAXIMUM RANK ACHIEVED 
              </div> 
            )} 
          </div> 

          {/* Stats Row */} 
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '12px', marginBottom: '24px' }}> 
            {[ 
              { label: 'Battle Wins', value: rankData?.battle_wins || 0, icon: '⚔️' }, 
              { label: 'Win Streak', value: rankData?.current_streak || 0, icon: '🔥' }, 
              { label: 'Rank Position', value: rank.name.split(' ')[0], icon: '🏆' }, 
            ].map((stat, i) => ( 
              <div key={i} style={{ 
                background: 'rgba(124,58,237,0.1)', 
                border: '1px solid rgba(124,58,237,0.3)', 
                borderRadius: '16px', padding: '16px', 
                textAlign: 'center', 
              }}> 
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{stat.icon}</div> 
                <div style={{ color: '#f59e0b', fontSize: '20px', fontWeight: '900' }}> 
                  {stat.value} 
                </div> 
                <div style={{ color: '#6b7280', fontSize: '11px' }}>{stat.label}</div> 
              </div> 
            ))} 
          </div> 

          {/* All Ranks List */} 
          <div style={{ 
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(124,58,237,0.3)', 
            borderRadius: '20px', padding: '20px', 
          }}> 
            <h3 style={{ color: '#ffffff', fontSize: '18px', fontWeight: 'bold', 
              marginBottom: '16px', textAlign: 'center' }}> 
              🗺️ RANK JOURNEY 
            </h3> 
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}> 
              {RANKS.map((r, i) => { 
                const isCurrentRank = r.name === rank.name; 
                const isUnlocked = xp >= r.xp; 
                const rColor = TIER_COLORS[r.tier]; 
                return ( 
                  <div key={i} style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', 
                    padding: '10px 14px', borderRadius: '12px', 
                    background: isCurrentRank 
                      ? `${rColor}22` : 'rgba(0,0,0,0.2)', 
                    border: isCurrentRank 
                      ? `1px solid ${rColor}` : '1px solid transparent', 
                    opacity: isUnlocked ? 1 : 0.4, 
                  }}> 
                    <span style={{ fontSize: '20px' }}>{r.emoji}</span> 
                    <div style={{ flex: 1 }}> 
                      <span style={{ 
                        color: isCurrentRank ? rColor : (isUnlocked ? '#e5e7eb' : '#6b7280'), 
                        fontSize: '14px', fontWeight: isCurrentRank ? 'bold' : 'normal', 
                      }}> 
                        {r.name} 
                      </span> 
                      <span style={{ color: '#6b7280', fontSize: '11px', 
                        marginLeft: '8px' }}> 
                        {r.xp.toLocaleString()} XP 
                      </span> 
                    </div> 
                    {isCurrentRank && ( 
                      <span style={{ 
                        background: rColor, color: '#000', 
                        fontSize: '10px', fontWeight: 'bold', 
                        padding: '2px 8px', borderRadius: '20px', 
                      }}> 
                        YOU 
                      </span> 
                    )} 
                    {isUnlocked && !isCurrentRank && ( 
                      <span style={{ color: '#22c55e', fontSize: '16px' }}>✓</span> 
                    )} 
                    {!isUnlocked && ( 
                       <span style={{ color: '#6b7280', fontSize: '14px' }}>🔒</span> 
                    )} 
                  </div> 
                ); 
              })} 
            </div> 
          </div> 

        </div> 
      </div> 
    </PageShell> 
  ); 
} 
