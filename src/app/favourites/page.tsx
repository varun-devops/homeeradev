import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/format';
import FavouriteButton from '@/components/FavouriteButton';

export const metadata: Metadata = { title: 'Favourites' };
export const dynamic = 'force-dynamic';

type FavRow = {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    image_url: string | null;
    vendor: string | null;
  } | null;
};

export default async function FavouritesPage() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/auth/login?next=/favourites');

  const { data } = await sb
    .from('favourites')
    .select('product:products(id, name, slug, price, image_url, vendor)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const items = (((data as unknown) as FavRow[]) ?? []).filter((r) => r.product);

  return (
    <main className="container" style={{ padding: '8rem 0 4rem', minHeight: '70svh' }}>
      <h1 style={{ fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3rem)' }}>Favourites</h1>

      {items.length === 0 ? (
        <div style={{ marginTop: '2rem', color: 'var(--ink-soft)' }}>
          <p>You haven&apos;t saved anything yet.</p>
          <Link href="/shop" data-hover style={browseLink}>Browse the shop →</Link>
        </div>
      ) : (
        <div
          style={{
            marginTop: '2.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
            gap: 'clamp(1.5rem, 3vw, 2.5rem)',
          }}
        >
          {items.map((r) => {
            const p = r.product!;
            return (
              <div key={p.id} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
                  <FavouriteButton productId={p.id} initial variant="icon" />
                </div>
                <Link href={`/shop/${p.slug}`} data-hover>
                  <div style={{ aspectRatio: '4 / 5', borderRadius: 8, overflow: 'hidden', background: '#15140f' }}>
                    {p.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div style={{ marginTop: '0.85rem', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', letterSpacing: '0.16em', textTransform: 'uppercase' }}>{p.name}</p>
                    {p.vendor && <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>{p.vendor}</p>}
                    <p style={{ margin: '0.3rem 0 0', color: 'var(--gold)' }}>{formatINR(p.price)}</p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

const browseLink: React.CSSProperties = {
  marginTop: '1rem',
  display: 'inline-block',
  borderBottom: '1px solid var(--ink)',
  paddingBottom: '0.2rem',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  fontSize: '0.82rem',
};
