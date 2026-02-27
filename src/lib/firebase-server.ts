// ══════════════════════════════════════════════
// FIREBASE SERVER — inizializzazione lato server (API routes)
// Centralizza la logica ripetuta in crea-ordine, create-payment-intent, stripe-webhook
// ══════════════════════════════════════════════
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

function getEnvValue(key: string, runtimeEnv?: Record<string, string>): string {
  // Prima prova import.meta.env (Vite/Astro dev), poi Cloudflare Workers runtime
  return (import.meta.env[key] as string) || runtimeEnv?.[key] || "";
}

export function getFirebaseServer(runtimeEnv?: Record<string, string>): { app: FirebaseApp; db: Firestore } {
  const config = {
    apiKey:            getEnvValue("PUBLIC_FIREBASE_API_KEY",         runtimeEnv),
    authDomain:        getEnvValue("PUBLIC_FIREBASE_AUTH_DOMAIN",     runtimeEnv),
    projectId:         getEnvValue("PUBLIC_FIREBASE_PROJECT_ID",      runtimeEnv),
    storageBucket:     getEnvValue("PUBLIC_FIREBASE_STORAGE_BUCKET",  runtimeEnv),
    messagingSenderId: getEnvValue("PUBLIC_FIREBASE_MESSAGING_SENDER_ID", runtimeEnv),
    appId:             getEnvValue("PUBLIC_FIREBASE_APP_ID",          runtimeEnv),
  };

  if (!config.apiKey || !config.projectId) {
    throw new Error("Variabili d'ambiente Firebase mancanti. Controlla il file .env.");
  }

  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  const db = getFirestore(app);
  return { app, db };
}
