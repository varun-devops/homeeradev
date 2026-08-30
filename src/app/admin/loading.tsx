import AdminLoader from '@/components/admin/AdminLoader';

/**
 * Shown while an admin route's server component is fetching.
 *
 * This boundary covers every page under /admin and also runs during the
 * router.refresh() after a save, so it must not replace the page: an
 * earlier skeleton here blanked the content area on every navigation and
 * made "stay on the page after saving" look like a page change anyway.
 * The overlay leaves the page in place, blurred.
 */
export default function AdminLoading() {
  return <AdminLoader />;
}
