import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "TOKEN_MISSING" }, { status: 401 });
    }

    // ✅ token -> token_hash
    const tokenHash = sha256Hex(token);

    // 1) Clip token hash -> user_id (revoke edilmemiş olmalı)
    const { data: tok, error: tokErr } = await supabaseAdmin
      .from("clip_tokens")
      .select("id,user_id,revoked_at")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();

    if (tokErr) throw tokErr;

    const userId = tok?.user_id;
    if (!userId) {
      return NextResponse.json({ error: "TOKEN_INVALID" }, { status: 401 });
    }
    await supabaseAdmin
      .from("clip_tokens")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", tok.id);

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
