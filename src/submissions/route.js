import SubmissionService from "./service.js";

/**
 * Submissions module route handler
 */
export async function submissionsRouter(req) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // POST /submissions
  if (req.method === "POST" && pathname === "/submissions") {
    try {
      const body = await req.json();
      const submission = SubmissionService.createSubmission(body);

      // Process submission asynchronously
      setImmediate(async () => {
        try {
          await SubmissionService.processSubmission(submission.id);
          console.log(
            `Submission ${submission.id} (${submission.token}) processed successfully`
          );
        } catch (error) {
          console.error(`Error processing submission ${submission.id}:`, error);
        }
      });

      return new Response(
        JSON.stringify({
          token: submission.token,
          status: {
            id: submission.status.id,
            description: submission.status.name,
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // GET /submissions/:token
  if (req.method === "GET" && pathname.startsWith("/submissions/")) {
    try {
      const token = pathname.split("/submissions/")[1];
      const submission = SubmissionService.getSubmissionByToken(token);

      if (!submission) {
        return new Response(JSON.stringify({ error: "Submission not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const response = {
        stdout: submission.stdout || null,
        stderr: submission.stderr || null,
        compile_output: submission.compile_output || null,
        message: submission.message || null,
        status: {
          id: submission.status?.id || submission.status_id || 1,
          description: submission.status?.name || "In Queue",
        },
        time: submission.time || null,
        memory: submission.memory || null,
        exit_code: submission.exit_code || null,
        exit_signal: submission.exit_signal || null,
      };

      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error getting submission:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return null;
}
