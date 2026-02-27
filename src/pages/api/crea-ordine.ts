import type { APIRoute } from "astro";
import { getFirebaseServer } from "../../lib/firebase-server";
import { collection, addDoc, getDocs } from "firebase/firestore";
import data from "../../data/data.json";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const runtimeEnv = (locals as any).runtime?.env;
    const { db } = getFirebaseServer(runtimeEnv);

    const body = await request.json();
    const { numeroTavolo, items, noteOrdine } = body;

    // Validazione input
    if (!numeroTavolo || isNaN(Number(numeroTavolo))) {
      return new Response(JSON.stringify({ error: "Numero tavolo non valido." }), { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Carrello vuoto." }), { status: 400 });
    }

    // Recupera prezzi reali da Firebase (server-side price validation — non ci fidiamo del client)
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
        prodottoId:    prodottoReale.id,
        nomeProdotto:  prodottoReale.nome,
        prezzoUnitario: prezzo,
        quantita:      item.quantita,
        totaleRiga:    prezzo * item.quantita,
      });
    }

    if (itemsValidati.length === 0) {
      return new Response(JSON.stringify({ error: "Nessun prodotto valido nel carrello." }), { status: 400 });
    }

    if (data.pub.coperto > 0) totaleCalcolato += data.pub.coperto;

    const ordineDoc = await addDoc(collection(db, "ordini"), {
      numeroTavolo:    Number(numeroTavolo),
      items:           itemsValidati,
      totale:          totaleCalcolato,
      metodoPagamento: "cassa",
      noteOrdine:      (noteOrdine || "").slice(0, 500), // Sanitizza lunghezza
      stato:           "in_attesa",
      pagato:          false,
      creatoAt:        new Date(),
      aggiornatoAt:    new Date(),
    });

    return new Response(JSON.stringify({ ordineId: ordineDoc.id }), { status: 200 });
  } catch (err: any) {
    console.error("Errore crea-ordine:", err.message);
    return new Response(JSON.stringify({ error: "Errore server. Riprova o chiama il personale." }), { status: 500 });
  }
};
