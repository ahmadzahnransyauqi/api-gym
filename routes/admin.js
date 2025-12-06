const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // Mengambil koneksi dari file db.js kamu
const authMiddleware = require('../middleware/authMiddleware'); // Mengambil middleware auth

// --- MIDDLEWARE ---
// Baris ini akan MEMPROTEKSI semua route di bawahnya.
// Hanya user dengan Token JWT yang valid yang bisa akses.
// Jika belum punya Login, komen dulu baris di bawah ini:
router.use(authMiddleware); 

// Helper Function: Log Activity
const logActivity = async (msg) => {
  try { 
    await pool.query("INSERT INTO system_logs (activity) VALUES ($1)", [msg]); 
  } catch (e) { 
    console.error("Log Error:", e.message); 
  }
};

// ==========================================
// 1. DASHBOARD STATS
// ==========================================
router.get('/stats', async (req, res) => {
  try {
    const totalMem = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'member'");
    const activeMem = await pool.query("SELECT COUNT(*) FROM user_memberships WHERE status = 'active'");
    const trainers = await pool.query("SELECT COUNT(DISTINCT trainer_name) FROM class_schedules");
    const classes = await pool.query("SELECT COUNT(*) FROM class_schedules");
    const promos = await pool.query("SELECT COUNT(*) FROM promotions WHERE status = 'active'");
    const plans = await pool.query("SELECT COUNT(*) FROM membership_plans");

    const revenue = await pool.query(`
      SELECT COALESCE(SUM(mp.price), 0) as total
      FROM user_memberships um 
      JOIN membership_plans mp ON um.plan_id = mp.id 
      WHERE um.status = 'active'
    `);

    const totalCount = parseInt(totalMem.rows[0].count);
    const activeCount = parseInt(activeMem.rows[0].count);
    const inactiveCount = totalCount - activeCount;

    const logs = await pool.query("SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 5");

    res.json({
      totalMembers: totalCount,
      activeMembers: activeCount,
      inactiveMembers: inactiveCount,
      totalTrainers: parseInt(trainers.rows[0].count),
      totalClasses: parseInt(classes.rows[0].count),
      activePromos: parseInt(promos.rows[0].count),
      totalPlans: parseInt(plans.rows[0].count),
      estRevenue: parseInt(revenue.rows[0].total),
      recentLogs: logs.rows
    });
  } catch (err) { 
    res.status(500).send('Server Error: ' + err.message); 
  }
});

// ==========================================
// 2. USERS MANAGEMENT
// ==========================================
router.get('/users', async (req, res) => {
  try {
    const q = `SELECT u.id, u.username, u.full_name, u.email, COALESCE(um.status, 'inactive') as status 
               FROM users u LEFT JOIN user_memberships um ON u.id = um.user_id 
               WHERE u.role = 'member' ORDER BY u.created_at DESC`;
    const { rows } = await pool.query(q);
    res.json(rows);
  } catch (e) { res.status(500).send(e.message); }
});

router.post('/users', async (req, res) => {
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
    res.status(500).send(e.message); 
  } finally { 
    client.release(); 
  }
});

router.put('/users/:id', async (req, res) => {
  const { full_name, email, status } = req.body;
  try {
    await pool.query("UPDATE users SET full_name = $1, email = $2 WHERE id = $3", [full_name, email, req.params.id]);
    const check = await pool.query("SELECT * FROM user_memberships WHERE user_id = $1", [req.params.id]);
    
    if (check.rows.length > 0) {
      await pool.query("UPDATE user_memberships SET status = $1 WHERE user_id = $2", [status, req.params.id]);
    } else {
      await pool.query("INSERT INTO user_memberships (user_id, status, plan_id) VALUES ($1, $2, 1)", [req.params.id, status]);
    }
    
    logActivity(`Updated user ID: ${req.params.id}`);
    res.json({ msg: "Updated" });
  } catch (e) { res.status(500).send(e.message); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    logActivity(`Deleted user ID: ${req.params.id}`);
    res.json({ msg: "Deleted" });
  } catch (e) { res.status(500).send(e.message); }
});

// ==========================================
// 3. MEMBERSHIP PLANS
// ==========================================
router.get('/plans', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM membership_plans ORDER BY price ASC");
    res.json(rows);
  } catch (e) { res.status(500).send(e.message); }
});

router.post('/plans', async (req, res) => {
  const { name, price, duration, benefits } = req.body;
  try {
    await pool.query("INSERT INTO membership_plans (name, price, duration_days, benefits) VALUES ($1, $2, $3, $4)", [name, price, duration, benefits]);
    logActivity(`Added Plan: ${name}`);
    res.json({ msg: "Added" });
  } catch (e) { res.status(500).send(e.message); }
});

router.put('/plans/:id', async (req, res) => {
  const { name, price, duration, benefits } = req.body;
  try {
    await pool.query("UPDATE membership_plans SET name=$1, price=$2, duration_days=$3, benefits=$4 WHERE id=$5", [name, price, duration, benefits, req.params.id]);
    logActivity(`Updated Plan: ${name}`);
    res.json({ msg: "Updated" });
  } catch (e) { res.status(500).send(e.message); }
});

router.delete('/plans/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM membership_plans WHERE id = $1", [req.params.id]);
    res.json({ msg: "Deleted" });
  } catch (e) { res.status(500).send(e.message); }
});

// ==========================================
// 4. CLASSES
// ==========================================
router.get('/classes', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM class_schedules ORDER BY id ASC");
    res.json(rows);
  } catch (e) { res.status(500).send(e.message); }
});

router.post('/classes', async (req, res) => {
  const { name, trainer, day, start, end } = req.body;
  try {
    await pool.query("INSERT INTO class_schedules (class_name, trainer_name, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4, $5)", [name, trainer, day, start, end]);
    logActivity(`Added Class: ${name}`);
    res.json({ msg: "Added" });
  } catch (e) { res.status(500).send(e.message); }
});

router.put('/classes/:id', async (req, res) => {
  const { name, trainer, day, start, end } = req.body;
  try {
    await pool.query("UPDATE class_schedules SET class_name=$1, trainer_name=$2, day_of_week=$3, start_time=$4, end_time=$5 WHERE id=$6", [name, trainer, day, start, end, req.params.id]);
    logActivity(`Updated Class: ${name}`);
    res.json({ msg: "Updated" });
  } catch (e) { res.status(500).send(e.message); }
});

router.delete('/classes/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM class_schedules WHERE id = $1", [req.params.id]);
    res.json({ msg: "Deleted" });
  } catch (e) { res.status(500).send(e.message); }
});

// ==========================================
// 5. PROMOS
// ==========================================
router.get('/promos', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM promotions ORDER BY id DESC");
    res.json(rows);
  } catch (e) { res.status(500).send(e.message); }
});

router.post('/promos', async (req, res) => {
  const { title, desc, discount, valid } = req.body;
  try {
    await pool.query("INSERT INTO promotions (title, description, discount_percentage, valid_until) VALUES ($1, $2, $3, $4)", [title, desc, discount, valid]);
    logActivity(`Added Promo: ${title}`);
    res.json({ msg: "Added" });
  } catch (e) { res.status(500).send(e.message); }
});

router.put('/promos/:id', async (req, res) => {
  const { title, desc, discount, valid } = req.body;
  try {
    await pool.query("UPDATE promotions SET title=$1, description=$2, discount_percentage=$3, valid_until=$4 WHERE id=$5", [title, desc, discount, valid, req.params.id]);
    logActivity(`Updated Promo: ${title}`);
    res.json({ msg: "Updated" });
  } catch (e) { res.status(500).send(e.message); }
});

router.delete('/promos/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM promotions WHERE id = $1", [req.params.id]);
    res.json({ msg: "Deleted" });
  } catch (e) { res.status(500).send(e.message); }
});

module.exports = router;