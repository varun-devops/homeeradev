/**
 * Shown while an admin route's server component is fetching.
 *
 * Next streams this in automatically on navigation. Without it a click on
 * the nav did nothing visible until the new page's data arrived, which on a
 * slow connection reads as a dead link and invites a second click.
 */
export default function AdminLoading() {
  return (
    <div style={{ padding: '1rem 0' }} role="status" aria-label="Loading">
      <div
        style={{
          height: '2rem',
          width: 'min(14rem, 60%)',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          marginBottom: '2rem',
        }}
      />
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          style={{
            height: '3.25rem',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.03)',
            marginBottom: '0.6rem',
          }}
        />
      ))}
    </div>
  );
}
