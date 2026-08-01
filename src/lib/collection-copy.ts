/**
 * Short editorial lines for the collection and sub-collection decks.
 *
 * The sub-collection card deck shows a sentence or two under each name, the
 * way a range would be introduced in a printed catalogue. Keyed by slug so a
 * renamed label doesn't silently blank the copy.
 *
 * Anything without an entry simply renders without a line — the deck reads
 * fine on the name alone, so a new sub-collection added to the sheet never
 * blocks a build.
 */
export const SUB_COLLECTION_COPY: Record<string, string> = {
  sculptures:
    'Cast, hand-worked and mounted — birds, big cats and abstract forms in plated aluminium, most set on natural marble. The pieces with enough presence to anchor a room on their own.',
  ornaments:
    'Brass objects made to be picked up and turned over: tall ships, sand timers, globes, gramophones and the Lion Capital. Small, deliberate things for a shelf, console or desk.',
  'table-clocks':
    'Working timepieces built the old way — quartz movements set into solid, weighted brass and wood cases, several modelled on the clocks and compasses fitted to ships’ cabins.',
  'flower-pots':
    'Hand-hammered aluminium in antique and gold finishes, sealed inside so they hold water. Sized for a few cut stems or a single plant rather than a full arrangement.',
  'utility-living':
    'Brass pieces made to be handled every day and to look better for it — bells with a proper clapper, and a fan built at display scale.',
  planters:
    'Wood and metal bodies in three colourways and two sizes, built around a removable liner so the timber never sits in standing water.',
  'brass-drinkware':
    'Solid brass turned into drinking vessels and lacquered food-safe inside. Brass holds a chill noticeably longer than glass.',
  trays:
    'Nesting wood and aluminium trays in a gold finish — deep enough at the rim to carry a full service, light enough to lift one-handed.',
  'floor-lamps':
    'Turned from solid wood with the grain left visible, wired to Indian standards and supplied ready to plug in. Made to stand beside a chair.',
};

/** One line introducing each top-level collection. */
export const COLLECTION_COPY: Record<string, string> = {
  'home-decor':
    'The heart of the range — brass, aluminium and marble objects for shelves, consoles and desks.',
  'home-garden': 'Planters built to live with plants, indoors or on a balcony.',
  'bar-entertaining': 'Brass for the bar cart and the table.',
  'home-kitchen': 'Serving pieces made to be carried and used.',
  lighting: 'Light sources turned from solid wood.',
};
