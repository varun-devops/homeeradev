/**
 * Reference-counted body scroll lock.
 *
 * Two different overlays (the header's mobile drawer, the shop deck) each
 * used to set `document.body.style.overflow = 'hidden'` directly and clear
 * it back to '' on their own way out. That's safe in isolation, but not
 * when either lock can be released while it isn't actually the last one
 * holding the door shut — release B point after acquire A can stomp A's
 * lock, or a release can fire after some *other* effect already cleared it,
 * writing '' over a lock that should still be held. A plain boolean flag
 * cannot tell those cases apart; a count can.
 *
 * lock() returns an unlock function — call it exactly once, typically from
 * a useEffect cleanup. Safe to call lock() more times than there are
 * overlays open; unlock() only clears the style once the count reaches 0.
 */
let count = 0;

export function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  count += 1;
  document.body.style.overflow = 'hidden';
  let released = false;
  return () => {
    if (released) return; // guard against a double-invoked cleanup
    released = true;
    count = Math.max(0, count - 1);
    if (count === 0) document.body.style.overflow = '';
  };
}

/**
 * Force scroll open regardless of the count. Used as a safety net on
 * navigation: whatever the previous page left locked, arriving at a new
 * page should never inherit a scroll-disabled body.
 */
export function forceUnlockScroll(): void {
  if (typeof document === 'undefined') return;
  count = 0;
  document.body.style.overflow = '';
}
