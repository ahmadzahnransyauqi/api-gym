const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const middlewareAuth = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/profile_photos";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `user_${req.user.id}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

router.put("/", middlewareAuth, upload.single("profile_photo"), async (req, res) => {
  const userId = req.user.id;
  const { username, email, phone, full_name, goal } = req.body;

  let profilePhotoPath = null;
  if (req.file) {
    profilePhotoPath = `/${req.file.path}`; // path disimpan di DB
  }

  try {
    const query = `
      UPDATE users
      SET username = $1,
          email = $2,
          full_name = $3,
          phone = $4,
          goal = $5
          ${profilePhotoPath ? `, profile_photo = $6` : ""}
      WHERE id = $7
      RETURNING *
    `;

    const params = profilePhotoPath
      ? [username, email, full_name, phone, goal, profilePhotoPath, userId]
      : [username, email, full_name, phone, goal, userId];

    const result = await pool.query(query, params);

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", middlewareAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT id, username, email, full_name, phone, goal, profile_photo FROM users WHERE id = $1",
      [userId]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
