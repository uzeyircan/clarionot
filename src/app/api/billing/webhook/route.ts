import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.user_id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : null;

      if (userId && subscriptionId) {
        await supabase.from("user_plan").upsert({
          user_id: userId,
          plan: "pro",
          status: "active",
          provider: "stripe",
          provider_customer_id:
            typeof session.customer === "string" ? session.customer : null,
          provider_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        });
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;

      // ⬇️ KRİTİK SATIR
      const currentPeriodEnd = (sub as any).current_period_end as
        | number
        | undefined;

      await supabase
        .from("user_plan")
        .update({
          plan:
            sub.status === "active" || sub.status === "trialing"
              ? "pro"
              : "free",
          status: sub.status,
          current_period_end: currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("provider_subscription_id", sub.id);

      break;
    }

    case "customer.subscription.deleted": {
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

      break;
    }
  }

  return NextResponse.json({ received: true });
}
