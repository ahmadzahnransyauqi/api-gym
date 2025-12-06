const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: ["http://localhost:5173",
    "https://gym-roger-sumatera.vercel.app" // Or your frontend URL (e.g., localhost:3000)
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // explicitly allow PATCH
  allowedHeaders: ["Content-Type", "Authorization"] // explicitly allow Authorization
}));

// Middleware
app.use(express.json());
app.use("/uploads", express.static("uploads"));
const authRoutes = require('./routes/auth'); 
const scanRoutes = require('./routes/scan');
const editProfileRoutes = require('./routes/edit_profile');

// --- GUNAKAN ROUTES ---
// Artinya: semua URL yang berawalan /api/auth akan diurus oleh authRoutes
app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/admin/stats', require('./routes/admin/stats'));
app.use('/api/admin/users', require('./routes/admin/users'));
app.use('/api/admin/plans', require('./routes/admin/plans'));
app.use('/api/admin/classes', require('./routes/admin/classes'));
app.use('/api/admin/promos', require('./routes/admin/promos'));
app.use('/api/user/reset&delete', require('./routes/user/resetPass_and_deleteAcc'));
app.use('/api/edit_profile', editProfileRoutes);
app.use("/api/memberships", require("./routes/membership_buy"));
app.use("/api/auth", require("./routes/check-email"));
app.use("/api/user", require("./routes/resetpassword"));
app.use("/api/qr", require("./routes/scan"));
app.use("/api/attendance", require("./routes/user/attendance"));
app.use("/api/logout", require("./routes/logout"));

// Route Cek Server
app.get('/', (req, res) => {
  res.send("API Gym Aktif 😎🔥");
});

app.listen(port, () => {
  console.log(`🚀 Server berjalan di http://localhost:${port}`);
});