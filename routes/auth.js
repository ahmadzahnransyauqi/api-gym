const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

// --- REGISTER ---
router.post("/register", async (req, res) => {
  // 👇 POSISI YANG BENAR ADA DI SINI (Di dalam fungsi)
  console.log("BODY REQUEST:", req.body);

  const { username, email, password } = req.body;
  try {
    // Cek duplikat
    const userCheck = await pool.query(
      "SELECT * FROM users WHERE username = $1 or email = $2",
      [username, email]
    );
    if (userCheck.rows.length > 0) {
      const existingUser = userCheck.rows[0];
      if (existingUser.username === username) {
        return res.status(400).json({ error: "Username sudah dipakai!" });
      }
      if (existingUser.email === email) {
        return res.status(400).json({ error: "Email sudah terdaftar!" });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      "INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *",
      [username, email, hashedPassword, "member"]
    );

    res.json({ message: "Register Berhasil", user: newUser.rows[0] });
  } catch (err) {
    console.error("ERROR DATABASE:", err.message); // Log error database biar jelas
    res.status(500).json({ error: "Server Error saat Register" });
  }
});

// --- LOGIN ---
router.post("/login", async (req, res) => {
  // 👇 TAMBAHKAN INI UNTUK DEBUGGING
  console.log("LOGIN REQUEST:", req.body);

  const { loginId, password } = req.body;

  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $1",
      [loginId]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Username tidak ditemukan" });
    }

    const user = userResult.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Password salah!" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // was "1h"
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error saat Login" });
  }
});

router.get("/verify", authMiddleware, (req, res) => {
  return res.json({ valid: true, user: req.user });
});

module.exports = router;
