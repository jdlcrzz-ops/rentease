import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the login session fresh and sends logged-out visitors to /login.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not add code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = !!data?.claims;

  const path = request.nextUrl.pathname;
  // Login, password reset, email-link handling and the tenant portal are open to visitors.
  const isPublic =
    path.startsWith("/login") ||
    path.startsWith("/t/") ||
    path.startsWith("/auth/") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/signup") ||
    path.startsWith("/privacy") ||
    path.startsWith("/terms");

  if (!isLoggedIn && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
