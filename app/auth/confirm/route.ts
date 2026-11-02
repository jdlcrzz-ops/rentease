import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing point for links in Supabase emails (password reset, and later
// email confirmation). It turns the link into a signed-in session.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Only allow paths inside our own site
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  const supabase = await createClient();
  let failed = true;

  if (tokenHash && type) {
    // Works on any phone or browser
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    failed = !!error;
  } else if (code) {
    // Default Supabase email: must be opened in the same browser that asked
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = !!error;
  }

  if (!failed) return NextResponse.redirect(new URL(next, origin));

  return NextResponse.redirect(
    new URL(
      `/forgot-password?error=${encodeURIComponent(
        "That link is invalid or has expired. Please request a new one, and open it on the same phone or browser you used here."
      )}`,
      origin
    )
  );
}
