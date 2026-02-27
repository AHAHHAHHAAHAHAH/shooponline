import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  const response = await next();

  // ── Aggiungi header di sicurezza di base su tutte le risposte ──
  const headers = new Headers(response.headers);

  // Impedisce al browser di "sniffare" il content-type
  headers.set("X-Content-Type-Options", "nosniff");
  // Blocca iframe embedding (clickjacking)
  headers.set("X-Frame-Options", "SAMEORIGIN");
  // Abilita XSS filter del browser (legacy ma utile)
  headers.set("X-XSS-Protection", "1; mode=block");
  // Non inviare referrer a siti esterni
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // ── Impedisce la cache delle pagine admin nel browser ──
  if (url.pathname.startsWith("/admin")) {
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("Pragma", "no-cache");
  }

  return new Response(response.body, {
    status:     response.status,
    statusText: response.statusText,
    headers,
  });
});
