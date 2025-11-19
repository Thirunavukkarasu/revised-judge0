const express = require("express");
const router = express.Router();
const { getAllStatuses } = require("../config/statuses");

/**
 * GET /statuses
 * Get all available statuses
 */
router.get("/", (req, res) => {
  const statuses = getAllStatuses().map((status) => ({
    id: status.id,
    description: status.name,
  }));
  res.json(statuses);
});

module.exports = router;
