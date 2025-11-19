const express = require("express");
const router = express.Router();
const SubmissionService = require("../services/submissionService");

/**
 * POST /submissions
 * Create a new submission
 */
router.post("/", async (req, res) => {
  try {
    const submission = SubmissionService.createSubmission(req.body);

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

    res.status(201).json({
      token: submission.token,
      status: {
        id: submission.status.id,
        description: submission.status.name,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /submissions/:token
 * Get submission by token
 */
router.get("/:token", (req, res) => {
  try {
    const submission = SubmissionService.getSubmissionByToken(req.params.token);

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
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

    res.json(response);
  } catch (error) {
    console.error("Error getting submission:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
