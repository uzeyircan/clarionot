import { supabaseAdmin } from "./supabaseAdmin";
import crypto from "crypto";

export async function supabaseAdminFromAuthHeader(authHeader: string) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("No token");
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const { data, error } = await supabaseAdmin
    .from("clip_tokens")
    .select("user_id, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data || data.revoked_at) {
    throw new Error("Invalid token");
  }

  return {
    supabase: supabaseAdmin,
    userId: data.user_id,
  };
}
export { supabaseAdmin };
