import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async ({ request, locals, url }, next) => {
  // Lasciamo passare tutto, la sicurezza ora è gestita direttamente da Firebase Auth
  return next();
});