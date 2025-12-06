const express = require('express');
const router = express.Router();
const pool = require('../../config/db');

const logActivity = async (msg) => {
  try { await pool.query("INSERT INTO system_logs (activity) VALUES ($1)", [msg]); }
  catch (e) { console.error(e); }
};

router.get('/', async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM promotions ORDER BY id DESC");
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { title, desc, discount, valid } = req.body;
  await pool.query("INSERT INTO promotions (title, description, discount_percentage, valid_until) VALUES ($1,$2,$3,$4)", [title, desc, discount, valid]);
  logActivity(`Added Promo: ${title}`);
  res.json({ msg: "Added" });
});

router.put('/:id', async (req, res) => {
  const { title, desc, discount, valid } = req.body;
  await pool.query("UPDATE promotions SET title=$1, description=$2, discount_percentage=$3, valid_until=$4 WHERE id=$5", [title, desc, discount, valid, req.params.id]);
  logActivity(`Updated Promo: ${title}`);
  res.json({ msg: "Updated" });
});

router.delete('/:id', async (req, res) => {
  await pool.query("DELETE FROM promotions WHERE id=$1", [req.params.id]);
  res.json({ msg: "Deleted" });
});

module.exports = router;
