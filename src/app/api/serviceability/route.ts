import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/serviceability?pin=110001
 *
 * Answers "can we deliver here?" for the checkout address form, and hands
 * back the city/state for that pin code so the form can fill itself in.
 *
 * Backed by `public.serviceable_pincodes`. That table starts EMPTY, and an
 * empty table means "we ship everywhere" — the store has to work before the
 * merchant has loaded their courier's pin-code list. Once even one row
 * exists the list becomes an allow-list and unlisted pin codes are blocked.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const pin = (new URL(req.url).searchParams.get('pin') ?? '').trim();

  if (!/^[1-9]\d{5}$/.test(pin)) {
    return NextResponse.json(
      { serviceable: false, reason: 'invalid', message: 'Enter a valid 6-digit pin code.' },
      { status: 400 },
    );
  }

  const svc = createServiceClient();

  const { data: row, error } = await svc
    .from('serviceable_pincodes')
    .select('pin_code, city, state, cod, eta_days')
    .eq('pin_code', pin)
    .maybeSingle();

  // Table missing or unreadable — fail OPEN. A serviceability lookup going
  // down must not take checkout down with it.
  if (error) {
    return NextResponse.json({ serviceable: true, reason: 'unverified', etaDays: 7 });
  }

  if (row) {
    return NextResponse.json({
      serviceable: true,
      reason: 'listed',
      city: row.city ?? null,
      state: row.state ?? null,
      cod: row.cod ?? false,
      etaDays: row.eta_days ?? 7,
    });
  }

  // Not listed. Is the list populated at all?
  const { count } = await svc
    .from('serviceable_pincodes')
    .select('pin_code', { count: 'exact', head: true });

  if (!count) {
    return NextResponse.json({ serviceable: true, reason: 'no-list', etaDays: 7 });
  }

  return NextResponse.json({
    serviceable: false,
    reason: 'not-listed',
    message: `We don’t deliver to ${pin} yet. Try another pin code or contact the studio.`,
  });
}
