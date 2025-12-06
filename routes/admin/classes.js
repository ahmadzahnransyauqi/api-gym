const express = require("express");
const router = express.Router();
const pool = require("../../config/db");
const middlewareAuth = require("../../middleware/authMiddleware");

const logActivity = async (msg) => {
  try {
    await pool.query("INSERT INTO system_logs (activity) VALUES ($1)", [msg]);
  } catch (e) {
    console.error(e);
  }
};

// GET all classes
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM class_schedules ORDER BY id ASC"
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /classes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST add a new class
router.post("/", async (req, res) => {
  try {
    const {
      class_name,
      trainer_name,
      day_of_week,
      start_time,
      end_time,
      spots,
      total_spots,
      difficulty,
      categories,
    } = req.body;

    const formatTime = (t) => (t.length === 5 ? t + ":00" : t);

    await pool.query(
      `INSERT INTO class_schedules 
       (class_name, trainer_name, day_of_week, start_time, end_time, spots, total_spots, difficulty, categories) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        class_name,
        trainer_name,
        day_of_week,
        formatTime(start_time),
        formatTime(end_time),
        spots,
        total_spots,
        difficulty,
        categories,
      ]
    );

    logActivity(`Added Class: ${class_name}`);
    res.json({ msg: "Added" });
  } catch (err) {
    console.error("POST /classes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update a class
router.put("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM class_schedules WHERE id=$1",
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: "Class not found" });

    const existing = rows[0];
    const {
      class_name,
      trainer_name,
      day_of_week,
      start_time,
      end_time,
      spots,
      total_spots,
      difficulty,
      categories,
    } = req.body;

    await pool.query(
      `UPDATE class_schedules
       SET class_name=$1,
           trainer_name=$2,
           day_of_week=$3,
           start_time=$4,
           end_time=$5,
           spots=$6,
           total_spots=$7,
           difficulty=$8,
           categories=$9
       WHERE id=$10`,
      [
        class_name ?? existing.class_name,
        trainer_name ?? existing.trainer_name,
        day_of_week ?? existing.day_of_week,
        start_time ?? existing.start_time,
        end_time ?? existing.end_time,
        spots ?? existing.spots,
        total_spots ?? existing.total_spots,
        difficulty ?? existing.difficulty,
        categories ?? existing.categories,
        req.params.id,
      ]
    );

    logActivity(`Updated Class: ${class_name ?? existing.class_name}`);
    res.json({ msg: "Updated successfully" });
  } catch (err) {
    console.error("PUT /classes/:id error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE a class
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM class_schedules WHERE id=$1", [
      req.params.id,
    ]);
    res.json({ msg: "Deleted" });
  } catch (err) {
    console.error("DELETE /classes/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/joined-classes", middlewareAuth, async (req, res) => {
  try {
    const user_id = req.user.id;

    const { rows } = await pool.query(
      `
      SELECT 
        us.id AS user_schedule_id,
        cs.id AS class_id,
        cs.class_name,
        cs.trainer_name,

        /* Prefer user_schedules values, otherwise use class_schedules */
        COALESCE(us.day_of_week, cs.day_of_week) AS day_of_week,
        COALESCE(us.start_time, cs.start_time) AS start_time,
        COALESCE(us.end_time, cs.end_time) AS end_time,
        COALESCE(us.difficulty, cs.difficulty) AS difficulty,
        COALESCE(us.categories, cs.categories) AS categories

      FROM user_schedules us
      JOIN class_schedules cs 
        ON us.class_schedule_id = cs.id
      WHERE us.user_id = $1
      ORDER BY us.created_at DESC
      `,
      [user_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET /joined-classes error:", err);
    res.status(500).json({ error: err.message });
  }
});


router.patch("/:id/join", middlewareAuth, async (req, res) => {
  try {
    const classId = req.params.id;
    const user_id = req.user.id;

    // Get full class schedule data
    const { rows } = await pool.query(
      "SELECT * FROM class_schedules WHERE id=$1",
      [classId]
    );

    if (!rows[0]) return res.status(404).json({ error: "Class not found" });
    const cls = rows[0];

    // Check capacity
    if (cls.spots >= cls.total_spots)
      return res.status(400).json({ error: "Class is full" });

    // Increase spots
    await pool.query(
      "UPDATE class_schedules SET spots = spots + 1 WHERE id=$1",
      [classId]
    );

    // Insert user schedule with full details
    await pool.query(
      `INSERT INTO user_schedules 
        (user_id, class_schedule_id, day_of_week, start_time, end_time, difficulty, categories, created_at)
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        user_id,
        classId,
        cls.day_of_week,
        cls.start_time,
        cls.end_time,
        cls.difficulty,
        cls.categories,
      ]
    );

    res.json({ msg: "Joined successfully" });
  } catch (err) {
    console.error("PATCH /classes/:id/join error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.patch("/:id/leave", middlewareAuth, async (req, res) => {
  try {
    const classId = req.params.id;
    const user_id = req.user.id;

    // 1. Get class schedule
    const { rows } = await pool.query(
      "SELECT * FROM class_schedules WHERE id=$1",
      [classId]
    );

    if (!rows[0]) return res.status(404).json({ error: "Class not found" });
    const cls = rows[0];

    // 2. Check if user is actually joined
    const joined = await pool.query(
      "SELECT * FROM user_schedules WHERE user_id=$1 AND class_schedule_id=$2",
      [user_id, classId]
    );

    if (!joined.rows[0]) {
      return res.status(400).json({ error: "You are not joined in this class" });
    }

    // 3. Check if spots can be decremented
    if (cls.spots <= 0) {
      return res.status(400).json({ error: "Cannot leave, no spots to remove" });
    }

    // 4. Decrease spots
    await pool.query(
      "UPDATE class_schedules SET spots = spots - 1 WHERE id=$1",
      [classId]
    );

    // 5. Remove from user schedule
    await pool.query(
      "DELETE FROM user_schedules WHERE user_id=$1 AND class_schedule_id=$2",
      [user_id, classId]
    );

    res.json({ msg: "Left class successfully" });

  } catch (err) {
    console.error("PATCH /classes/:id/leave error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
