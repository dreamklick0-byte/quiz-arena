import { NextResponse } from 'next/server'; 
import { cookies } from 'next/headers'; 
import { getAdminClient } from '@/lib/supabase'; 
 
export const dynamic = 'force-dynamic'; 
 
export async function GET() { 
  try { 
    const cookieStore = await cookies(); 
    const adminSessionCookie = cookieStore.get('admin_session')?.value; 
    if (!adminSessionCookie) { 
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); 
    } 
    const supabase = getAdminClient(); 
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers(); 
    if (authError) { 
      return NextResponse.json({ success: false, error: authError.message }, { status: 500 }); 
    } 
    const authUsers = authData?.users || []; 
    const [profilesData, wallets, presence, coinsData, xpData] = await Promise.all([ 
      supabase.from('profiles').select('id, display_name, referral_code, status, referred_by'), 
      supabase.from('wallets').select('user_id, balance'), 
      supabase.from('user_presence').select('user_id, last_seen'), 
      supabase.from('arena_coins').select('user_id, coins'), 
      supabase.from('user_xp').select('user_id, xp') 
    ]); 
    const profileMap = Object.fromEntries((profilesData.data || []).map(p => [p.id, p])); 
    const walletMap = Object.fromEntries((wallets.data || []).map(w => [w.user_id, w.balance])); 
    const presenceMap = Object.fromEntries((presence.data || []).map(p => [p.user_id, p.last_seen])); 
    const coinsMap = Object.fromEntries((coinsData.data || []).map(c => [c.user_id, c.coins])); 
    const xpMap = Object.fromEntries((xpData.data || []).map(x => [x.user_id, x.xp])); 
    const users = authUsers.map(u => { 
      const p = profileMap[u.id] || {}; 
      return { 
        id: u.id, 
        email: u.email || null, 
        display_name: p.display_name || u.user_metadata?.display_name || u.email?.split('@')[0] || 'Unknown', 
        phone: u.phone || null, 
        referral_code: p.referral_code || null, 
        created_at: u.created_at || new Date().toISOString(), 
        status: p.status || 'active', 
        wallet_balance: walletMap[u.id] || 0, 
        coins: coinsMap[u.id] || 0, 
        xp: xpMap[u.id] || 0, 
        last_seen: presenceMap[u.id] || u.last_sign_in_at || null, 
      }; 
    }); 
    return NextResponse.json({ success: true, users }); 
  } catch (err: any) { 
    console.error('List users error:', err); 
    return NextResponse.json({ success: false, error: err.message }, { status: 500 }); 
  } 
} 
