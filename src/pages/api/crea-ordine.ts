import type { APIRoute } from "astro";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import data from "../../data/data.json";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 🔥 RISOLUZIONE BUG COME SOPRA
    const getEnv = (key: string) => import.meta.env[key] || (locals as any).runtime?.env?.[key];

    const firebaseConfig = {
      apiKey: getEnv("PUBLIC_FIREBASE_API_KEY"),
      authDomain: getEnv("PUBLIC_FIREBASE_AUTH_DOMAIN"),
      projectId: getEnv("PUBLIC_FIREBASE_PROJECT_ID"),
      storageBucket: getEnv("PUBLIC_FIREBASE_STORAGE_BUCKET"),
      messagingSenderId: getEnv("PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
      appId: getEnv("PUBLIC_FIREBASE_APP_ID")
    };

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error("Mancano le chiavi FIREBASE nel server!");
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);

    const body = await request.json();
    const { numeroTavolo, items, noteOrdine } = body;

    if (!numeroTavolo || isNaN(Number(numeroTavolo))) return new Response(JSON.stringify({ error: "Numero tavolo mancante." }), { status: 400 });
    if (!items || items.length === 0) return new Response(JSON.stringify({ error: "Carrello vuoto." }), { status: 400 });

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

    const ordineDoc = await addDoc(collection(db, "ordini"), {
      numeroTavolo: Number(numeroTavolo),
      items: itemsValidati,
      totale: totaleCalcolato,
      metodoPagamento: "cassa",
      noteOrdine: noteOrdine || "",
      stato: "in_attesa",
      pagato: false,
      creatoAt: new Date(),
      aggiornatoAt: new Date(),
    });

    return new Response(JSON.stringify({ ordineId: ordineDoc.id }), { status: 200 });
  } catch (err: any) {
    console.error("Errore crea-ordine:", err.message);
    return new Response(JSON.stringify({ error: "Errore server." }), { status: 500 });
  }
};