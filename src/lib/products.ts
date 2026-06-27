/**
 * Catalogue model.
 *
 * The shop is organised in two tiers:
 *
 *   Collection            →  Sub-collection         →  Product
 *   ───────────────────      ──────────────────────    ─────────────
 *   HOME DECOR               Ornaments                 …items
 *                            Table Clock
 *                            Sculpture
 *   HOME & GARDEN            Pots & Planter            …items
 *
 * The home page deck and the shop filter both surface the *sub-
 * collections* as the browsable cards (Ornaments, Table Clock, …),
 * grouped under their parent collection. A product always belongs to
 * exactly one sub-collection, and through it to one collection.
 *
 * `slug` values are URL-safe and are what the shop reads from
 * `?cat=<slug>` to filter the grid.
 */

// Top-level groupings.
export type CollectionSlug = 'home-decor' | 'home-garden';

// The browsable cards — every product hangs off one of these.
export type SubCollectionSlug =
  | 'ornaments'
  | 'table-clock'
  | 'sculpture'
  | 'pots-planter';

// `Category` is kept as an alias of the sub-collection slug so the rest
// of the app (shop filter `?cat=`, product `.category`) keeps reading
// the same field name while the meaning is now "sub-collection".
export type Category = SubCollectionSlug;

export type Product = {
  id: string;
  name: string;
  price: number;
  /** The sub-collection this product belongs to. */
  category: SubCollectionSlug;
  blurb: string;
  /** Tonal accent used for the gradient card background (until photos). */
  tone: string;
  maker: string;
};

export type SubCollection = {
  slug: SubCollectionSlug;
  label: string;
  /** One-line caption shown over the card. */
  caption: string;
  /** Longer descriptive copy. */
  copy: string;
  /** Parent collection. */
  collection: CollectionSlug;
  /** Gradient tone used as the full-bleed card background for now. */
  tone: string;
  /** Accent colour for eyebrows / borders on this card. */
  accent: string;
};

export type Collection = {
  slug: CollectionSlug;
  label: string;
  copy: string;
};

// ──────────────────────────────────────────────────────────────────
// Collections (top level)
// ──────────────────────────────────────────────────────────────────
export const collections: Collection[] = [
  { slug: 'home-decor', label: 'Home Decor', copy: 'Objects that mark a slower kind of attention.' },
  { slug: 'home-garden', label: 'Home & Garden', copy: 'Things that weather slowly, indoors and out.' },
];

// ──────────────────────────────────────────────────────────────────
// Sub-collections (the browsable cards)
// ──────────────────────────────────────────────────────────────────
export const subCollections: SubCollection[] = [
  {
    slug: 'ornaments',
    label: 'Ornaments',
    caption: 'Framed quiet',
    copy: 'Small objects and vessels that hold a corner of the room together.',
    collection: 'home-decor',
    tone: 'linear-gradient(140deg, rgba(212,181,116,0.22), rgba(20,20,20,0.95))',
    accent: '#e8c885',
  },
  {
    slug: 'table-clock',
    label: 'Table Clock',
    caption: 'How the hours land',
    copy: 'Quiet timepieces for the mantel, the desk, the bedside.',
    collection: 'home-decor',
    tone: 'linear-gradient(140deg, rgba(212,181,116,0.28), rgba(20,20,20,0.95))',
    accent: '#f0d090',
  },
  {
    slug: 'sculpture',
    label: 'Sculpture',
    caption: 'Form, held still',
    copy: 'Hand-finished pieces that draw the eye and slow the room.',
    collection: 'home-decor',
    tone: 'linear-gradient(140deg, rgba(212,181,116,0.16), rgba(20,20,20,0.95))',
    accent: '#d4b574',
  },
  {
    slug: 'pots-planter',
    label: 'Pots & Planter',
    caption: 'Patio calm',
    copy: 'Hand-thrown vessels and planters that age gracefully.',
    collection: 'home-garden',
    tone: 'linear-gradient(140deg, rgba(212,181,116,0.20), rgba(20,20,20,0.95))',
    accent: '#cba36a',
  },
];

// ──────────────────────────────────────────────────────────────────
// Products — each mapped to a sub-collection above.
// ──────────────────────────────────────────────────────────────────
export const products: Product[] = [
  // ——— Ornaments ———
  { id: 'stoneware-vessel-sm', name: 'Stoneware Vessel — Small', price: 64, category: 'ornaments', tone: '#cfc3a5', maker: 'Ines Pottery', blurb: 'Wheel-thrown, salt-glazed, signed at the base.' },
  { id: 'brass-tray-round', name: 'Brass Tray — Round', price: 110, category: 'ornaments', tone: '#e6cf99', maker: 'Foundry No. 4', blurb: 'Solid brass, beaten edge, develops a soft patina.' },
  { id: 'arched-mirror-ash', name: 'Arched Mirror — Ash', price: 320, category: 'ornaments', tone: '#cdc6b0', maker: 'Mira & Co.', blurb: 'Ash frame, low-iron glass, mounted with brass.' },
  { id: 'wool-cushion-clay', name: 'Wool Cushion — Clay', price: 96, category: 'ornaments', tone: '#d8b89c', maker: 'Atelier Nui', blurb: 'Carded wool, undyed, with reclaimed-down fill.' },

  // ——— Table Clock ———
  { id: 'brass-table-clock', name: 'Brass Table Clock', price: 198, category: 'table-clock', tone: '#e6cf99', maker: 'Workshop 19', blurb: 'Spun-brass case, silent sweep movement, glass dome.' },
  { id: 'travertine-mantel-clock', name: 'Travertine Mantel Clock', price: 240, category: 'table-clock', tone: '#d8c19a', maker: 'Studio Lara', blurb: 'Solid travertine block, brushed-steel hands.' },
  { id: 'oak-desk-clock', name: 'Oak Desk Clock', price: 132, category: 'table-clock', tone: '#dccba7', maker: 'Bjørn Bjornsson', blurb: 'Turned European oak, hand-oiled, quiet quartz.' },

  // ——— Sculpture ———
  { id: 'alabaster-form-i', name: 'Alabaster Form I', price: 380, category: 'sculpture', tone: '#cfc7b5', maker: 'Mira & Co.', blurb: 'Hand-carved alabaster, softly translucent at the edge.' },
  { id: 'bronze-figure-study', name: 'Bronze Figure — Study', price: 520, category: 'sculpture', tone: '#c9a96a', maker: 'Foundry No. 4', blurb: 'Lost-wax cast bronze, warm hand-rubbed patina.' },
  { id: 'ceramic-totem-tall', name: 'Ceramic Totem — Tall', price: 290, category: 'sculpture', tone: '#cfc3a5', maker: 'Ines Pottery', blurb: 'Stacked stoneware, matte-white glaze, signed.' },

  // ——— Pots & Planter ———
  { id: 'terracotta-planter', name: 'Terracotta Planter', price: 72, category: 'pots-planter', tone: '#c9a78c', maker: 'Tomas Bisset', blurb: 'Hand-thrown terracotta, frost-fired, drains well.' },
  { id: 'glazed-pot-sage', name: 'Glazed Pot — Sage', price: 96, category: 'pots-planter', tone: '#b9c8a4', maker: 'Ines Pottery', blurb: 'Reactive sage glaze, sealed interior, footed base.' },
  { id: 'stone-trough-planter', name: 'Stone Trough Planter', price: 168, category: 'pots-planter', tone: '#aebfa1', maker: 'Tomas Bisset', blurb: 'Cast stone trough, weathers to a soft lichen grey.' },
];

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

/** Sub-collections grouped under their parent collection, in order. */
export const collectionsWithChildren: {
  collection: Collection;
  children: SubCollection[];
}[] = collections.map((collection) => ({
  collection,
  children: subCollections.filter((s) => s.collection === collection.slug),
}));

/** Flat list of sub-collections — used by the shop filter dropdown. */
export const categoriesList: { slug: Category; label: string; copy: string }[] =
  subCollections.map((s) => ({ slug: s.slug, label: s.label, copy: s.copy }));

/** Look up a sub-collection by slug. */
export function getSubCollection(slug: string): SubCollection | undefined {
  return subCollections.find((s) => s.slug === slug);
}
