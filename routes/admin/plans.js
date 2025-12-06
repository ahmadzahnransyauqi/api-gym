const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

const logActivity = async (msg) => {
  try { await pool.query("INSERT INTO system_logs (activity) VALUES ($1)", [msg]); }
  catch (e) { console.error(e); }
};

router.get('/', async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM membership_plans ORDER BY price ASC");
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, price, duration, benefits } = req.body;
  await pool.query("INSERT INTO membership_plans (name, price, duration_days, benefits) VALUES ($1,$2,$3,$4)", [name, price, duration, benefits]);
  logActivity(`Added Plan: ${name}`);
  res.json({ msg: "Added" });
});

router.put('/:id', async (req, res) => {
  const { name, price, duration, benefits } = req.body;
  await pool.query("UPDATE membership_plans SET name=$1, price=$2, duration_days=$3, benefits=$4 WHERE id=$5", [name, price, duration, benefits, req.params.id]);
  logActivity(`Updated Plan: ${name}`);
  res.json({ msg: "Updated" });
});

router.delete('/:id', async (req, res) => {
  await pool.query("DELETE FROM membership_plans WHERE id=$1", [req.params.id]);
  res.json({ msg: "Deleted" });
});

module.exports = router;
