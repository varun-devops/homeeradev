import SavingBar from '@/components/admin/SavingBar';

/**
 * Shown while an admin route's server component is fetching.
 *
 * Deliberately just the top bar, not a skeleton. This boundary covers every
 * page under /admin, and it also shows during the router.refresh() that
 * follows a save — so a skeleton here blanked the whole content area on
 * every navigation and made "stay on the page after saving" look like a
 * page change anyway. A 2px bar says "working" without taking the page
 * away from you.
 */
export default function AdminLoading() {
  return <SavingBar active />;
}
