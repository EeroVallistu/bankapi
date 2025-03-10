const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user
      const user = await User.findByPk(decoded.userId);
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // During development, allow any valid JWT to pass authentication
      if (process.env.NODE_ENV === 'development') {
        req.user = user;
        req.token = token;
        return next();
      }

      // In production, check if the session exists in the user's sessions array
      const sessions = user.sessions || [];
      const validSession = sessions.find(s => s.token === token || s.id === decoded.sessionId);
      
      if (!validSession) {
        return res.status(401).json({
          status: 'error',
          message: 'Session expired or invalid'
        });
      }

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token expired'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

module.exports = { authenticate };
