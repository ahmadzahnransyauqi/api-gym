const express = require("express");
const router = express.Router();
const pool = require("../../config/db");

const logActivity = async (msg) => {
  try {
    await pool.query("INSERT INTO system_logs (activity) VALUES ($1)", [msg]);
  } catch (e) {
    console.error(e);
  }
};

// GET ALL PLANS
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM membership_plans ORDER BY price ASC"
    );

    const formatted = rows.map((plan) => ({
      ...plan,
      benefits: plan.benefits
        ? plan.benefits.split(",").map((b) => b.trim())
        : [],
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch membership plans" });
  }
});

// CREATE PLAN
router.post("/", async (req, res) => {
  const { name, price, duration_days, benefits } = req.body;

  await pool.query(
    `INSERT INTO membership_plans (name, price, duration_days, benefits)
     VALUES ($1, $2, $3, $4)`,
    [
      name,
      price,
      duration_days,
      Array.isArray(benefits) ? benefits.join(", ") : benefits,
    ]
  );

  logActivity(`Added Plan: ${name}`);
  res.json({ msg: "Added" });
});

// UPDATE PLAN
router.put("/:id", async (req, res) => {
  const { name, price, duration_days, benefits } = req.body;

  await pool.query(
    `UPDATE membership_plans
     SET name=$1, price=$2, duration_days=$3, benefits=$4
     WHERE id=$5`,
    [
      name,
      price,
      duration_days,
      Array.isArray(benefits) ? benefits.join(", ") : benefits,
      req.params.id,
    ]
  );

  logActivity(`Updated Plan: ${name}`);
  res.json({ msg: "Updated" });
});

// DELETE PLAN
router.delete("/:id", async (req, res) => {
  await pool.query("DELETE FROM membership_plans WHERE id=$1", [
    req.params.id,
  ]);
  res.json({ msg: "Deleted" });
});

module.exports = router;