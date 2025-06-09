import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
console.log('Redis URL format:', redisUrl ? 'Present' : 'Missing');

// Rate limiter dla logowania
export const loginLimiter = rateLimit({
  store: redisUrl ? new RedisStore({
    sendCommand: (...args) => {
      const redis = new Redis(redisUrl, {
        enableOfflineQueue: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          console.log(`Redis connection attempt ${times}, retrying in ${delay}ms`);
          return delay;
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      redis.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
      });

      return redis.call(...args);
    },
    prefix: 'login-limit:'
  }) : undefined,
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 5, // 5 prób
  message: {
    error: 'Too many login attempts',
    message: 'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.'
  }
});

// Rate limiter dla API
export const apiLimiter = rateLimit({
  store: redisUrl ? new RedisStore({
    sendCommand: (...args) => {
      const redis = new Redis(redisUrl, {
        enableOfflineQueue: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          console.log(`Redis connection attempt ${times}, retrying in ${delay}ms`);
          return delay;
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      redis.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
      });

      return redis.call(...args);
    },
    prefix: 'api-limit:'
  }) : undefined,
  windowMs: 60 * 1000, // 1 minuta
  max: 100, // 100 requestów na minutę
  message: {
    error: 'Too many requests',
    message: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.'
  }
});

// Rate limiter dla rejestracji
export const registerLimiter = rateLimit({
  store: redisUrl ? new RedisStore({
    sendCommand: (...args) => {
      const redis = new Redis(redisUrl, {
        enableOfflineQueue: true,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          console.log(`Redis connection attempt ${times}, retrying in ${delay}ms`);
          return delay;
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
      });

      redis.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
      });

      return redis.call(...args);
    },
    prefix: 'register-limit:'
  }) : undefined,
  windowMs: 60 * 60 * 1000, // 1 godzina
  max: 3, // 3 próby na godzinę
  message: {
    error: 'Too many registration attempts',
    message: 'Zbyt wiele prób rejestracji. Spróbuj ponownie za godzinę.'
  }
}); 