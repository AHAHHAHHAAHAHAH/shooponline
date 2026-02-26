import type { APIRoute } from "astro";
import { getStripe, toCents } from "../../lib/stripe";
import { getAdminDb } from "../../lib/firebase-admin";
// Importiamo i dati per validare i prezzi lato server!
import data from "../../data/data.json";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { ordineData } = body;
    const { numeroTavolo, items, noteOrdine } = ordineData;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Carrello vuoto" }), { status: 400 });
    }

    // 🚨 CALCOLO DEL TOTALE SICURO LATO SERVER 🚨
    let totaleCalcolato = 0;
    const itemsValidati = [];

    for (const item of items) {
      // Cerca il prodotto nel database/json
      const prodottoReale = data.prodotti.find(p => p.id === item.prodottoId);
      if (!prodottoReale) continue; // Ignora prodotti inesistenti o manomessi

      totaleCalcolato += prodottoReale.prezzo * item.quantita;
      
      itemsValidati.push({
        prodottoId: prodottoReale.id,
        nomeProdotto: prodottoReale.nome,
        prezzoUnitario: prodottoReale.prezzo, // Prezzo reale dal server
        quantita: item.quantita,
        totaleRiga: prodottoReale.prezzo * item.quantita
      });
    }

    // Aggiungi l'eventuale coperto
    if (data.pub.coperto > 0) {
      totaleCalcolato += data.pub.coperto;
    }

    if (totaleCalcolato <= 0) {
      return new Response(JSON.stringify({ error: "Totale non valido" }), { status: 400 });
    }

    const stripe = getStripe();
    const db = getAdminDb();

    // 1. Salva ordine in stato "in_attesa" su Firestore con dati validati
    const ordineRef = await db.collection("ordini").add({
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

    // 2. Crea PaymentIntent con il totale ricalcolato dal server
    const paymentIntent = await stripe.paymentIntents.create({
      amount: toCents(totaleCalcolato),
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: {
        ordineId: ordineRef.id,
        tavolo: String(numeroTavolo),
      },
    });

    // 3. Aggiorna ordine con ID PaymentIntent
    await ordineRef.update({ stripePaymentIntentId: paymentIntent.id });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, ordineId: ordineRef.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Errore payment-intent:", err);
    return new Response(JSON.stringify({ error: "Errore server" }), { status: 500 });
  }
};