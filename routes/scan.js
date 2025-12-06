const express = require("express");
const router = express.Router();
const db = require("../config/db"); // koneksi pg
const { v4: uuidv4 } = require("uuid");

// Generate QR token untuk user
router.post("/generate", async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id wajib diisi" });

  const qr_token = uuidv4();

  try {
    const result = await db.query(
      `INSERT INTO user_qr_codes (user_id, qr_token)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET qr_token = EXCLUDED.qr_token
       RETURNING *`,
      [user_id, qr_token]
    );

    res.json({ message: "QR token generated", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", detail: err });
  }
});

// Scan QR token
router.post("/scan", async (req, res) => {
  const { qr_token, notes } = req.body;
  if (!qr_token) return res.status(400).json({ error: "qr_token wajib diisi" });

  try {
    const userRes = await db.query(
      "SELECT user_id FROM user_qr_codes WHERE qr_token = $1",
      [qr_token]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "QR token tidak valid ❌" });
    }

    const user_id = userRes.rows[0].user_id;

    const logRes = await db.query(
      `INSERT INTO attendance_logs (user_id, status, notes)
       VALUES ($1, $2, $3) RETURNING *`,
      [user_id, "success", notes || ""]
    );

    res.json({ message: "Scan berhasil ✅", data: logRes.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", detail: err });
  }
});

module.exports = router;
