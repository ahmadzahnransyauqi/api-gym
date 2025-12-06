// routes/auth.js (or create a new file)
const express = require("express");
const router = express.Router();
const pool = require("../config/db"); // your PG pool setup

// POST /api/auth/check-email
router.post("/check-email", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const q = `SELECT id, email FROM users WHERE email = $1 LIMIT 1`;
    const result = await pool.query(q, [email]);

    if (result.rows.length > 0) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (err) {
    console.error("Error checking email:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
