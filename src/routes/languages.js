const express = require("express");
const router = express.Router();
const { getAllLanguages, getLanguageById } = require("../config/languages");

/**
 * GET /languages
 * Get all available languages
 */
router.get("/", (req, res) => {
  const languages = getAllLanguages().map((lang) => ({
    id: lang.id,
    name: lang.name,
  }));
  res.json(languages);
});

/**
 * GET /languages/:id
 * Get language by ID
 */
router.get("/:id", (req, res) => {
  const language = getLanguageById(req.params.id);

  if (!language) {
    return res.status(404).json({ error: "Language not found" });
  }

  res.json({
    id: language.id,
    name: language.name,
  });
});

module.exports = router;
