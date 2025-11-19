import { getAllStatuses } from "./config.js";

/**
 * Statuses module route handler
 */
export function statusesRouter(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // GET /statuses
  if (req.method === "GET" && pathname === "/statuses") {
    const statuses = getAllStatuses().map((status) => ({
      id: status.id,
      description: status.name,
    }));
    return new Response(JSON.stringify(statuses), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}
