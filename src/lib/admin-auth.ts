import { createClient } from '@/lib/supabase/server';

/**
 * Admin-area roles.
 *   admin → full access to every admin section.
 *   staff → products only (create/edit/delete) + read-only Users/Dashboard.
 * Anyone else is not allowed into /admin at all.
 */
export type AdminRole = 'admin' | 'staff';

/**
 * The /admin path prefixes a staff user may reach. Everything else
 * (collections, orders, and any future admin-only area) is admin-only.
 * Shared by the middleware and the admin layout so there is one rule.
 */
export const STAFF_ALLOWED_PREFIXES = [
  '/admin/products',
  '/admin/users',
  '/admin/account',
] as const;

/** Is this /admin pathname reachable by a staff user? */
export function staffMayAccess(pathname: string): boolean {
  // Bare dashboard is fine; deeper paths must match an allowed prefix.
  if (pathname === '/admin' || pathname === '/admin/') return true;
  return STAFF_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export type AdminIdentity = {
  userId: string;
  email: string;
  fullName: string | null;
  role: AdminRole;
};

/**
 * Resolves the signed-in user's admin identity, or null if they are not
 * signed in or not a member of staff/admin.
 *
 * Backward compatible: a profile with is_admin=true is treated as 'admin'
 * even if the role column is missing/stale, so existing admins never lock
 * themselves out.
 */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: profile } = await sb
    .from('profiles')
    .select('role, is_admin, email, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  const role: AdminRole | null = profile.is_admin
    ? 'admin'
    : profile.role === 'staff'
      ? 'staff'
      : profile.role === 'admin'
        ? 'admin'
        : null;

  if (!role) return null;

  return {
    userId: user.id,
    email: profile.email ?? user.email ?? '',
    fullName: profile.full_name ?? null,
    role,
  };
}
