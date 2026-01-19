import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { sendPaymentFailedEmail, sendPaymentSucceededEmail } from "@/lib/email";

export const runtime = "nodejs";
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "true";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

function toIsoFromUnix(unix?: number | null) {
  if (!unix) return null;
  return new Date(unix * 1000).toISOString();
}

function isUniqueViolation(err: any) {
  return (
    err?.code === "23505" ||
    `${err?.message || ""}`.toLowerCase().includes("duplicate key")
  );
}

// ✅ Billing portal URL üret (email’de CTA için)
async function createManageBillingUrl(customerId: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteUrl}/pro`,
  });
  return portal.url;
}

function computeGraceUntilIso() {
  const days = Number(process.env.PAYMENT_GRACE_DAYS ?? 3);
  const safeDays = Number.isFinite(days) && days > 0 ? days : 3;
  return new Date(Date.now() + safeDays * 24 * 60 * 60 * 1000).toISOString();
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

  const eventId = event.id;
  const eventType = event.type;

  const STALE_MS = 10 * 60 * 1000;

  const { error: insertErr } = await supabase
    .from("stripe_webhook_events")
    .insert({
      event_id: eventId,
      type: eventType,
      status: "processing",
      processed_at: null,
      error: null,
    });

  if (insertErr) {
    if (isUniqueViolation(insertErr)) {
      const { data: row, error: readErr } = await supabase
        .from("stripe_webhook_events")
        .select("status, processed_at")
        .eq("event_id", eventId)
        .maybeSingle();

      if (readErr || !row) {
        return NextResponse.json(
          { error: "Idempotency read failed" },
          { status: 500 },
        );
      }

      if (row.status === "processed") {
        return NextResponse.json({ received: true, duplicate: true });
      }

      if (row.status === "processing") {
        const last = row.processed_at
          ? new Date(row.processed_at).getTime()
          : 0;
        const stale = !last || Date.now() - last > STALE_MS;

        if (!stale) {
          return NextResponse.json({ received: true, duplicate: true });
        }

        const { error: bumpErr } = await supabase
          .from("stripe_webhook_events")
          .update({
            status: "processing",
            processed_at: new Date().toISOString(),
            error: "reprocessing after stale processing",
          })
          .eq("event_id", eventId);

        if (bumpErr) {
          return NextResponse.json(
            { error: "Idempotency bump failed" },
            { status: 500 },
          );
        }
      }
      // failed ise yeniden dene (aşağı devam)
    } else {
      return NextResponse.json(
        { error: "Idempotency insert failed" },
        { status: 500 },
      );
    }
  }

  await supabase
    .from("stripe_webhook_events")
    .update({
      status: "processing",
      processed_at: new Date().toISOString(),
      error: null,
    })
    .eq("event_id", eventId);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.user_id ?? null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;

        if (!userId || !subscriptionId) break;

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
          grace_until: null, // ✅ ödeme alındı, grace yok
          updated_at: new Date().toISOString(),
        });

        if (EMAIL_ENABLED) {
          const email =
            session.customer_details?.email ||
            (typeof session.customer_email === "string"
              ? session.customer_email
              : null);

          const customerId =
            typeof session.customer === "string" ? session.customer : null;

          if (email) {
            const manageUrl = customerId
              ? await createManageBillingUrl(customerId)
              : null;

            await sendPaymentSucceededEmail({ to: email, manageUrl });
          }
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const status = sub.status ?? "inactive";
        const currentPeriodEnd = (sub as any).current_period_end as
          | number
          | undefined;

        const cancelAtPeriodEnd = Boolean((sub as any).cancel_at_period_end);
        const cancelAt = (sub as any).cancel_at as number | null | undefined;

        const periodEndIso = toIsoFromUnix(currentPeriodEnd);
        const periodEndMs = currentPeriodEnd ? currentPeriodEnd * 1000 : 0;
        const stillValid = periodEndMs && periodEndMs > Date.now();

        const plan =
          status === "active" || status === "trialing" || stillValid
            ? "pro"
            : "free";

        // ✅ abonelik tekrar active/trialing olduysa grace'i temizle
        const clearGrace = status === "active" || status === "trialing";

        await supabase
          .from("user_plan")
          .update({
            plan,
            status,
            current_period_end: periodEndIso,
            cancel_at_period_end: cancelAtPeriodEnd,
            cancel_at: toIsoFromUnix(cancelAt ?? null),
            grace_until: clearGrace ? null : undefined, // undefined => dokunma
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
            cancel_at_period_end: false,
            cancel_at: null,
            grace_until: null,
            updated_at: new Date().toISOString(),
          })
          .eq("provider_subscription_id", sub.id);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as
          | string
          | null
          | undefined;
        if (!subId) break;

        const graceUntilIso = computeGraceUntilIso();

        await supabase
          .from("user_plan")
          .update({
            status: "past_due",
            grace_until: graceUntilIso, // ✅ grace başlat
            updated_at: new Date().toISOString(),
          })
          .eq("provider_subscription_id", subId);

        if (EMAIL_ENABLED) {
          try {
            const { data: planRow } = await supabase
              .from("user_plan")
              .select("user_id, provider_customer_id")
              .eq("provider_subscription_id", subId)
              .maybeSingle();

            const uid = planRow?.user_id ?? null;
            const customerId = planRow?.provider_customer_id ?? null;

            if (uid) {
              const { data: u } = await supabase.auth.admin.getUserById(uid);
              const to = u.user?.email ?? null;

              if (to) {
                const manageUrl = customerId
                  ? await createManageBillingUrl(customerId)
                  : null;

                await sendPaymentFailedEmail({ to, manageUrl });
              }
            }
          } catch {
            // best-effort
          }
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as
          | string
          | null
          | undefined;
        if (!subId) break;

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
            grace_until: null, // ✅ ödeme alındı, grace bitti
            updated_at: new Date().toISOString(),
          })
          .eq("provider_subscription_id", subId);

        if (EMAIL_ENABLED) {
          try {
            const { data: planRow } = await supabase
              .from("user_plan")
              .select("user_id, provider_customer_id")
              .eq("provider_subscription_id", subId)
              .maybeSingle();

            const uid = planRow?.user_id ?? null;
            const customerId = planRow?.provider_customer_id ?? null;

            if (uid) {
              const { data: u } = await supabase.auth.admin.getUserById(uid);
              const to = u.user?.email ?? null;

              if (to) {
                const manageUrl = customerId
                  ? await createManageBillingUrl(customerId)
                  : null;

                await sendPaymentSucceededEmail({ to, manageUrl });
              }
            }
          } catch {
            // best-effort
          }
        }

        break;
      }
    }

    await supabase
      .from("stripe_webhook_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        error: null,
      })
      .eq("event_id", eventId);

    return NextResponse.json({ received: true });
  } catch (e: any) {
    await supabase
      .from("stripe_webhook_events")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
        error: e?.message ?? "Webhook handler failed",
      })
      .eq("event_id", eventId);

    return NextResponse.json(
      { error: e?.message ?? "Webhook handler failed" },
      { status: 500 },
    );
  }
}
