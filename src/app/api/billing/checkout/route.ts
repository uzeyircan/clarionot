import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
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

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_PRO!, quantity: 1 }],
    customer_email: user.email,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pro?checkout=cancel`,
    metadata: { user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
