import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  return new Response(
    JSON.stringify({ success: true, message: "Funzione disabilitata su Cloudflare per ora." }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};