import type { APIRoute } from "astro";
import Stripe from "stripe";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, doc, getDocs } from "firebase/firestore";
import data from "../../data/data.json"; // Teniamo il JSON solo per leggere pub.coperto

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = (locals as any).runtime?.env || import.meta.env;

    // 1. INIZIALIZZAZIONE FIREBASE SUL SERVER
    const firebaseConfig = {
      apiKey: env.PUBLIC_FIREBASE_API_KEY,
      authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: env.PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.PUBLIC_FIREBASE_APP_ID
    };

    if (!firebaseConfig.apiKey) throw new Error("Mancano le chiavi FIREBASE!");
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);

    // 2. INIZIALIZZAZIONE STRIPE
    const stripeSecret = env.STRIPE_SECRET_KEY;
    if (!stripeSecret) throw new Error("Manca STRIPE_SECRET_KEY!");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" as any });

    const body = await request.json();
    const { ordineData } = body;
    const { numeroTavolo, items, noteOrdine } = ordineData;

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: "Carrello vuoto" }), { status: 400 });
    }

    // 3. SCARICHIAMO I PRODOTTI LIVE DA FIREBASE PER VERIFICARE I PREZZI
    const prodottiSnapshot = await getDocs(collection(db, "prodotti"));
    const prodottiDb = prodottiSnapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));

    let totaleCalcolato = 0;
    const itemsValidati = [];

    // Validazione antimanomissione
    for (const item of items) {
      const prodottoReale = prodottiDb.find(p => p.id === item.prodottoId);
      if (!prodottoReale) continue; // Ignora se il prodotto non esiste più
      
      const prezzo = Number(prodottoReale.prezzo);
      totaleCalcolato += prezzo * item.quantita;
      
      itemsValidati.push({
        prodottoId: prodottoReale.id,
        nomeProdotto: prodottoReale.nome,
        prezzoUnitario: prezzo,
        quantita: item.quantita,
        totaleRiga: prezzo * item.quantita
      });
    }

    if (data.pub.coperto > 0) totaleCalcolato += data.pub.coperto;

    if (totaleCalcolato <= 0) {
      return new Response(JSON.stringify({ error: "Totale non valido" }), { status: 400 });
    }

    // 4. SALVATAGGIO ORDINE E PAYMENT INTENT
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

    const importoCentesimi = Math.round(totaleCalcolato * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: importoCentesimi,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: { ordineId: ordineDoc.id, tavolo: String(numeroTavolo) },
    });

    await updateDoc(doc(db, "ordini", ordineDoc.id), { stripePaymentIntentId: paymentIntent.id });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, ordineId: ordineDoc.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Errore:", err.message);
    return new Response(JSON.stringify({ error: "Errore server", dettaglio: err.message }), { status: 500 });
  }
};