import type { APIRoute } from "astro";
import Stripe from "stripe";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs } from "firebase/firestore";
import data from "../../data/data.json";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const getEnv = (key: string) => import.meta.env[key] || (locals as any).runtime?.env?.[key];

    const firebaseConfig = {
      apiKey: getEnv("PUBLIC_FIREBASE_API_KEY"),
      authDomain: getEnv("PUBLIC_FIREBASE_AUTH_DOMAIN"),
      projectId: getEnv("PUBLIC_FIREBASE_PROJECT_ID"),
      storageBucket: getEnv("PUBLIC_FIREBASE_STORAGE_BUCKET"),
      messagingSenderId: getEnv("PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
      appId: getEnv("PUBLIC_FIREBASE_APP_ID")
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);

    const stripeSecret = getEnv("STRIPE_SECRET_KEY");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2023-10-16" as any });

    const body = await request.json();
    const { ordineData } = body;
    const { numeroTavolo, items, noteOrdine } = ordineData;

    if (!items || items.length === 0) return new Response(JSON.stringify({ error: "Carrello vuoto" }), { status: 400 });

    const prodottiSnapshot = await getDocs(collection(db, "prodotti"));
    const prodottiDb = prodottiSnapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));

    let totaleCalcolato = 0;
    const itemsValidati = [];

    for (const item of items) {
      const prodottoReale = prodottiDb.find(p => p.id === item.prodottoId);
      if (!prodottoReale) continue; 
      
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
    if (totaleCalcolato <= 0) return new Response(JSON.stringify({ error: "Totale non valido" }), { status: 400 });

    // 🔥 LA MAGIA: Generiamo l'ID prima di salvare, così facciamo un singolo salvataggio netto!
    const nuovoOrdineRef = doc(collection(db, "ordini"));
    const ordineId = nuovoOrdineRef.id;

    // Creiamo il pagamento su Stripe
    const importoCentesimi = Math.round(totaleCalcolato * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: importoCentesimi,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      metadata: { ordineId: ordineId, tavolo: String(numeroTavolo) },
    });

    // Salviamo su Firebase in UN UNICO COLPO (Usa solo il permesso 'create')
    await setDoc(nuovoOrdineRef, {
      numeroTavolo: Number(numeroTavolo),
      items: itemsValidati,
      totale: totaleCalcolato,
      noteOrdine: noteOrdine || "",
      metodoPagamento: "carta",
      stato: "in_attesa",
      pagato: false,
      stripePaymentIntentId: paymentIntent.id,
      creatoAt: new Date(),
      aggiornatoAt: new Date(),
    });

    return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret, ordineId: ordineId }), { status: 200 });
  } catch (err: any) {
    console.error("Errore server-side:", err.message);
    return new Response(JSON.stringify({ error: "Errore server", dettaglio: err.message }), { status: 500 });
  }
};