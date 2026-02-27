import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async ({ request, locals, url }, next) => {
  // Controlla se l'utente sta cercando di entrare nell'area admin
  if (url.pathname.startsWith('/admin')) {
    
    // Recupera le credenziali dall'ambiente Cloudflare
    const env = (locals as any).runtime?.env || import.meta.env;
    const adminUser = env.ADMIN_USERNAME || 'admin';
    const adminPass = env.ADMIN_PASSWORD;

    // Se non hai impostato la password su Cloudflare, blocca tutto per sicurezza
    if (!adminPass) {
      return new Response('Configurazione di sicurezza mancante sul server.', { status: 500 });
    }

    // Costruisce la chiave criptata attesa
    const expectedAuth = `Basic ${btoa(`${adminUser}:${adminPass}`)}`;
    const basicAuth = request.headers.get('authorization');

    // Se non c'è la password, o è sbagliata, mostra il popup di login del browser
    if (basicAuth !== expectedAuth) {
      return new Response('Accesso Riservato al Personale', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Area Admin ShoopOnline"',
        },
      });
    }
  }

  // Se è tutto ok, o se è un cliente normale, lascialo passare
  return next();
});