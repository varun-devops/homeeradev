import type { Metadata } from 'next';
import {
  products,
  categoriesList,
  collectionsWithChildren,
  type Category,
} from '@/lib/products';
import ShopFilterDeck from '@/components/ShopFilterDeck';

export const metadata: Metadata = {
  title: 'Shop — Considered objects for the home',
  description:
    'Browse Homeera home decor and home & garden pieces — ornaments, table clocks, sculpture, pots & planters. Small-batch, slow-made, built to repair.',
  alternates: { canonical: '/shop' },
};

type SearchParams = { cat?: string };

/**
 * Shop page.
 *
 * Layout follows the Resn-style filter deck supplied in the brief:
 *   • A large headline with the active category name and a chevron;
 *     clicking the chevron opens a full-page dropdown listing every
 *     other category in muted display type. Hover a category to
 *     activate it.
 *   • Beneath the headline, the page is a vertical scroller of
 *     full-bleed product cards in a 2-up grid (1-up on mobile),
 *     with a "Close all projects" affordance on the right.
 *
 * All animation + interactivity lives in <ShopFilterDeck>, which is a
 * client component. Page-level data (products + active filter) is
 * resolved server-side here from the `?cat=` query.
 */
export default function ShopPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // `cat` may be a sub-collection slug (e.g. ?cat=ornaments) — only treat
  // it as active if it is a real one, otherwise fall back to "all".
  const requested = searchParams?.cat as Category | undefined;
  const active = categoriesList.some((c) => c.slug === requested)
    ? (requested as Category)
    : null;
  const visible = active
    ? products.filter((p) => p.category === active)
    : products;

  return (
    <ShopFilterDeck
      active={active}
      categories={categoriesList}
      groups={collectionsWithChildren}
      products={visible}
    />
  );
}
