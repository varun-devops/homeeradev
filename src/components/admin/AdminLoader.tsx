/**
 * Centred loading overlay for the admin panel.
 *
 * Sits over the page rather than replacing it: the content stays where it
 * was, blurred, so you can still see what you were working on and the
 * layout never jumps. That is the difference from a skeleton, which blanked
 * the whole content area and read as a page change.
 *
 * Used both by the route-level loading boundary and by in-page saves, so
 * navigating and saving look the same.
 *
 * The CSS lives in the admin layout's stylesheet — the route boundary and a
 * form can both mount one at the same moment, and defining the keyframes
 * per component would duplicate them.
 */
export default function AdminLoader({
  active = true,
  label = 'Loading',
}: {
  active?: boolean;
  label?: string;
}) {
  if (!active) return null;
  return (
    <div className="adminLoader" role="status" aria-live="polite" aria-label={label}>
      <div className="adminLoader-ring" aria-hidden="true" />
    </div>
  );
}
