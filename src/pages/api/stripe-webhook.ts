import type { APIRoute } from "astro";
import { getStripe } from "../../lib/stripe";
import { getAdminDb } from "../../lib/firebase-admin";

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const stripe = getStripe();
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET; 

  try {
    // Valida che la chiamata provenga davvero da Stripe
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as any;
      const ordineId = paymentIntent.metadata.ordineId;

      if (ordineId) {
        const db = getAdminDb();
        // Aggiorna Firestore: Ordine pagato!
        await db.collection("ordini").doc(ordineId).update({
          pagato: true,
          stato: "ricevuto", // Passa da in_attesa a ricevuto
          aggiornatoAt: new Date()
        });
        console.log(`Ordine ${ordineId} pagato con successo!`);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    console.error("Errore webhook Stripe:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
};