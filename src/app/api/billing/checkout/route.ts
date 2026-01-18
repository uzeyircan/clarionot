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

async function getProPriceIdByLookupKey() {
  const lookupKey =
    process.env.STRIPE_LOOKUP_KEY_PRO_MONTHLY_TRY ||
    process.env.STRIPE_LOOKUP_KEY_PRO_MONTHLY_DEFAULT ||
    "";

  if (!lookupKey)
    throw new Error("Missing STRIPE_LOOKUP_KEY_PRO_MONTHLY_* env");

  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });

  const price = prices.data?.[0];
  if (!price?.id)
    throw new Error(`No active price for lookup_key=${lookupKey}`);

  return price.id;
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const priceId = await getProPriceIdByLookupKey();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pro?checkout=cancel`,
    metadata: { user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
