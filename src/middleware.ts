import type { MiddlewareHandler } from "astro";

// Una password semplice per il pub (Mettila nel .env come ADMIN_PASSWORD=supersegreto)
const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD || "pub123"; 

export const onRequest: MiddlewareHandler = async ({ request, url, cookies, redirect }, next) => {
  // Se l'utente cerca di entrare in /admin...
  if (url.pathname.startsWith("/admin")) {
    const authCookie = cookies.get("admin_session")?.value;

    // ...e non ha il cookie di accesso, o è sbagliato
    if (authCookie !== ADMIN_PASSWORD) {
      // Se sta cercando di fare login (es. /admin/login), lascialo passare
      if (url.pathname === "/admin/login") {
        return next();
      }
      // Altrimenti buttalo alla pagina di login
      return redirect("/admin/login");
    }
  }
  
  return next();
};