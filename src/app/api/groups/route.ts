import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdminFromAuthHeader";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "TOKEN_MISSING" }, { status: 401 });
    }

    // 1) Clip token -> user_id (revoke edilmemiş olmalı)
    const { data: tok, error: tokErr } = await supabaseAdmin
      .from("clip_tokens")
      .select("user_id, revoked_at")
      .eq("token", token)
      .is("revoked_at", null)
      .maybeSingle();

    if (tokErr) throw tokErr;

    const userId = tok?.user_id;
    if (!userId) {
      return NextResponse.json({ error: "TOKEN_INVALID" }, { status: 401 });
    }

    // 2) user_id -> groups
    const { data, error } = await supabaseAdmin
      .from("groups")
      .select("id,title")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ groups: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
