import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase talks to PostgREST over the global `fetch`, and Next.js replaces
 * that global with a caching wrapper. Left alone, a catalogue read gets
 * stored in the Next Data Cache and the deployed site keeps serving that
 * snapshot — for as long as the cache entry lives — no matter what the
 * database actually says.
 *
 * That is not theoretical: it shipped a shop page rendering all 66 products
 * under a single collection, sourcing an image from a row that had since
 * been deactivated, while the database held the correct five collections.
 * `export const dynamic = 'force-dynamic'` on the page did NOT prevent it.
 *
 * Every Supabase read here is live data by definition, so opt out
 * explicitly rather than relying on route-segment config to imply it.
 */
const freshFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

/**
 * Server-side Supabase client bound to the request cookies (anon key,
 * RLS-enforced). Use in Server Components, Route Handlers, and Server
 * Actions to read/write as the logged-in user.
 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: freshFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware
            // refreshes the session cookie.
          }
        },
      },
    },
  );
}

/**
 * Service-role client (bypasses RLS). SERVER ONLY — never import into a
 * client component. Used for admin operations, catalogue import, and
 * payment capture.
 */
export function createServiceClient() {
  const { createClient: createSb } = require('@supabase/supabase-js');
  return createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      // See freshFetch above — the catalogue must never be served from
      // Next's Data Cache.
      global: { fetch: freshFetch },
    },
  );
}
