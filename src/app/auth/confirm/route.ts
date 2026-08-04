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
      if (type === "invite" || type === "recovery") {
        redirectTo.pathname = "/imposta-password";
      } else if (supabase) {
        const { data: authData } = await supabase.auth.getUser();
        const { data: member } = authData.user
          ? await supabase.from("organization_members").select("role").eq("user_id", authData.user.id).eq("is_active", true).maybeSingle()
          : { data: null };
        redirectTo.pathname = member?.role === "admin" ? "/admin" : "/dashboard";
      }
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = "/login";
  redirectTo.searchParams.set("error", "link-invalid");
  return NextResponse.redirect(redirectTo);
}
