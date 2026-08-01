import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/** Hard ceiling on any Supabase call made from the edge. Vercel kills the
 *  whole invocation if middleware stalls, which turns one slow auth request
 *  into a site-wide 504. Failing fast degrades /admin instead. */
const AUTH_TIMEOUT_MS = 3000;

function isAdminPath(path: string): boolean {
  return path.startsWith('/admin') && !path.startsWith('/admin/login');
}

// Which /admin paths a staff user may reach. MUST mirror staffMayAccess()
// in src/lib/admin-auth.ts — kept inline so the Edge bundle stays free of
// the server-only Supabase client that admin-auth.ts imports.
const STAFF_ALLOWED_PREFIXES = ['/admin/products', '/admin/users', '/admin/account'];
function staffMayAccessEdge(path: string): boolean {
  if (path === '/admin' || path === '/admin/') return true;
  return STAFF_ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Expose the current path to server components (the admin layout uses it to
  // skip its chrome on the login page). Headers on the incoming request are
  // immutable, so this has to go through a fresh Headers instance.
  const headers = new Headers(request.headers);
  headers.set('x-pathname', path);

  let response = NextResponse.next({ request: { headers } });

  // Only the admin area needs an authenticated user. Every other route paid a
  // blocking round-trip to Supabase's auth API for a value it never read.
  if (!isAdminPath(path)) return response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Missing env in prod would otherwise leave the client fetching `undefined/...`
  // until the invocation times out.
  if (!url || !anonKey) {
    const login = request.nextUrl.clone();
    login.pathname = '/admin/login';
    login.searchParams.set('error', 'auth-unavailable');
    return NextResponse.redirect(login);
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(AUTH_TIMEOUT_MS) }) },
  });

  const loginRedirect = (params: Record<string, string>) => {
    const login = request.nextUrl.clone();
    login.pathname = '/admin/login';
    for (const [key, value] of Object.entries(params)) login.searchParams.set(key, value);
    return NextResponse.redirect(login);
  };

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return loginRedirect({ next: path });

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.is_admin === true || profile?.role === 'admin';
    const isStaff = profile?.role === 'staff';

    if (!isAdmin && !isStaff) return loginRedirect({ error: 'not-admin' });

    // Staff are scoped to products (+ read-only Users/Dashboard). Keep this
    // rule in sync with staffMayAccess() in src/lib/admin-auth.ts.
    if (!isAdmin && isStaff && !staffMayAccessEdge(path)) {
      const products = request.nextUrl.clone();
      products.pathname = '/admin/products';
      products.searchParams.set('error', 'admin-only');
      return NextResponse.redirect(products);
    }
  } catch {
    // Timeout or network failure reaching Supabase. Deny rather than hang —
    // an unauthenticated visitor must never fall through into /admin.
    return loginRedirect({ error: 'auth-unavailable' });
  }

  return response;
}

export const config = {
  // Run on everything except static assets / images / the video.
  matcher: ['/((?!_next/static|_next/image|favicon|images|video|.*\\.\\w+$).*)'],
};
