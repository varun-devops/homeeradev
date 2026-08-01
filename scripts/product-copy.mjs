/**
 * Hand-written product copy, keyed by SKU.
 *
 * The spreadsheet only carries a material and a finish, which makes for very
 * thin product pages. This file supplies real descriptive copy for each
 * piece: what the object actually is, how it is made, and where it works in
 * a room.
 *
 * `scripts/build-catalog.mjs` looks a SKU up here and appends the dimension
 * line from the sheet. Anything missing falls back to the generated
 * template, so adding a new row to the sheet never breaks the build.
 *
 * A note on accuracy: this copy describes the TYPE of object and the
 * craft behind it — brass casting, sand timers, the Lion Capital, gramophone
 * horns. It deliberately makes no claim about provenance, age or awards for
 * any individual piece, because none of that is in the source data.
 */
export const PRODUCT_COPY = {
  // ── A / S Handicrafts — brass marine & decorative ──────────────────
  'HE-ASH-HD-ORN-1001':
    'A tall ship in cast brass on a turned wooden base, rigged with fine brass masts and a raised flag. Model ships like this one began as navigator’s keepsakes and became the classic study-desk ornament — enough detail to reward a close look, enough weight to stay exactly where you put it. The brass is hand-polished, so it will mellow to a softer gold over the years unless you keep it buffed.',
  'HE-ASH-HD-ORN-1002':
    'The same tall-ship silhouette taken down to a matte antique finish, which reads quieter than polished brass and hides fingerprints almost completely. The darker surface pushes the rigging and hull detail forward, so the shape does the work rather than the shine. Good on a bookshelf where a mirror finish would fight the room.',
  'HE-ASH-HD-ORN-1003':
    'The compact ship in the range: same hull and rigging, no flag, and a narrower base that fits a shelf edge or a crowded desk. Polished brass throughout, mounted on wood. The smallest of the three ships, and the easiest one to place.',
  'HE-ASH-HD-TC-1004':
    'A desk clock held in a three-legged wooden tripod, in the manner of the surveyor’s and ship’s instruments the form is borrowed from. The movement is quartz and battery-driven, so it keeps time without winding; the tripod folds the clock face to whatever angle you read it best from. Wood and metal, polished by hand.',
  'HE-ASH-HD-ORN-1005':
    'A hanging sand timer in a hinged brass frame, with hand-blown glass bulbs and fine sand between them. It swings in its yoke, so you flip it by turning the frame rather than lifting the glass — the detail that makes these pleasant to actually use rather than only look at. Antiqued brass, which darkens naturally in the recesses.',
  'HE-ASH-HD-ORN-1006':
    'A thirty-second sand timer suspended in a brass gimbal, with a working compass set into the base. Thirty seconds is the sand-timer interval that stays useful — steeping tea, holding a plank, timing a child brushing their teeth. The compass is a real magnetic dial, not a printed face.',
  'HE-ASH-HD-ORN-1007':
    'A standing desk timer in gold-polished brass with a compass set into the foot. Smaller than the hanging timers and built to sit upright on a desk without a stand. The polished finish keeps it bright against dark wood.',
  'HE-ASH-HD-TC-1008':
    'A brass and glass timepiece made to hang, with an antiqued case and a glazed face. The antique finish is applied and then cut back by hand, so the highlights land on the raised edges and the recesses stay dark. Small enough for a narrow wall or the side of a bookcase.',
  'HE-ASH-HD-TC-1009':
    'A marine-style desk clock in antiqued brass on a wooden plinth, modelled on the bulkhead clocks fitted to ships’ cabins. Heavy for its size, with a glazed bezel over the dial and a quartz movement inside. The wood base lifts the face to reading angle.',
  'HE-ASH-HD-TC-1010':
    'A brass cased clock with an embossed bezel — the pattern is raised from the metal rather than engraved into it, which catches light along the ridges. Polished to a bright finish and sized for a desk or a shelf beside a reading chair.',
  'HE-ASH-HD-TC-1011':
    'A compact brass compass with a liquid-damped card, the type that settles quickly instead of swinging. Polished brass case with a hinged lid. Small enough to live in a coat pocket, handsome enough to leave out on a desk.',
  'HE-ASH-HD-TC-1012':
    'A hanging brass compass in a gimbal mount, so the card stays level however the frame is turned. Polished brass throughout. It reads as an instrument rather than an ornament, which is exactly the appeal.',
  'HE-ASH-HD-ORN-1013':
    'A vintage biplane in polished brass, mounted on a stand so it sits nose-up as though climbing. Cast in parts and assembled by hand — struts, wheels and propeller are separate pieces, not moulded in. A desk object with obvious appeal to anyone who likes early aviation.',
  'HE-ASH-HD-UL-1014':
    'A long-necked brass bell, cast solid with a wooden-topped handle and a proper clapper inside. Long-neck bells ring at a lower, longer note than squat ones because of the extra column of air. Made to be used — on a desk, a dining table, or a shop counter.',
  'HE-ASH-HD-UL-1015':
    'A brass hand bell with an embossed body, the pattern raised from the metal and then polished so the ridges stay bright. Solid cast with a clean, sustained ring. Small enough to sit unnoticed until you want it.',
  'HE-ASH-HD-BDW-1016':
    'A stemmed drinking glass turned from solid brass with an embossed band around the bowl. Lacquered inside so it is food-safe and will not affect what you pour into it. Brass drinkware keeps a drink cold noticeably longer than glass — the metal takes the chill and holds it.',
  'HE-ASH-HD-ORN-1017':
    'A brass desk globe on a meridian ring, with the continents etched into the surface rather than printed on. Spins freely in its cradle. Available in four sizes, from a paperweight up to a proper library piece.',
  'HE-ASH-HD-ORN-1018':
    'A replica candlestick telephone in brass and wood, with the separate earpiece hung on its hook and a working rotary dial. The form dates from the 1900s–1920s, before the handset combined the two halves. Purely decorative, and unmistakable on a hall table or a desk.',

  // ── Heim of Crafts — cast aluminium sculpture ─────────────────────
  'HE-HOC-HD-SCL-1001':
    'A standing figure in cast aluminium, finished in black powder coat — a stoved paint finish that is far harder than a lacquer and will not chip from ordinary handling. The form is abstract enough to read as a silhouette from across a room. Tall, narrow, and best given some space to itself.',
  'HE-HOC-HD-SCL-1002':
    'A cast aluminium figure finished in brass gold, catching light along the polished edges while the recessed areas stay matte. The contrast is what gives the piece its depth. Compact enough for a console or a broad shelf.',
  'HE-HOC-HD-SCL-1003':
    'A prowling panther in cast aluminium under a high-gloss black lacquer. The gloss is what makes it — a matte cat would read as heavy, where the reflection follows the line of the back and shoulder and keeps the whole thing moving. A long, low piece for a sideboard or a mantel.',
  'HE-HOC-HD-SCL-1004':
    'The same prowling panther in a high-gloss red. A deliberately loud object: it works as the single point of colour in an otherwise restrained room, and badly anywhere it has to compete. Cast aluminium under lacquer, long and low.',
  'HE-HOC-HD-SCL-1005':
    'An elephant in cast aluminium, finished black with gold detailing worked into the raised surfaces. Small and solid, with enough weight to serve as a bookend if you want it to. The gold is picked out by hand, so the emphasis falls slightly differently on every casting.',
  'HE-HOC-HD-SCL-1006':
    'A horse in cast aluminium, black with gold detailing along the mane and line of the back. Caught mid-movement rather than standing square, which is what keeps it from looking like a trophy. Sized for a shelf or a desk.',
  'HE-HOC-HD-SCL-1007':
    'A small panther in cast aluminium with an antiqued brass finish — aged in the recesses, brighter along the spine and shoulders. Low and long, so it sits comfortably in front of books rather than beside them.',

  // ── F.K Brothers — plated aluminium on marble ────────────────────
  'HE-FKB-HD-SCL-1001':
    'A falcon with wings swept back, cast in aluminium, gold plated, and mounted on a marble base. The marble does real work here: it grounds a piece whose whole upper half is reaching upward, and stops it feeling top-heavy. Every base is cut from natural stone, so the veining differs piece to piece.',
  'HE-FKB-HD-SCL-1002':
    'An eagle in gold-plated aluminium on marble, wings spread wide. The widest piece in the range and the one that needs the most clear space around it — crowd it and the wings lose their effect. Natural stone base, so no two are marked the same.',
  'HE-FKB-HD-SCL-1003':
    'An abstract figure in gold-plated aluminium on a marble plinth — more suggestion than portrait, which is what lets it sit in a room without dominating the conversation. Tall and narrow. Handsome in a pair at either end of a shelf.',
  'HE-FKB-HD-SCL-1004':
    'A pair of striped wings in gold-plated aluminium, rising from a marble base. The stripes are cast into the form rather than applied, so they catch light as ridges. Broad and low-set, suited to a wide surface.',
  'HE-FKB-HD-SCL-1005':
    'A pair of tall, narrow wing forms in gold-plated aluminium on marble, sold as a set of two. Meant to be placed together — matched but not identical, so they read as a composition rather than a duplicate. Slim footprint for their height.',
  'HE-FKB-HD-SCL-1006':
    'A turtle in gold-plated aluminium, compact and solid, with the shell pattern cast into the surface. Small enough for a coffee table or a desk, heavy enough to hold papers down. One of the easier pieces to place in the range.',
  'HE-FKB-HD-SCL-1007':
    'A crocodile in gold-plated aluminium, long and low with the scale pattern cast along the back. Best on a narrow surface where its length can be read end to end — a hall console or a mantelpiece rather than a square table.',
  'HE-FKB-HD-SCL-1008':
    'A pair of deer in brass-plated aluminium, one standing and one seated, with cut facets across the body that break the light into planes. Sold as a set of two at different heights so they group naturally. The facets are what make them — flat surfaces catching light at different angles.',
  'HE-FKB-HD-SCL-1009':
    'A swan in brass-plated aluminium on a marble base, neck curved back over the body. The largest swan in the range. The marble base is natural stone, cut and polished, so the veining is unique to each piece.',
  'HE-FKB-HD-SCL-1010':
    'Two birds set close together on a shared base, cast in aluminium and brass plated. A quiet piece, and one of the few in the collection that is unmistakably a gift rather than a decoration. Narrow enough for a bedside table.',
  'HE-FKB-HD-SCL-1011':
    'A smaller swan in brass-plated aluminium, wings folded and neck curved. Broader than it is tall, so it settles into a shelf rather than standing up from it. Pairs naturally with the larger swan if you want the two together.',
  'HE-FKB-HD-SCL-1012':
    'A single upswept wing in brass-plated aluminium, the tallest piece in the sculpture range. Cast feather by feather, so the layering holds up at close range as well as across a room. Needs height above it — a low shelf will cut the line short.',

  // ── S.A Handicrafts ──────────────────────────────────────────────
  'HE-SAH-HD-FLP-1001':
    'A hand-hammered flower pot in aluminium with an antiqued brass finish. The dimpling is raised by hand with a ball hammer, one strike at a time, which is why the pattern is even but never mechanical. Sealed inside, so it can hold water and be planted into directly.',
  'HE-SAH-HD-FLP-1002':
    'A tall, narrow flower pot in antiqued aluminium — the proportions of a bud vase rather than a bowl, made for a few long stems instead of a full arrangement. Sealed interior. The antique finish deepens in the recesses over time.',
  'HE-SAH-HD-FLP-1003':
    'A bottle-shaped vase in aluminium with a gold brass finish and stripes worked around the body. The narrow neck holds a small number of stems upright without a frog or tape — the shape does the arranging for you. Sealed inside for water.',
  'HE-SAH-HD-FLP-1004':
    'A rounded flower pot in gold-finished aluminium with a star pattern worked into the surface. Wider than it is tall, so it suits a low, full arrangement or a single plant. Sealed interior, and stable enough not to tip when the top gets heavy.',
  'HE-SAH-HD-ORN-1005':
    'A pair of tree forms in gold-finished aluminium, branches cut and spread by hand so no two spread quite alike. Sold as a set of two at different heights. They read best grouped rather than separated across a room.',
  'HE-SAH-HD-TR-1006':
    'A nesting pair of serving trays in wood and aluminium with a gold finish, one sized inside the other. Deep enough at the rim to carry a full service without sliding, and light enough to lift one-handed. They stack into each other when not in use.',
  'HE-SAH-HD-SCL-1007':
    'A pair of peacocks in gold-finished aluminium, tails fanned and cast in relief. Sold as a set of two. The tail is where the casting shows its quality — the feather detail is picked up cleanly right to the outer edge.',
  'HE-SAH-HD-SCL-1008':
    'Two small swans in gold-finished aluminium, necks curved toward each other. Slim and tall for their footprint, so they fit a narrow shelf or a dressing table. Sold as a pair.',

  // ── A / S Handicrafts — later additions ──────────────────────────
  'HE-ASH-HD-UL-1019':
    'A replica of a ceiling-mounted antique fan, in gold-finished metal and wood, made as a display piece rather than a working appliance. The largest object in the collection by some margin. It suits a high shelf or a wall mount where its scale is an asset instead of a problem.',
  'HE-ASH-HD-SCL-1020':
    'A frog cast in brass and finished in verdigris green over gold, with a bell mechanism inside. Verdigris is the blue-green patina copper alloys take on as they age; here it is induced deliberately and then cut back so gold shows on the high points. Small, heavy and genuinely functional.',
  'HE-ASH-HD-ORN-1021':
    'The largest ship in the collection: a full-rigged sailing vessel in polished brass on a wooden base, flag raised. Broad enough to hold a mantel or a hall console on its own. Assembled by hand from cast and drawn brass, with the rigging strung individually.',
  'HE-ASH-HD-ORN-1022':
    'The Lion Capital of Ashoka in polished brass — four lions standing back to back above a drum bearing the Ashoka Chakra, from the pillar erected at Sarnath in the third century BCE. It is the State Emblem of India. This is the largest of the three pillar sizes.',
  'HE-ASH-HD-ORN-1023':
    'The Lion Capital of Ashoka in polished brass, in the middle of the three pillar heights. Four lions back to back over the chakra drum, cast in one piece and finished by hand so the manes hold their detail. Traditionally displayed on a desk or a mantel.',
  'HE-ASH-HD-ORN-1023-2':
    'The smallest of the three full pillars: the Lion Capital of Ashoka in polished brass, at a size that suits a bookshelf or a bedside table. Same casting detail as the larger two, in a footprint that fits almost anywhere.',
  'HE-ASH-HD-ORN-1024':
    'A compact Ashoka capital in polished brass — the short-pillar version, standing on a plain drum rather than a full column. This is the largest of the three compact sizes. Solid brass, hand-polished.',
  'HE-ASH-HD-ORN-1025':
    'The Ashoka capital in polished brass, medium size in the compact range. Small enough for a desk without becoming a paperweight, detailed enough to hold up at arm’s length.',
  'HE-ASH-HD-ORN-1026':
    'The smallest Ashoka capital in the collection, in polished brass. A pocket-sized version of the national emblem — often given as a keepsake or a desk marker rather than displayed as a centrepiece.',
  'HE-ASH-HD-ORN-1027':
    'A replica gramophone in brass on a wooden base, with a flared horn and a turntable that spins by hand. The horn is the whole point of the form: before electrical amplification, that cone was the only thing making a record audible. Decorative rather than playable.',
  'HE-ASH-HD-ORN-1028':
    'A small three-wheeled aeroplane in polished brass, cast in parts and assembled so the propeller, struts and undercarriage read separately. The smallest of the aviation pieces. A desk object that fits in a palm.',
  'HE-ASH-HD-ORN-1029':
    'A sailing ship in polished brass mounted inside a circular frame — the round surround crops the rigging like a porthole view and makes the piece read flatter than the free-standing ships. The smallest of the three circle-mounted ships. Wood and brass.',
  'HE-ASH-HD-ORN-1030':
    'The middle size of the circle-mounted ships: a full-rigged vessel in polished brass set inside a round frame, on a wooden base. Broad enough to stand alone on a shelf without looking lost.',
  'HE-ASH-HD-ORN-1031':
    'The largest of the circle-mounted ships, in polished brass throughout. The frame carries the rigging out to its full width, which is what makes this size the most striking of the three. A mantel piece rather than a shelf one.',

  // ── Azmi Handicrafts ─────────────────────────────────────────────
  'HE-AZH-HD-FL-1001':
    'A floor lamp turned from solid wood with a natural polished finish that leaves the grain visible. Tall and narrow-footed, made to stand beside a chair rather than in the open. Wired to Indian standards and supplied ready to plug in; takes a standard screw-fit bulb.',
  'HE-AZH-HD-PLB-1002':
    'The larger of the two planter bodies, in wood and metal with a natural polished finish. Built around a removable liner, so the wood never sits in standing water — the single detail that decides whether a wooden planter lasts a year or a decade. Sold as part of a nesting set of two.',
  'HE-AZH-HD-PLS-1003':
    'The smaller planter body in the ivory white colourway, in wood and metal. Nests inside the larger planter or stands alone. Removable liner inside, so watering never reaches the timber.',
  'HE-AZH-HD-PLB-1004':
    'The larger planter body finished in black, in wood and metal. The dark finish suits foliage plants better than flowering ones — green reads sharply against it where colour tends to fight. Removable inner liner.',
  'HE-AZH-HD-PLS-1005':
    'The smaller planter body in black, wood and metal. Pairs with the large black planter as a nesting set, or stands on its own on a windowsill or side table. Removable liner inside.',
  'HE-AZH-HD-PLB-1006':
    'The larger planter body in a soft grey finish, wood and metal. Grey is the most forgiving of the three colourways — it sits under almost any planting without competing. Removable inner liner keeps water off the timber.',
  'HE-AZH-HD-PLS-1007':
    'The smaller planter body in soft grey, wood and metal, with a removable liner. Nests with the large grey planter or works alone for a single small plant.',
};
