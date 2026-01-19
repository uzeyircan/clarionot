import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function getUser(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const { data } = await supabase.auth.getUser(token);
  return data.user ?? null;
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: planRow } = await supabase
    .from("user_plan")
    .select("provider_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const customerId = planRow?.provider_customer_id;
  if (!customerId) {
    return NextResponse.json(
      { error: "Stripe customer bulunamadı" },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}) as any);
  const returnUrlFromBody =
    typeof body?.return_url === "string" ? body.return_url : null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const fallbackReturnUrl = siteUrl
    ? `${siteUrl}/pro`
    : "http://localhost:3000/pro";

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrlFromBody || fallbackReturnUrl,
  });

  return NextResponse.json({ url: portal.url });
}
