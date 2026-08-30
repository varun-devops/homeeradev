/**
 * A vertical double-headed arrow, parked on the right edge of a full-screen
 * card, saying the deck scrolls up and down.
 *
 * It replaces the dot rail and the next-panel chevron that used to do this
 * job between them. One mark instead of two, and it states the axis rather
 * than the position — position is what the counter on the left edge is for.
 *
 * Purely decorative, so aria-hidden: the scroll it describes is already
 * available to a keyboard and a screen reader without it.
 */
export default function ScrollHint({ className }: { className?: string }) {
  return (
    <span className={className ? `heScrollHint ${className}` : 'heScrollHint'} aria-hidden="true">
      <svg width="14" height="46" viewBox="0 0 14 46" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        {/* up head */}
        <polyline points="3 6 7 2 11 6" />
        {/* shaft */}
        <line x1="7" y1="2" x2="7" y2="44" />
        {/* down head */}
        <polyline points="3 40 7 44 11 40" />
      </svg>
    </span>
  );
}
