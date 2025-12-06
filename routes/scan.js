const express = require("express");
const router = express.Router();
const db = require("../config/db"); // koneksi pg
const { v4: uuidv4 } = require("uuid");

// ------------------------
// Generate QR token untuk user
// ------------------------
router.post("/generate", async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: "user_id wajib diisi" });

  const qr_token = uuidv4();

  try {
    const result = await db.query(
      `INSERT INTO user_qr_codes (user_id, qr_token, expires_at)
       VALUES ($1, $2, NOW() + interval '1 hour')
       ON CONFLICT (user_id) DO UPDATE SET qr_token = EXCLUDED.qr_token, expires_at = EXCLUDED.expires_at
       RETURNING *`,
      [user_id, qr_token]
    );

    res.json({ message: "QR token generated", data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", detail: err });
  }
});

// ------------------------
// Scan QR token
// ------------------------
router.post("/scan", async (req, res) => {
  const { qr_token, notes } = req.body;

  if (!qr_token) return res.status(400).json({ error: "qr_token wajib diisi" });

  try {
    // Cek token valid + join user
    const queryUser = await db.query(
      `SELECT users.id, users.full_name, user_qr_codes.expires_at
       FROM user_qr_codes 
       JOIN users ON user_qr_codes.user_id = users.id
       WHERE user_qr_codes.qr_token = $1`,
      [qr_token]
    );

    if (queryUser.rows.length === 0) {
      await db.query(
        `INSERT INTO attendance_logs (status, notes)
         VALUES ('denied', 'Invalid QR Token attempt')`
      );

      return res.status(403).json({ status: "denied", message: "QR tidak valid ❌" });
    }

    const user = queryUser.rows[0];

    // CEK EXPIRED
    const now = new Date();
    if (now > user.expires_at) {
      await db.query(
        `INSERT INTO attendance_logs (user_id, status, notes)
         VALUES ($1, 'denied', 'QR Expired')`,
        [user.id]
      );

      return res.status(410).json({
        status: "expired",
        message: "QR sudah kedaluwarsa ⏳",
      });
    }

    // Catat success
    await db.query(
      `INSERT INTO attendance_logs (user_id, status, notes)
       VALUES ($1, 'success', $2)`,
      [user.id, notes || "QR scan accepted"]
    );

    // HAPUS token setelah dipakai
    await db.query(
      `DELETE FROM user_qr_codes WHERE qr_token = $1`,
      [qr_token]
    );

    res.json({
      status: "success",
      message: `Selamat datang, ${user.full_name} 💪🔥`,
      user,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error ⚠", detail: err });
  }
});

module.exports = router;