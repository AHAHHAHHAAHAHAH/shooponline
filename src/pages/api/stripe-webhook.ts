import type { APIRoute } from "astro";
import { getStripe } from "../../lib/stripe";
import { db } from "../../lib/firebase-client";
import { updateDoc, doc } from "firebase/firestore";

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const stripe = getStripe();
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET; 

  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as any;
      const ordineId = paymentIntent.metadata.ordineId;

      if (ordineId) {
        await updateDoc(doc(db, "ordini", ordineId), {
          pagato: true,
          stato: "ricevuto",
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