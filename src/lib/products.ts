export type Category = 'living' | 'decor' | 'lighting' | 'outdoor';

export type Product = {
  id: string;
  name: string;
  price: number;
  category: Category;
  blurb: string;
  tone: string;
  maker: string;
};

export const products: Product[] = [
  { id: 'linen-throw-mist', name: 'Linen Throw — Mist', price: 148, category: 'living', tone: '#cdd9b8', maker: 'Studio Lara', blurb: 'Stonewashed Belgian linen, woven in slow batches.' },
  { id: 'oak-side-table', name: 'Oak Side Table', price: 480, category: 'living', tone: '#dccba7', maker: 'Bjørn Bjornsson', blurb: 'A single piece of European oak, hand-oiled.' },
  { id: 'wool-cushion-clay', name: 'Wool Cushion — Clay', price: 96, category: 'living', tone: '#d8b89c', maker: 'Atelier Nui', blurb: 'Carded wool, undyed, with reclaimed-down fill.' },
  { id: 'stoneware-vessel-sm', name: 'Stoneware Vessel — Small', price: 64, category: 'decor', tone: '#cfc3a5', maker: 'Ines Pottery', blurb: 'Wheel-thrown, salt-glazed, signed at the base.' },
  { id: 'brass-tray-round', name: 'Brass Tray — Round', price: 110, category: 'decor', tone: '#e6cf99', maker: 'Foundry No. 4', blurb: 'Solid brass, beaten edge, develops a soft patina.' },
  { id: 'arched-mirror-ash', name: 'Arched Mirror — Ash', price: 320, category: 'decor', tone: '#cdc6b0', maker: 'Mira & Co.', blurb: 'Ash frame, low-iron glass, mounted with brass.' },
  { id: 'paper-lantern-warm', name: 'Paper Lantern — Warm', price: 88, category: 'lighting', tone: '#e9d6a8', maker: 'Tanaka Studio', blurb: 'Bamboo ribs, washi paper, 2700K bulb included.' },
  { id: 'reading-lamp-bronze', name: 'Reading Lamp — Bronze', price: 245, category: 'lighting', tone: '#c9a96a', maker: 'Workshop 19', blurb: 'Articulating brass arm, hand-spun shade.' },
  { id: 'wall-sconce-pair', name: 'Wall Sconce — Pair', price: 410, category: 'lighting', tone: '#d8c19a', maker: 'Workshop 19', blurb: 'Soft uplight in cast brass, hardwired or plug-in.' },
  { id: 'terracotta-planter', name: 'Terracotta Planter', price: 72, category: 'outdoor', tone: '#c9a78c', maker: 'Tomas Bisset', blurb: 'Hand-thrown terracotta, frost-fired, drains well.' },
  { id: 'teak-bench-2m', name: 'Teak Bench — 2m', price: 980, category: 'outdoor', tone: '#b9c8a4', maker: 'Bjørn Bjornsson', blurb: 'FSC teak, mortise-and-tenon, weathers to silver.' },
  { id: 'garden-shears', name: 'Garden Shears', price: 64, category: 'outdoor', tone: '#aebfa1', maker: 'Sasaki & Sons', blurb: 'Hand-forged steel, ash handle, sharpened sharp.' },
];

export const categoriesList: { slug: Category; label: string; copy: string }[] = [
  { slug: 'living', label: 'Living', copy: 'Soft, slow rooms.' },
  { slug: 'decor', label: 'Decor', copy: 'Quiet objects to live with.' },
  { slug: 'lighting', label: 'Lighting', copy: 'Holding the evening.' },
  { slug: 'outdoor', label: 'Outdoor', copy: 'Garden and patio things.' },
];
