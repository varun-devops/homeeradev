import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications
 * Returns the signed-in user's recent notifications + unread count.
 * Used by the header bell (polled client-side). Returns empty for guests.
 */
export async function GET() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ unread: 0, items: [] });

  const { data } = await sb
    .from('notifications')
    .select('id, title, body, is_read, created_at, order_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(12);

  const items = data ?? [];
  const unread = items.filter((n) => !n.is_read).length;
  return NextResponse.json({ unread, items });
}
