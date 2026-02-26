// ══════════════════════════════════════════════
// TIPI TypeScript — unica fonte di verità
// ══════════════════════════════════════════════

export interface Prodotto {
  id: string;
  categoriaId: string;
  nome: string;
  descrizione: string;
  prezzo: number;
  immagine: string;
  allergeni: string[];
  tag: string[];
  disponibile: boolean;
  inEvidenza: boolean;
  alcolico: boolean;
  gradazione: string | null;
}

export interface Categoria {
  id: string;
  nome: string;
  emoji: string;
  descrizione: string;
  ordinamento: number;
  attiva: boolean;
}

export interface Tavolo {
  numero: number;
  nome: string;
  posti: number;
  attivo: boolean;
  zona: "interno" | "esterno" | "bancone";
}

export interface ItemCarrello {
  prodotto: Prodotto;
  quantita: number;
  note?: string;
}

export interface Ordine {
  id?: string;
  numeroTavolo: number;
  items: {
    prodottoId: string;
    nomeProdotto: string;
    prezzo: number;
    quantita: number;
    note?: string;
  }[];
  totale: number;
  metodoPagamento: "carta" | "cassa";
  stato: StatoOrdine;
  noteOrdine?: string;
  stripePaymentIntentId?: string;
  pagato: boolean;
  creatoAt: Date | string;
  aggiornatoAt: Date | string;
}

export type StatoOrdine =
  | "in_attesa"
  | "confermato"
  | "in_preparazione"
  | "pronto"
  | "consegnato"
  | "annullato";

export interface PubConfig {
  pub: {
    nome: string;
    tagline: string;
    descrizione: string;
    indirizzo: string;
    telefono: string;
    email: string;
    whatsapp: string;
    website: string;
    partitaIva: string;
    orari: { giorni: string; apertura: string; chiusura: string }[];
    social: { instagram: string; facebook: string; tiktok: string };
    colori: Record<string, string>;
    font: { display: string; body: string };
    currency: string;
    currencyCode: string;
    stripeEnabled: boolean;
    cashEnabled: boolean;
    ordiniAbilitati: boolean;
    messaggioChiusura: string;
    tempoAttesaMedio: string;
    coperto: number;
    immagineHero: string;
    logo: string;
    ogImage: string;
  };
  categorie: Categoria[];
  prodotti: Prodotto[];
  tavoli: Tavolo[];
  seo: { titolo: string; descrizione: string; keywords: string };
  checkout: {
    metodiPagamento: string[];
    noteOrdineAbilitate: boolean;
    noteOrdinePlaceholder: string;
    minimumOrdine: number;
    messaggioSuccesso: string;
    messaggioErrore: string;
    stripe: { currency: string; country: string };
  };
  admin: {
    email: string;
    notificheOrdini: boolean;
    suonoNotifica: boolean;
    aggiornamentoAutomatico: number;
    coloriStati: Record<string, string>;
    statiOrdine: { id: string; label: string; icona: string }[];
  };
}
