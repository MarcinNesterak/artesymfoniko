import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

// Konfiguracja Redis
const redis = new Redis(process.env.REDIS_URL, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1
});

// Rate limiter dla logowania
export const loginLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'login-limit:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 5, // 5 prób
  message: {
    error: 'Too many login attempts',
    message: 'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.'
  }
});

// Rate limiter dla API
export const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'api-limit:'
  }),
  windowMs: 60 * 1000, // 1 minuta
  max: 100, // 100 requestów na minutę
  message: {
    error: 'Too many requests',
    message: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.'
  }
});

// Rate limiter dla rejestracji
export const registerLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'register-limit:'
  }),
  windowMs: 60 * 60 * 1000, // 1 godzina
  max: 3, // 3 próby na godzinę
  message: {
    error: 'Too many registration attempts',
    message: 'Zbyt wiele prób rejestracji. Spróbuj ponownie za godzinę.'
  }
}); 