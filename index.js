// File: index.js (Versi Modular/Terpisah)
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Panggil Route Admin yang baru dibuat
const adminRoutes = require('./routes/admin'); 

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*', 
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// --- ROUTES ---
// Mount route admin ke URL /api/admin
app.use('/api/admin', adminRoutes);

// Route Cek Server
app.get('/', (req, res) => {
  res.send("Server Gym Roger (Modular) Running! 🚀");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});