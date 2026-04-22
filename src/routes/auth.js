const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, TOKEN_EXPIRES_IN } = require('../config');
const { getUserByUsername } = require('../lib/db');
const { verifyPassword } = require('../lib/passwords');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await getUserByUsername(username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES_IN }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
