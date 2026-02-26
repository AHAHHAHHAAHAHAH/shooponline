import { defineConfig, passthroughImageService } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  image: {
    // Diciamo ad Astro di non usare Sharp su Cloudflare
    service: passthroughImageService()
  }
});