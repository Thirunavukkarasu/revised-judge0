import { languagesRouter } from "./languages/route.js";
import { statusesRouter } from "./statuses/route.js";
import { submissionsRouter } from "./submissions/route.js";

const PORT = process.env.PORT || 3000;

/**
 * Main request handler
 */
async function handleRequest(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Health check
  if (req.method === "GET" && pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Root endpoint
  if (req.method === "GET" && pathname === "/") {
    return new Response(
      JSON.stringify({
        message: "Revised Judge0 API",
        version: "1.0.0",
        endpoints: {
          submissions: "/submissions",
          languages: "/languages",
          statuses: "/statuses",
          health: "/health",
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Route to modules
  let response = null;

  // Try languages router
  response = languagesRouter(req);
  if (response) return response;

  // Try statuses router
  response = statusesRouter(req);
  if (response) return response;

  // Try submissions router
  response = await submissionsRouter(req);
  if (response) return response;

  // 404 Not Found
  return new Response(JSON.stringify({ error: "Not Found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

// Start Bun server
const server = Bun.serve({
  port: PORT,
  fetch: async (req) => {
    try {
      return await handleRequest(req);
    } catch (error) {
      console.error("Server error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});

console.log(`Revised Judge0 server running on port ${PORT}`);
console.log(`API available at http://localhost:${PORT}`);

export default server;
