import type { APIRoute } from "astro";
import Stripe from "stripe";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, updateDoc, doc } from "firebase/firestore";

export const POST: APIRoute = async ({ request, locals }) => {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    // 1. Recuperiamo tutte le chiavi dall'ambiente Cloudflare
    const env = (locals as any).runtime?.env || import.meta.env;
    
    // 2. INIZIALIZZAZIONE SICURA DI FIREBASE (Come nell'altro file)
    const firebaseConfig = {
      apiKey: env.PUBLIC_FIREBASE_API_KEY,
      authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.PUBLIC_FIREBASE_APP_ID
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);

    // 3. RECUPERO CHIAVI STRIPE
    const stripeSecret = env.STRIPE_SECRET_KEY;
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecret || !webhookSecret) {
      throw new Error("Mancano le chiavi Stripe o Webhook su Cloudflare!");
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" as any });

    // 4. VERIFICA E GESTIONE DEL WEBHOOK
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as any;
      const ordineId = paymentIntent.metadata.ordineId;

      if (ordineId) {
        // Aggiorna l'ordine come PAGATO!
        await updateDoc(doc(db, "ordini", ordineId), {
          pagato: true,
          stato: "ricevuto",
          aggiornatoAt: new Date()
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    console.error("Errore webhook Stripe:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
};