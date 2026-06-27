import type { Metadata } from 'next';
import { collectionsWithChildren, products } from '@/lib/products';
import ShopCollectionDeck from '@/components/ShopFilterDeck';

export const metadata: Metadata = {
  title: 'Shop — Considered objects for the home',
  description:
    'Browse Homeera home decor and home & garden pieces — ornaments, table clocks, sculpture, pots & planters. Small-batch, slow-made, built to repair.',
  alternates: { canonical: '/shop' },
};

/**
 * Shop page.
 *
 * The shop is a full-screen, vertically-swiped deck of *collection* cards
 * (Home Decor / Home & Garden), each a full-bleed photo. Tapping a card
 * expands it in place to reveal that collection's products as cards — no
 * route change. All interactivity lives in <ShopCollectionDeck>.
 *
 * Products are passed grouped under their collection so the deck can show
 * the right pieces inside each expanded card.
 */
export default function ShopPage() {
  return (
    <ShopCollectionDeck groups={collectionsWithChildren} products={products} />
  );
}
