const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const auth = require("../middleware/authMiddleware"); // your JWT auth middleware

router.post("/buy", auth, async (req, res) => {
  const userId = req.user.id;       // from auth middleware
  const { plan_id } = req.body;

  try {
    // --- 1. Get the plan ---
    const planRes = await pool.query(
      "SELECT * FROM membership_plans WHERE id = $1",
      [plan_id]
    );

    if (planRes.rows.length === 0)
      return res.status(404).json({ error: "Plan not found" });

    const plan = planRes.rows[0];

    // --- 2. Calculate dates ---
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.duration_days);

    // --- 3. Optional: Expire old memberships ---
    await pool.query(
      "UPDATE user_memberships SET status='expired' WHERE user_id=$1 AND status='active'",
      [userId]
    );

    // --- 4. Insert new membership ---
    await pool.query(
      `INSERT INTO user_memberships 
      (user_id, plan_id, start_date, end_date, status)
      VALUES ($1, $2, $3, $4, 'active')`,
      [userId, plan_id, startDate, endDate]
    );

    res.json({ message: "Membership purchased successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to buy membership" });
  }
});

// GET USER ACTIVE MEMBERSHIP
router.get("/me", auth, async (req, res) => {
  try {
    const userId = req.user?.id; // safe access
    console.log("User ID from auth middleware:", userId);

    if (!userId) {
      return res.status(400).json({ error: "User ID not found in token" });
    }

    const q = `
      SELECT 
        um.id AS membership_id,
        um.start_date,
        um.end_date,
        um.status,
        mp.id AS plan_id,
        mp.name,
        mp.price,
        mp.duration_days,
        mp.benefits
      FROM user_memberships um
      JOIN membership_plans mp ON um.plan_id = mp.id
      WHERE um.user_id = $1 AND um.status = 'active'
      ORDER BY um.created_at DESC
      LIMIT 1;
    `;

    const result = await pool.query(q, [userId]);
    console.log("Query result rows:", result.rows);

    if (result.rows.length === 0) {
      return res.json({ active: false, membership: null });
    }

    const row = result.rows[0];

    // Normalize benefits
    const benefits =
      typeof row.benefits === "string"
        ? row.benefits.split(",").map((b) => b.trim())
        : [];

    const response = {
      active: true,
      membership: {
        id: row.membership_id,
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status,
        name: row.name,
        price: row.price,
        duration_days: row.duration_days,
        benefits,
      },
    };

    return res.json(response);
  } catch (err) {
    console.error("Error fetching membership:", err);
    return res.status(500).json({ error: "Failed to fetch membership" });
  }
});

module.exports = router;
