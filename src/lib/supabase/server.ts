import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CATALOG_TAG } from '@/lib/cache-tags';

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
 * So reads opt out explicitly rather than relying on route-segment config
 * to imply it. Two flavours:
 *
 *   freshFetch    — never cached. The default, and correct for anything
 *                   per-user or admin-facing (carts, orders, payments).
 *
 *   catalogFetch  — cached, but TAGGED. The catalogue is the same for every
 *                   visitor, so serving it per-request was a Supabase round
 *                   trip on every page view. Tagging it means an admin write
 *                   can flush it by name, which is what the earlier stale
 *                   snapshot had no way to do.
 *
 * `no-store` also forces a route to render dynamically — even inside
 * unstable_cache — so the catalogue pages could not be prerendered at all
 * while every read used freshFetch.
 */
const freshFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' });

const catalogFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'force-cache', next: { tags: [CATALOG_TAG] } });

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
  return serviceClientWith(freshFetch);
}

/**
 * Service-role client for CATALOGUE reads only. SERVER ONLY.
 *
 * Its fetches land in the Data Cache under CATALOG_TAG, so they survive
 * between requests and are dropped the moment an admin write calls
 * revalidateTag. Never use it for per-user or order data — that must not be
 * shared between visitors.
 */
export function createCatalogClient() {
  return serviceClientWith(catalogFetch);
}

function serviceClientWith(fetchImpl: typeof fetch) {
  const { createClient: createSb } = require('@supabase/supabase-js');
  return createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchImpl },
    },
  );
}
