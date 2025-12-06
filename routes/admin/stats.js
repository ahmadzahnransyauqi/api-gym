const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

// GET DASHBOARD STATS
router.get('/', async (req, res) => {
  try {
    const totalMem = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'member'");
    const activeMem = await pool.query("SELECT COUNT(*) FROM user_memberships WHERE status = 'active'");
    const trainers = await pool.query("SELECT COUNT(DISTINCT trainer_name) FROM class_schedules");
    const classes = await pool.query("SELECT COUNT(*) FROM class_schedules");
    const promos = await pool.query("SELECT COUNT(*) FROM promotions WHERE status = 'active'");
    const plans = await pool.query("SELECT COUNT(*) FROM membership_plans");
    const revenue = await pool.query(`
      SELECT SUM(mp.price) 
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
      estRevenue: parseInt(revenue.rows[0].sum || 0),
      recentLogs: logs.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
