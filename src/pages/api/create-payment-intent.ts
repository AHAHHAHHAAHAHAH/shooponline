import type { APIRoute } from "astro";
import Stripe from "stripe";
import { getFirebaseServer } from "../../lib/firebase-server";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import data from "../../data/data.json";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const runtimeEnv = (locals as any).runtime?.env;
    const { db } = getFirebaseServer(runtimeEnv);

    const stripeSecret = (import.meta.env.STRIPE_SECRET_KEY as string) || runtimeEnv?.STRIPE_SECRET_KEY;
    if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY mancante.");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" as any });

    const body = await request.json();
    const { ordineData } = body;
    const { numeroTavolo, items, noteOrdine } = ordineData || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Carrello vuoto" }), { status: 400 });
    }
    if (!numeroTavolo) {
      return new Response(JSON.stringify({ error: "Numero tavolo mancante" }), { status: 400 });
    }

    // Valida prezzi lato server (non ci fidiamo del client)
    const prodottiSnapshot = await getDocs(collection(db, "prodotti"));
    const prodottiDb = prodottiSnapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));

    let totaleCalcolato = 0;
    const itemsValidati = [];

    for (const item of items) {
      const prodottoReale = prodottiDb.find(p => p.id === item.prodottoId);
      if (!prodottoReale || prodottoReale.disponibile === false) continue;

      const prezzo = Number(prodottoReale.prezzo);
      totaleCalcolato += prezzo * item.quantita;

      itemsValidati.push({
        prodottoId:     prodottoReale.id,
        nomeProdotto:   prodottoReale.nome,
        prezzoUnitario: prezzo,
        quantita:       item.quantita,
        totaleRiga:     prezzo * item.quantita,
      });
    }

    if (itemsValidati.length === 0) {
      return new Response(JSON.stringify({ error: "Nessun prodotto valido" }), { status: 400 });
    }
    if (data.pub.coperto > 0) totaleCalcolato += data.pub.coperto;
    if (totaleCalcolato <= 0) {
      return new Response(JSON.stringify({ error: "Totale non valido" }), { status: 400 });
    }

    // Genera ID ordine prima di creare il PaymentIntent
    const nuovoOrdineRef = doc(collection(db, "ordini"));
    const ordineId = nuovoOrdineRef.id;

    const importoCentesimi = Math.round(totaleCalcolato * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   importoCentesimi,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: { ordineId, tavolo: String(numeroTavolo) },
    });

    // Salva ordine su Firebase in un unico write
    await setDoc(nuovoOrdineRef, {
      numeroTavolo:          Number(numeroTavolo),
      items:                 itemsValidati,
      totale:                totaleCalcolato,
      noteOrdine:            (noteOrdine || "").slice(0, 500),
      metodoPagamento:       "carta",
      stato:                 "in_attesa",
      pagato:                false,
      stripePaymentIntentId: paymentIntent.id,
      creatoAt:              new Date(),
      aggiornatoAt:          new Date(),
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, ordineId }),
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Errore create-payment-intent:", err.message);
    return new Response(JSON.stringify({ error: "Errore server. Riprova o contatta il personale." }), { status: 500 });
  }
};
