import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} env`);
  return v;
}

export async function GET() {
  try {
    // ✅ Netlify’de bu env adı olmalı:
    const lookupKey = requireEnv("STRIPE_LOOKUP_KEY_PRO_MONTHLY");

    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
      expand: ["data.product"],
    });

    const price = prices.data[0];
    if (!price) {
      return NextResponse.json(
        { error: "Price not found for lookup_key" },
        { status: 404 },
      );
    }

    const unitAmount = price.unit_amount ?? 0;
    const currency = (price.currency || "try").toUpperCase();

    const formatted = new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(unitAmount / 100);

    return NextResponse.json({
      id: price.id,
      lookup_key: price.lookup_key,
      unit_amount: unitAmount,
      currency: price.currency,
      formatted,
      interval: price.recurring?.interval ?? null,
      product_name:
        typeof price.product === "object" && !price.product.deleted ? price.product.name : null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Price fetch failed" },
      { status: 500 },
    );
  }
}
