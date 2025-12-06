const express = require("express");
const router = express.Router();
const pool = require("../../config/db");
const bcrypt = require("bcryptjs"); // ✅ use bcryptjs
const authMiddleware = require("../../middleware/authMiddleware"); 

router.put('/reset-password', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Passwords are required' });
    }

    const { rows } = await pool.query(
      'SELECT password FROM users WHERE id=$1',
      [userId]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password=$1 WHERE id=$2',
      [hashed, userId]
    );

    res.json({ success: true, msg: 'Password updated successfully' });

  } catch (err) {
    console.error('Server error in /reset-password:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query('DELETE FROM users WHERE id=$1', [userId]);
    res.json({ success: true, msg: 'Account deleted successfully' });
  } catch (err) {
    console.error('Server error in DELETE /:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
