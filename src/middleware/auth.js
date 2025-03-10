const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Op } = require('sequelize');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Authentication required' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user with valid session
    const user = await User.findOne({
      where: {
        id: decoded.userId
      }
    });

    if (!user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'User not found' 
      });
    }

    // Check if token is in sessions array
    const now = new Date();
    const validSession = user.sessions.find(session => 
      session.token === token && new Date(session.expiresAt) > now
    );

    if (!validSession) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid or expired token' 
      });
    }

    // Add user to request object
    req.user = {
      id: user.id,
      username: user.username
    };
    req.token = token;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid token' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Token expired' 
      });
    }
    
    console.error('Auth error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
};
