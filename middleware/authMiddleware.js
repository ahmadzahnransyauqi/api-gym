const jwt = require('jsonwebtoken');
const tokenBlacklist = require('./tokenBlacklist'); // we’ll create this next

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) return res.status(401).json({ error: 'No token provided' });

  // Check if the token has been revoked (user logged out)
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
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
