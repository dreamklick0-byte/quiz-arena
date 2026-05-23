import { NextRequest, NextResponse } from 'next/server'; 
import { createClient } from '@supabase/supabase-js'; 

const supabase = createClient( 
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
); 

export async function POST(request: NextRequest) { 
  try { 
    const { userId, result, subject } = await request.json(); 

    if (!userId || !result) { 
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 }); 
    } 

    const xpAmount = result === 'win' ? 50 : result === 'practice' ? 5 : 10; 
    const description = result === 'win' 
      ? `Won a ${subject || 'battle'} match (+50 XP)` 
      : result === 'practice' 
      ? `Completed a ${subject || 'practice'} session (+5 XP)`
      : `Participated in a ${subject || 'battle'} match (+10 XP)`; 

    const { data, error } = await supabase.rpc('award_xp', { 
      p_user_id: userId, 
      p_amount: xpAmount, 
      p_source: result === 'practice' ? 'practice' : 'battle', 
      p_description: description, 
    }); 

    if (error) throw error; 

    // Sync total_xp in profiles/user_xp if necessary (using increment_user_xp as per user's pattern)
    await supabase.rpc('increment_user_xp', { 
      p_user_id: userId, 
      p_amount: xpAmount, 
    }); 

    if (result === 'win' || result === 'loss') {
      const column = result === 'win' ? 'battle_wins' : 'battle_losses';
      
      // Get current value to increment manually as requested in STEP 1
      const { data: rankRow } = await supabase 
        .from('user_ranks') 
        .select(column) 
        .eq('user_id', userId) 
        .maybeSingle(); 

      const newValue = (rankRow?.[column] || 0) + 1;

      await supabase 
        .from('user_ranks') 
        .update({ [column]: newValue }) 
        .eq('user_id', userId); 
    } 

    return NextResponse.json({ success: true, result: data }); 
  } catch (err) { 
    console.error('Award XP error:', err); 
    return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 }); 
  } 
} 
