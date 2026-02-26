import type { APIRoute } from "astro";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export const POST: APIRoute = async ({ request }) => {
  const updates = await request.json();
  const dataPath = join(process.cwd(), "src/data/data.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));

  // Merge shallow del blocco pub
  data.pub = { ...data.pub, ...updates };
  writeFileSync(dataPath, JSON.stringify(data, null, 2));
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
