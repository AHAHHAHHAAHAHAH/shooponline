import type { APIRoute } from "astro";
import { getStripe, toCents } from "../../lib/stripe";
import { db } from "../../lib/firebase-client";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import data from "../../data/data.json";

export const POST: APIRoute = async ({ request }) => {
  try {
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

    const stripe = getStripe();

    // Creiamo l'ordine usando il client SDK
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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: toCents(totaleCalcolato),
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
  } catch (err) {
    console.error("Errore payment-intent:", err);
    return new Response(JSON.stringify({ error: "Errore server" }), { status: 500 });
  }
};