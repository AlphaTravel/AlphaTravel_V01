import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedTypes = new Set<EmailOtpType>(["invite", "recovery", "email", "signup", "email_change"]);

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const redirectTo = request.nextUrl.clone();
  redirectTo.search = "";

  if (tokenHash && type && allowedTypes.has(type)) {
    const supabase = await createClient();
    const { error } = supabase
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Supabase non configurato") };
    if (!error) {
      redirectTo.pathname = type === "invite" || type === "recovery" ? "/imposta-password" : "/dashboard";
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "link-invalid");
  return NextResponse.redirect(redirectTo);
}
