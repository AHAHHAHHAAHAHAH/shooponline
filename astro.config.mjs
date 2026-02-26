import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://tuopub.it",
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [sitemap()],
  vite: {
    define: {
      // Espone le env variables al client solo quelle prefissate PUBLIC_
    }
  }
});
