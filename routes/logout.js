const express = require('express');
const tokenBlacklist = require('../middleware/tokenBlacklist'); // contains add() and has()

const router = express.Router();

router.post('/', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];

  if (token) tokenBlacklist.add(token); // revoke the token immediately
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;