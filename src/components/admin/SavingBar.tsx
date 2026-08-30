/**
 * Thin progress bar pinned to the top of the viewport while an admin action
 * is in flight.
 *
 * A disabled button reading "Saving…" is easy to miss when the button is
 * below the fold on a long form, which is where the Save button sits on the
 * product page. This is always in view — and deliberately nothing more than
 * a 2px line, so it never takes the page away from you the way a skeleton
 * does.
 *
 * Indeterminate on purpose: a server action gives no progress to report, and
 * a bar that pretends to know how far along it is reads as broken when it
 * sits at 80% waiting.
 *
 * The CSS lives in the admin layout's stylesheet rather than here, so the
 * keyframes are defined once no matter how many of these are on screen —
 * the route-level loading boundary and a form can both be showing one.
 */
export default function SavingBar({ active = true }: { active?: boolean }) {
  if (!active) return null;
  return <div className="adminSaving" role="status" aria-label="Saving" />;
}
