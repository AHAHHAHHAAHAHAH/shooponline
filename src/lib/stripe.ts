// ══════════════════════════════════════════════
// STRIPE — client e server
// ══════════════════════════════════════════════
import Stripe from "stripe";

export function getStripe() {
  const key = import.meta.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY mancante in .env");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

// Formatta centesimi → euro
export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

// Euro → centesimi (Stripe lavora con centesimi)
export function toCents(euro: number): number {
  return Math.round(euro * 100);
}
