import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

const DEFAULT_SEGMENTS = [
  { id: '1', label: '₦50', type: 'cash', amount: 50, weight: 20, color: '#F5A623', is_active: true },
  { id: '2', label: '₦100', type: 'cash', amount: 100, weight: 15, color: '#7C3AED', is_active: true },
  { id: '3', label: '₦200', type: 'cash', amount: 200, weight: 10, color: '#06B6D4', is_active: true },
  { id: '4', label: '₦500', type: 'cash', amount: 500, weight: 5, color: '#10B981', is_active: true },
  { id: '5', label: '50 XP', type: 'xp', amount: 50, weight: 20, color: '#F59E0B', is_active: true },
  { id: '6', label: '100 XP', type: 'xp', amount: 100, weight: 15, color: '#8B5CF6', is_active: true },
  { id: '7', label: 'Try again', type: 'none', amount: 0, weight: 10, color: '#374151', is_active: true },
  { id: '8', label: '₦1000', type: 'cash', amount: 1000, weight: 5, color: '#EF4444', is_active: true },
];

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data: segments, error } = await supabase
      .from('wheel_segments')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error || !segments || segments.length === 0) {
      console.warn('Wheel segments not found in DB or error occurred, using defaults:', error);
      return NextResponse.json({ segments: DEFAULT_SEGMENTS });
    }

    return NextResponse.json({ segments });
  } catch (err) {
    console.error('Error fetching wheel segments, falling back to defaults:', err);
    return NextResponse.json({ segments: DEFAULT_SEGMENTS });
  }
}
