import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware do weryfikacji JWT token
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'No token provided' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'Invalid token' 
      });
    }
    
    if (!user.active) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'Account is deactivated' 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      error: 'Access denied', 
      message: 'Invalid token' 
    });
  }
};

// Middleware do sprawdzania roli
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Access denied', 
        message: 'Authentication required' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Insufficient permissions' 
      });
    }
    
    next();
  };
};

// Middleware do sprawdzania czy użytkownik to dyrygent
export const requireConductor = [authenticate, authorize('conductor')];

// Middleware do sprawdzania czy użytkownik to muzyk
export const requireMusician = [authenticate, authorize('musician')];

// Middleware do sprawdzania czy użytkownik to dyrygent lub muzyk
export const requireUser = [authenticate, authorize('conductor', 'musician')];