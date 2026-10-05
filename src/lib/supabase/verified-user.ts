import "server-only";
import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";
import { VERIFIED_USER_HEADER } from "./middleware";

/**
 * Returns the signed-in user for the current request, without paying a
 * second `getUser()` network round trip to Supabase Auth when middleware
 * already verified one moments earlier in this same request.
 *
 * `getSession()` only decodes the session cookie locally (no network call),
 * so it's unsafe to trust for authorization on its own — a stale or forged
 * cookie could decode fine. We only trust it here because we cross-check its
 * user id against VERIFIED_USER_HEADER, which middleware.ts sets from an
 * actual `getUser()` network verification and strips from any client-sent
 * value first. If the header is missing (route outside the middleware
 * matcher) or doesn't match, we fall back to a real `getUser()` call.
 */
export async function getVerifiedUser() {
  const supabase = await createClient();
  const verifiedId = (await headers()).get(VERIFIED_USER_HEADER);

  if (verifiedId) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id === verifiedId) {
      return { supabase, user: session.user as User };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
