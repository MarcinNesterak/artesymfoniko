import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Funkcja generująca JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email i hasło są wymagane'
      });
    }
    
    // Znajdź użytkownika po email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Nieprawidłowy email lub hasło'
      });
    }
    
    // Sprawdź czy konto jest aktywne
    if (!user.active) {
      return res.status(401).json({
        error: 'Account deactivated',
        message: 'Konto zostało dezaktywowane. Skontaktuj się z dyrygentem.'
      });
    }
    
    // Sprawdź hasło
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Nieprawidłowy email lub hasło'
      });
    }
    
    // Aktualizuj ostatnie logowanie
    user.lastLogin = new Date();
    await user.save();
    
    // Wygeneruj token
    const token = generateToken(user._id);
    
    // Zwróć dane użytkownika (bez hasła)
    const userData = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      instrument: user.instrument,
      isTemporaryPassword: user.isTemporaryPassword,
      personalData: user.personalData,
      active: user.active,
      lastLogin: user.lastLogin
    };
    
    res.json({
      message: 'Zalogowano pomyślnie',
      token,
      user: userData,
      requiresPasswordChange: user.isTemporaryPassword
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Wystąpił błąd podczas logowania'
    });
  }
});

// POST /api/auth/register (tylko dla pierwszego dyrygenta)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email, hasło i imię są wymagane'
      });
    }
    
    // Sprawdź czy użytkownik już istnieje
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: 'User exists',
        message: 'Użytkownik o podanym emailu już istnieje'
      });
    }
    
    // Sprawdź czy to pierwszy użytkownik (będzie dyrygentem)
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'conductor' : 'musician';
    
    if (userCount > 0 && role === 'conductor') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Rejestracja dyrygenta jest dostępna tylko dla pierwszego użytkownika'
      });
    }
    
    // Utwórz nowego użytkownika
    const newUser = new User({
      email: email.toLowerCase(),
      name,
      password,
      role,
      active: true,
      personalData: {
        firstName: name.split(' ')[0] || '',
        lastName: name.split(' ').slice(1).join(' ') || ''
      }
    });
    
    await newUser.save();
    
    // Wygeneruj token
    const token = generateToken(newUser._id);
    
    // Zwróć dane użytkownika
    const userData = {
      id: newUser._id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      active: newUser.active
    };
    
    res.status(201).json({
      message: 'Konto utworzone pomyślnie',
      token,
      user: userData
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Wystąpił błąd podczas rejestracji'
    });
  }
});

// POST /api/auth/create-musician (tylko dla dyrygenta)
router.post('/create-musician', authenticate, async (req, res) => {
  try {
    // Sprawdź czy użytkownik to dyrygent
    if (req.user.role !== 'conductor') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Tylko dyrygent może tworzyć konta muzyków'
      });
    }
    
    const { email, firstName, lastName, instrument, phone } = req.body;
    
    if (!email || !firstName || !lastName || !instrument) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email, imię, nazwisko i instrument są wymagane'
      });
    }
    
    // Sprawdź czy użytkownik już istnieje
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: 'User exists',
        message: 'Użytkownik o podanym emailu już istnieje'
      });
    }
    
    // Wygeneruj hasło tymczasowe
    const tempPassword = 'haslo123';
    
    // Utwórz nowego muzyka
    const newMusician = new User({
      email: email.toLowerCase(),
      name: `${firstName} ${lastName}`,
      password: tempPassword,
      role: 'musician',
      instrument,
      isTemporaryPassword: true,
      active: true,
      createdBy: req.user._id,
      personalData: {
        firstName,
        lastName,
        phone: phone || '',
        address: {
          country: 'Polska'
        }
      }
    });
    
    await newMusician.save();
    
    // Zwróć dane muzyka z hasłem tymczasowym
    res.status(201).json({
      message: 'Konto muzyka utworzone pomyślnie',
      musician: {
        id: newMusician._id,
        email: newMusician.email,
        name: newMusician.name,
        instrument: newMusician.instrument,
        temporaryPassword: tempPassword,
        active: newMusician.active
      },
      temporaryPassword: tempPassword
    });
    
  } catch (error) {
    console.error('Create musician error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Wystąpił błąd podczas tworzenia konta muzyka'
    });
  }
});

// PATCH /api/auth/change-password
router.patch('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Nowe hasło jest wymagane'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Nowe hasło musi mieć co najmniej 6 znaków'
      });
    }
    
    const user = await User.findById(req.user._id);
    
    // Jeśli nie ma hasła tymczasowego, sprawdź obecne hasło
    if (!user.isTemporaryPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Obecne hasło jest wymagane'
        });
      }
      
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Obecne hasło jest nieprawidłowe'
        });
      }
    }
    
    // Zmień hasło
    user.password = newPassword;
    user.isTemporaryPassword = false;
    await user.save();
    
    res.json({
      message: 'Hasło zostało zmienione pomyślnie'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Server error',
      message: 'Wystąpił błąd podczas zmiany hasła'
    });
  }
});

// GET /api/auth/me (sprawdź aktualnego użytkownika)
router.get('/me', authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      instrument: req.user.instrument,
      isTemporaryPassword: req.user.isTemporaryPassword,
      personalData: req.user.personalData,
      active: req.user.active,
      lastLogin: req.user.lastLogin
    }
  });
});

export default router;