import type { APIRoute } from "astro";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export const DELETE: APIRoute = async ({ url }) => {
  const id = url.searchParams.get("id");
  if (!id) return new Response("ID mancante", { status: 400 });

  const dataPath = join(process.cwd(), "src/data/data.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));
  data.prodotti = data.prodotti.filter((p: any) => p.id !== id);
  writeFileSync(dataPath, JSON.stringify(data, null, 2));

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
