const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

const logActivity = async (msg) => {
  try { await pool.query("INSERT INTO system_logs (activity) VALUES ($1)", [msg]); }
  catch (e) { console.error(e); }
};

// GET USERS
router.get('/', async (req, res) => {
  const q = `SELECT u.id, u.username, u.full_name, u.email, COALESCE(um.status, 'inactive') as status 
             FROM users u LEFT JOIN user_memberships um ON u.id = um.user_id 
             WHERE u.role = 'member' ORDER BY u.created_at DESC`;
  const { rows } = await pool.query(q);
  res.json(rows);
});

// CREATE USER
router.post('/', async (req, res) => {
  const { username, email, full_name, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const newUser = await client.query(
      "INSERT INTO users (username, email, full_name, password, role) VALUES ($1, $2, $3, $4, 'member') RETURNING id",
      [username, email, full_name, password]
    );
    await client.query("INSERT INTO user_memberships (user_id, status) VALUES ($1, 'inactive')", [newUser.rows[0].id]);
    await client.query('COMMIT');
    logActivity(`Created user: ${username}`);
    res.json({ msg: "Success" });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).send(e);
  } finally {
    client.release();
  }
});

// UPDATE USER
router.put('/:id', async (req, res) => {
  const { full_name, email, status } = req.body;
  try {
    await pool.query("UPDATE users SET full_name=$1, email=$2 WHERE id=$3", [full_name, email, req.params.id]);
    const check = await pool.query("SELECT * FROM user_memberships WHERE user_id=$1", [req.params.id]);
    if (check.rows.length > 0)
      await pool.query("UPDATE user_memberships SET status=$1 WHERE user_id=$2", [status, req.params.id]);
    else
      await pool.query("INSERT INTO user_memberships (user_id, status, plan_id) VALUES ($1, $2, 1)", [req.params.id, status]);
    logActivity(`Updated user ${req.params.id}`);
    res.json({ msg: "Updated" });
  } catch (e) {
    res.status(500).send(e);
  }
});

// DELETE USER
router.delete('/:id', async (req, res) => {
  await pool.query("DELETE FROM users WHERE id=$1", [req.params.id]);
  logActivity(`Deleted user ${req.params.id}`);
  res.json({ msg: "Deleted" });
});

module.exports = router;
