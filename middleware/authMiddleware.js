const jwt = require('jsonwebtoken');
const tokenBlacklist = require('./tokenBlacklist');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ error: 'Token revoked, please login again' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not set');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const decoded = jwt.verify(token, secret);

    // 🔥 FIX UTAMA: pastikan ID SELALU ADA
    req.user = {
      id: decoded.id || decoded.userId || decoded.userid,
      username: decoded.username,
      role: decoded.role,
    };

    console.log("AUTH MIDDLEWARE USER:", req.user);

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};