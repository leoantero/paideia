import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Set only by this middleware; downstream code trusts it as already-verified. */
export const VERIFIED_USER_HEADER = "x-paideia-verified-user-id";

/**
 * Refreshes the Supabase auth session on every request. Consumed by
 * middleware.ts at the repo root. Without this, a student/parent's session
 * would silently expire mid-use once the access token's short lifetime runs
 * out, even though their refresh token is still valid.
 *
 * Uses the getAll/setAll cookie API — the get/set/remove shape used here
 * before is deprecated, and was actively buggy: each individual set/remove
 * call built a brand new NextResponse, discarding cookies already attached
 * to the previous one, so a multi-cookie write only ever kept the last
 * cookie. That silently dropped session state on some requests, forcing
 * extra token refreshes and occasional surprise re-logins.
 *
 * Also stamps the network-verified user id onto a request header so
 * downstream Server Components/route handlers can skip a second
 * `getUser()` round trip — see getVerifiedUser() in verified-user.ts.
 */
export async function updateSession(request: NextRequest) {
  // Never trust a client-supplied value for the header we're about to set.
  request.headers.delete(VERIFIED_USER_HEADER);

  let cookiesToApply: {
    name: string;
    value: string;
    options: CookieOptions;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookiesToApply = cookiesToSet;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    request.headers.set(VERIFIED_USER_HEADER, user.id);
  }

  const response = NextResponse.next({ request: { headers: request.headers } });
  cookiesToApply.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );

  return response;
}
