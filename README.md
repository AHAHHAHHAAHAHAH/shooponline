# 🍸 PubOrder — Sistema di ordinazione per pub

## Stack
- **Astro 4** (SSR mode via Node.js adapter)
- **Firebase** (Firestore per ordini in real-time, Auth per admin)
- **Stripe** (pagamenti online con carta)
- **TypeScript** completo

## Setup rapido

### 1. Installa dipendenze
```bash
npm install
```

### 2. Configura le variabili d'ambiente
```bash
cp .env.example .env
# Compila tutti i valori in .env
```

### 3. Firebase
1. Crea progetto su [console.firebase.google.com](https://console.firebase.google.com)
2. Abilita **Firestore** (modalità produzione)
3. Abilita **Authentication** → Email/Password
4. Crea account admin: Authentication → Aggiungi utente
5. Genera chiave privata Admin SDK: Impostazioni progetto → Account di servizio
6. Copia i valori in `.env`

**Indici Firestore richiesti** (crea in console o con Firebase CLI):
```
Collezione: ordini
- creatoAt (desc)
- stato, creatoAt (per filtri)
```

### 4. Stripe
1. Crea account su [stripe.com](https://stripe.com)
2. Copia chiavi da Dashboard → API Keys in `.env`
3. Configura webhook: `https://tuodominio.it/api/stripe-webhook`
   - Evento: `payment_intent.succeeded`
4. Copia il webhook secret in `.env`

### 5. Personalizza il pub
Tutti i dati sono in `src/data/data.json`:
- Nome, descrizione, orari, contatti
- Categorie e prodotti del menu
- Numero e nomi dei tavoli
- Configurazione pagamenti

### 6. Aggiungi immagini
- Hero: `/public/images/hero.jpg` (1920×1080)
- Logo: `/public/images/logo.png`
- OG: `/public/images/og.jpg` (1200×630)
- Prodotti: `/public/images/prodotti/[nome].jpg`
- Placeholder: `/public/images/placeholder.jpg`

### 7. Avvia
```bash
npm run dev     # sviluppo
npm run build   # produzione
npm run preview # anteprima build
```

## Struttura pagine

| URL | Descrizione |
|-----|-------------|
| `/` | Landing page pub (SEO) |
| `/menu` | Menu pubblico navigabile |
| `/tavolo/[N]` | QR code punta qui → ordine dal tavolo |
| `/checkout` | Riepilogo + scelta pagamento |
| `/pagamento/successo` | Conferma ordine |
| `/admin` | Login admin |
| `/admin/dashboard` | Panoramica in tempo reale |
| `/admin/ordini` | Ordini live con stati aggiornabili |
| `/admin/prodotti` | CRUD prodotti menu |
| `/admin/tavoli` | Gestione tavoli + generazione QR |
| `/admin/impostazioni` | Dati pub, orari, pagamenti |

## Firestore — Schema collezioni

### `ordini`
```json
{
  "numeroTavolo": 3,
  "items": [{ "prodottoId": "negroni", "nomeProdotto": "Negroni", "prezzo": 9.00, "quantita": 2 }],
  "totale": 18.00,
  "metodoPagamento": "carta" | "cassa",
  "stato": "in_attesa" | "confermato" | "in_preparazione" | "pronto" | "consegnato" | "annullato",
  "noteOrdine": "Senza ghiaccio",
  "pagato": false,
  "stripePaymentIntentId": "pi_...",
  "creatoAt": Timestamp,
  "aggiornatoAt": Timestamp
}
```

## Deploy consigliato
- **VPS** con Node.js: `node dist/server/entry.mjs`
- **Railway** / **Render** (supportano Node SSR)
- **Cloudflare Workers** (richiede adapter `@astrojs/cloudflare` invece di node)

## Sicurezza Firestore Rules (incolla nella console Firebase)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Clienti: possono solo creare ordini
    match /ordini/{ordineId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```
