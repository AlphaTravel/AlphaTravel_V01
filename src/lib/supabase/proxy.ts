import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

export async function updateSession(request: NextRequest, requestHeaders = new Headers(request.headers)) {
  const config = getSupabaseConfig();
  const isLogin = request.nextUrl.pathname.startsWith("/login");
  const isPublicAuthRoute = isLogin
    || request.nextUrl.pathname.startsWith("/imposta-password")
    || request.nextUrl.pathname.startsWith("/auth/confirm")
    || request.nextUrl.pathname.startsWith("/accesso-negato");

  if (!config) {
    if (isPublicAuthRoute) return NextResponse.next({ request: { headers: requestHeaders } });
    const url = request.nextUrl.clone();
    url.pathname = "/accesso-negato";
    url.search = "";
    url.searchParams.set("reason", "configuration");
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  if (!data?.claims && !isPublicAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
