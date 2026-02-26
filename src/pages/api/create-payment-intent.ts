import type { APIRoute } from "astro";
import Stripe from "stripe";
import { db } from "../../lib/firebase-client";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import data from "../../data/data.json";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Recupero Sicuro della Chiave Stripe per Cloudflare
    const runtimeEnv = (locals as any).runtime?.env || {};
    const stripeSecret = runtimeEnv.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY;

    if (!stripeSecret) {
      throw new Error("STRIPE_SECRET_KEY mancante! Controlla le Environment Variables su Cloudflare.");
    }

    // 2. Inizializzazione diretta di Stripe
    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2023-10-16" as any,
    });

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

    // 3. Creiamo l'ordine in Firebase
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

    // 4. Creiamo il Payment Intent con Stripe (trasformando gli euro in centesimi)
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

    // 5. Aggiorniamo l'ordine con l'ID di Stripe
    await updateDoc(doc(db, "ordini", ordineDoc.id), { stripePaymentIntentId: paymentIntent.id });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, ordineId: ordineDoc.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Errore Dettagliato:", err.message);
    
    // RIMANDIAMO L'ERRORE REALE AL BROWSER
    return new Response(
      JSON.stringify({ 
        error: "Errore server", 
        dettaglio: err.message 
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};