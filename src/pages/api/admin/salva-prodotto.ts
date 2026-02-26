import type { APIRoute } from "astro";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export const POST: APIRoute = async ({ request }) => {
  const nuovoProdotto = await request.json();
  const dataPath = join(process.cwd(), "src/data/data.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));

  const idx = data.prodotti.findIndex((p: any) => p.id === nuovoProdotto.id);
  if (idx >= 0) data.prodotti[idx] = nuovoProdotto;
  else data.prodotti.push(nuovoProdotto);

  writeFileSync(dataPath, JSON.stringify(data, null, 2));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
};
