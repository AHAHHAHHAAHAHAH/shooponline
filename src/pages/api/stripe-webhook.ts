import type { APIRoute } from "astro";
import Stripe from "stripe";
import { getFirebaseServer } from "../../lib/firebase-server";
import { updateDoc, doc } from "firebase/firestore";

export const POST: APIRoute = async ({ request, locals }) => {
  const rawBody  = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Signature mancante", { status: 400 });
  }

  try {
    const runtimeEnv   = (locals as any).runtime?.env;
    const stripeSecret  = (import.meta.env.STRIPE_SECRET_KEY as string)  || runtimeEnv?.STRIPE_SECRET_KEY;
    const webhookSecret = (import.meta.env.STRIPE_WEBHOOK_SECRET as string) || runtimeEnv?.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecret || !webhookSecret) {
      throw new Error("Chiavi Stripe o Webhook mancanti.");
    }

    const { db } = getFirebaseServer(runtimeEnv);
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" as any });

    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const ordineId = paymentIntent.metadata?.ordineId;

      if (ordineId) {
        await updateDoc(doc(db, "ordini", ordineId), {
          pagato:       true,
          stato:        "confermato",   // ← stato valido nel data model
          aggiornatoAt: new Date(),
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    console.error("Errore webhook Stripe:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
};
