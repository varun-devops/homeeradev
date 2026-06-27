import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Refreshes the Supabase auth session on every request and guards the
 * admin area. Without this, server components can't reliably read the
 * logged-in user (the session cookie would go stale).
 */
export async function middleware(request: NextRequest) {
  // Expose the current path to server components (the admin layout uses it
  // to skip its chrome on the login page).
  request.headers.set('x-pathname', request.nextUrl.pathname);
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Guard /admin — must be signed in AND an admin.
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('error', 'not-admin');
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Run on everything except static assets / images / the video.
  matcher: ['/((?!_next/static|_next/image|favicon|images|video|.*\\.\\w+$).*)'],
};
