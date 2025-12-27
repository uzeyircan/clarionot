import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const url = body?.url ? String(body.url).trim() : "";

    if (!url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
    });

    const html = await res.text();

    const og =
      html.match(
        /property=["']og:title["']\s*content=["']([^"']+)["']/i
      )?.[1] ?? "";
    const tw =
      html.match(
        /name=["']twitter:title["']\s*content=["']([^"']+)["']/i
      )?.[1] ?? "";
    const tt = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "";

    const title = String(og || tw || tt || "").trim();

    return NextResponse.json({ title }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
