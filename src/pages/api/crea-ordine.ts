import type { APIRoute } from "astro";
import { db } from "../../lib/firebase-client";
import { collection, addDoc } from "firebase/firestore";
import data from "../../data/data.json";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { numeroTavolo, items, noteOrdine } = body;

    if (!numeroTavolo || isNaN(Number(numeroTavolo))) {
      return new Response(JSON.stringify({ error: "Numero tavolo mancante." }), { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Il carrello è vuoto." }), { status: 400 });
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

    return new Response(
      JSON.stringify({ ordineId: ordineDoc.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Errore crea-ordine:", err);
    return new Response(JSON.stringify({ error: "Errore server." }), { status: 500 });
  }
};