// routes/attendance.js
const express = require("express");
const router = express.Router();
const pool = require("../../config/db"); // pg Pool instance
const authenticateToken = require("../../middleware/authMiddleware"); // your middleware

// GET /api/attendance/success
router.get("/success", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // use the authenticated user directly

    const query = `
      SELECT id, scanned_at, notes
      FROM user_success_attendance
      WHERE user_id = $1
      ORDER BY scanned_at DESC
    `;

    const { rows } = await pool.query(query, [userId]);
    return res.json(rows);
  } catch (err) {
    console.error("Failed to fetch attendance:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;