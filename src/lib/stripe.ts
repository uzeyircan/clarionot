import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function mustGetEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

export function getStripe() {
  if (stripeClient) return stripeClient;

  stripeClient = new Stripe(mustGetEnv("STRIPE_SECRET_KEY"), {
    typescript: true,
  });

  return stripeClient;
}
