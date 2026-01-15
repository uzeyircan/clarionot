import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

function formatAmount(unitAmount: number, currency: string) {
  // Stripe unit_amount: kuruş/cent (minor unit)
  const value = unitAmount / 100;

  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0, // TRY için genelde 0 mantıklı
    }).format(value);
  } catch {
    // fallback
    return `${value} ${currency.toUpperCase()}`;
  }
}

export async function GET() {
  try {
    const priceId = process.env.STRIPE_PRICE_PRO;
    if (!priceId) {
      return NextResponse.json(
        { error: "Missing STRIPE_PRICE_PRO" },
        { status: 500 }
      );
    }

    const price = (await stripe.prices.retrieve(priceId, {
      expand: ["product"],
    })) as Stripe.Price;

    if (!price.active) {
      return NextResponse.json(
        { error: "Stripe price is not active" },
        { status: 500 }
      );
    }

    const unit = price.unit_amount ?? null;
    const currency = (price.currency ?? "try").toLowerCase();
    const interval = price.recurring?.interval ?? null; // month, year...

    const productName =
      typeof price.product === "object" && !price.product.deleted
        ? price.product.name
        : null;

    return NextResponse.json(
      {
        id: price.id,
        active: price.active,
        currency,
        unit_amount: unit,
        formatted: unit !== null ? formatAmount(unit, currency) : null,
        interval, // "month"
        product_name: productName,
      },
      {
        // fiyat çok sık değişmez, cache edelim
        headers: {
          "Cache-Control": "s-maxage=600, stale-while-revalidate=3600",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
