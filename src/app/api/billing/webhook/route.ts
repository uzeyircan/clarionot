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

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    // 1) Checkout tamamlandı -> user_id mapping'i burada yapılıyor
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.user_id ?? null;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;

      if (userId && subscriptionId) {
        const customerId =
          typeof session.customer === "string" ? session.customer : null;

        await supabase.from("user_plan").upsert({
          user_id: userId,
          plan: "pro",
          status: "active",
          provider: "stripe",
          provider_customer_id: customerId,
          provider_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        });
      }
    }

    // 2) Subscription created/updated -> status + period end
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated"
    ) {
      const sub = event.data.object as Stripe.Subscription;

      const periodEndIso = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;

      await supabase
        .from("user_plan")
        .update({
          plan: sub.status === "active" ? "pro" : "free",
          status: sub.status,
          current_period_end: periodEndIso,
          updated_at: new Date().toISOString(),
        })
        .eq("provider_subscription_id", sub.id);
    }

    // 3) Subscription deleted -> free'e düşür
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;

      await supabase
        .from("user_plan")
        .update({
          plan: "free",
          status: "canceled",
          current_period_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq("provider_subscription_id", sub.id);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Webhook handler error" },
      { status: 500 }
    );
  }
}
