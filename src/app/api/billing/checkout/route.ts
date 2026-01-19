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

  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;

  return data.user ?? null;
}

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function getProPriceIdByLookupKey() {
  // ✅ Netlify’da birebir bu isimle tanımla:
  const lookupKey = mustGetEnv("STRIPE_LOOKUP_KEY_PRO_MONTHLY");

  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });

  const price = prices.data?.[0];
  if (!price?.id) {
    throw new Error(`No active price for lookup_key=${lookupKey}`);
  }

  // ✅ ekstra güvenlik: subscription olmalı
  if (price.type !== "recurring") {
    throw new Error(`Price is not recurring: ${price.id}`);
  }

  return price.id;
}

export async function POST(req: Request) {
  try {
    const user = await getUser(req);
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteUrl = mustGetEnv("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
    const priceId = await getProPriceIdByLookupKey();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      success_url: `${siteUrl}/dashboard?checkout=success`,
      cancel_url: `${siteUrl}/pro?checkout=cancel`,
      metadata: { user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Checkout failed" },
      { status: 500 },
    );
  }
}
