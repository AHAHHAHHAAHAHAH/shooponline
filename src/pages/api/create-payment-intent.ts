import type { APIRoute } from "astro";
import Stripe from "stripe";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, doc } from "firebase/firestore";
import data from "../../data/data.json";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Recuperiamo tutte le chiavi dall'ambiente Cloudflare
    const env = (locals as any).runtime?.env || import.meta.env;

    // 1. INIZIALIZZAZIONE SICURA DI FIREBASE SUL SERVER
    const firebaseConfig = {
      apiKey: env.PUBLIC_FIREBASE_API_KEY,
      authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.PUBLIC_FIREBASE_APP_ID
    };

    if (!firebaseConfig.apiKey) {
      throw new Error("Mancano le chiavi PUBLIC_FIREBASE_... nelle variabili di Cloudflare!");
    }

    // Creiamo l'app Firebase o usiamo quella esistente se è già in memoria
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);

    // 2. INIZIALIZZAZIONE SICURA DI STRIPE
    const stripeSecret = env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      throw new Error("Manca la STRIPE_SECRET_KEY nelle variabili di Cloudflare!");
    }
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" as any });

    // 3. LOGICA DELL'ORDINE
    const body = await request.json();
    const { ordineData } = body;
    const { numeroTavolo, items, noteOrdine } = ordineData;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Carrello vuoto" }), { status: 400 });
    }

    let totaleCalcolato = 0;
    const itemsValidati = [];

    for (const item of items) {
      const prodottoReale = data.prodotti.find(p => p.id === item.prodottoId);
      if (!prodottoReale) continue;
      totaleCalcolato += prodottoReale.prezzo * item.quantita;
      itemsValidati.push({
        prodottoId: prodottoReale.id,
        nomeProdotto: prodottoReale.nome,
        prezzoUnitario: prodottoReale.prezzo,
        quantita: item.quantita,
        totaleRiga: prodottoReale.prezzo * item.quantita
      });
    }

    if (data.pub.coperto > 0) totaleCalcolato += data.pub.coperto;

    if (totaleCalcolato <= 0) {
      return new Response(JSON.stringify({ error: "Totale non valido" }), { status: 400 });
    }

    // Salviamo l'ordine su Firestore
    const ordineDoc = await addDoc(collection(db, "ordini"), {
      numeroTavolo: Number(numeroTavolo),
      items: itemsValidati,
      totale: totaleCalcolato,
      noteOrdine: noteOrdine || "",
      metodoPagamento: "carta",
      stato: "in_attesa",
      pagato: false,
      stripePaymentIntentId: null,
      creatoAt: new Date(),
      aggiornatoAt: new Date(),
    });

    // Creiamo la transazione con Stripe
    const importoCentesimi = Math.round(totaleCalcolato * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: importoCentesimi,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: {
        ordineId: ordineDoc.id,
        tavolo: String(numeroTavolo),
      },
    });

    await updateDoc(doc(db, "ordini", ordineDoc.id), { stripePaymentIntentId: paymentIntent.id });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, ordineId: ordineDoc.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Errore Dettagliato:", err.message);
    return new Response(
      JSON.stringify({ error: "Errore server", dettaglio: err.message }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};