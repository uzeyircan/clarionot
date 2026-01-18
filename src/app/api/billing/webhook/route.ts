import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function toIsoFromUnix(unix?: number | null) {
  if (!unix) return null;
  return new Date(unix * 1000).toISOString();
}

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
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      // 1) Checkout bitti → user_id ile planı PRO’ya çek, subscriptionId yaz
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.user_id ?? null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;

        if (!userId || !subscriptionId) break;

        // Subscription’ı çek → period_end ve cancel_at_period_end için
        const sub = (await stripe.subscriptions.retrieve(
          subscriptionId,
        )) as unknown as Stripe.Subscription;

        await supabase.from("user_plan").upsert({
          user_id: userId,
          plan: "pro",
          status: sub.status ?? "active",
          provider: "stripe",
          provider_customer_id:
            typeof session.customer === "string" ? session.customer : null,
          provider_subscription_id: subscriptionId,
          current_period_end: toIsoFromUnix((sub as any).current_period_end),
          cancel_at_period_end: Boolean((sub as any).cancel_at_period_end),
          cancel_at: toIsoFromUnix((sub as any).cancel_at),
          updated_at: new Date().toISOString(),
        });

        break;
      }

      // 2) Subscription değişti → status + period_end + cancel flags sync
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const status = sub.status ?? "inactive";
        const currentPeriodEnd = (sub as any).current_period_end as
          | number
          | undefined;

        const cancelAtPeriodEnd = Boolean((sub as any).cancel_at_period_end);
        const cancelAt = (sub as any).cancel_at as number | null | undefined;

        // ✅ KURAL: Cancel edilmiş ama dönem bitmemişse hâlâ PRO göster:
        // - status "active/trialing" ise zaten pro
        // - status "canceled" olsa bile period_end gelecekteyse pro göster
        const periodEndIso = toIsoFromUnix(currentPeriodEnd);
        const periodEndMs = currentPeriodEnd ? currentPeriodEnd * 1000 : 0;
        const stillValid = periodEndMs && periodEndMs > Date.now();

        const plan =
          status === "active" || status === "trialing" || stillValid
            ? "pro"
            : "free";

        await supabase
          .from("user_plan")
          .update({
            plan,
            status,
            current_period_end: periodEndIso,
            cancel_at_period_end: cancelAtPeriodEnd,
            cancel_at: toIsoFromUnix(cancelAt ?? null),
            updated_at: new Date().toISOString(),
          })
          .eq("provider_subscription_id", sub.id);

        break;
      }

      // 3) Subscription tamamen bitti → FREE
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        await supabase
          .from("user_plan")
          .update({
            plan: "free",
            status: "canceled",
            current_period_end: null,
            cancel_at_period_end: false,
            cancel_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("provider_subscription_id", sub.id);

        break;
      }

      // 4) Ödeme başarısız → past_due gibi durumları DB’ye yaz
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as
          | string
          | null
          | undefined;
        if (!subId) break;

        await supabase
          .from("user_plan")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("provider_subscription_id", subId);

        break;
      }

      // 5) Ödeme başarılı → active’a geri çek
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as
          | string
          | null
          | undefined;
        if (!subId) break;

        // period_end’i de güncellemek istersen subscription retrieve:
        const sub = (await stripe.subscriptions.retrieve(
          subId,
        )) as unknown as Stripe.Subscription;

        await supabase
          .from("user_plan")
          .update({
            plan: "pro",
            status: sub.status ?? "active",
            current_period_end: toIsoFromUnix((sub as any).current_period_end),
            cancel_at_period_end: Boolean((sub as any).cancel_at_period_end),
            cancel_at: toIsoFromUnix((sub as any).cancel_at),
            updated_at: new Date().toISOString(),
          })
          .eq("provider_subscription_id", subId);

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    // Stripe tekrar dener; burada 500 dönmek debug için daha iyi
    return NextResponse.json(
      { error: e?.message ?? "Webhook handler failed" },
      { status: 500 },
    );
  }
}
