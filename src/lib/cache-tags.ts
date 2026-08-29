/**
 * Cache tags shared between the read paths and the writes that invalidate
 * them. Lives in its own module so lib/supabase/server.ts can tag its fetches
 * without importing lib/catalog.ts, which imports the client back.
 */

/**
 * Everything catalogue-shaped: products, collections, sub-collections.
 *
 * Both caching layers are keyed to this one tag —
 *   1. the `unstable_cache` wrappers in lib/catalog.ts, and
 *   2. the underlying Supabase fetches, tagged in createCatalogClient()
 * — so a single `revalidateTag(CATALOG_TAG)` from an admin write flushes the
 * whole chain. That is the fix for the stale-catalogue bug: the old Data
 * Cache entries were not stale because caching is wrong, but because nothing
 * could name them to invalidate them.
 */
export const CATALOG_TAG = 'catalog';
