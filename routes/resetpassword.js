// routes/user.js
const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// POST /api/user/reset-password-email
router.post("/reset-password-email", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email and new password are required" });
  }

  try {
    const { rows } = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (!rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password=$1 WHERE email=$2", [hashed, email]);

    res.json({ success: true, msg: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
