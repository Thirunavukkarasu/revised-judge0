import { getAllLanguages, getLanguageById } from "./config.js";

/**
 * Languages module route handler
 */
export function languagesRouter(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // GET /languages
  if (req.method === "GET" && pathname === "/languages") {
    const languages = getAllLanguages().map((lang) => ({
      id: lang.id,
      name: lang.name,
    }));
    return new Response(JSON.stringify(languages), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // GET /languages/:id
  if (req.method === "GET" && pathname.startsWith("/languages/")) {
    const id = pathname.split("/languages/")[1];
    const language = getLanguageById(id);

    if (!language) {
      return new Response(JSON.stringify({ error: "Language not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        id: language.id,
        name: language.name,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return null;
}
