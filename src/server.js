const express = require("express");
const submissionsRouter = require("./routes/submissions");
const languagesRouter = require("./routes/languages");
const statusesRouter = require("./routes/statuses");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/submissions", submissionsRouter);
app.use("/languages", languagesRouter);
app.use("/statuses", statusesRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Revised Judge0 API",
    version: "1.0.0",
    endpoints: {
      submissions: "/submissions",
      languages: "/languages",
      statuses: "/statuses",
      health: "/health",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Revised Judge0 server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}`);
});

module.exports = app;
