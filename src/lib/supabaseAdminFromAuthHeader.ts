import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function supabaseAdminFromAuthHeader(authHeader: string) {
  const token = (authHeader || "").replace(/^Bearer\\s+/i, "").trim();
  if (!token) throw new Error("Unauthorized");

  // ⚠️ Buradaki alan adları DB'ne göre:
  // clip_tokens tablosunda token kolonu farklıysa (ör. access_token) değiştir.
  const { data, error } = await supabaseAdmin
    .from("clip_tokens")
    .select("user_id, revoked_at")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data?.user_id) throw new Error("Unauthorized");

  return { supabase: supabaseAdmin, userId: data.user_id as string };
}
export { supabaseAdmin };
