const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const middlewareAuth = require("../middleware/authMiddleware");

// --- UPDATE PROFILE ---
router.put("/", middlewareAuth, async (req, res) => {
  const userId = req.user.id;
  const { username, email, phone, full_name, goal } = req.body;

  try {
    const query = `
      UPDATE users
      SET username = $1,
          email = $2,
          full_name = $3,
          phone = $4,
          goal = $5
      WHERE id = $6
      RETURNING id, username, email, full_name, phone, goal
    `;
    const params = [username, email, full_name, phone, goal, userId];

    const result = await pool.query(query, params);

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("Edit profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- GET PROFILE ---
router.get("/", middlewareAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT id, username, email, full_name, phone, goal
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;