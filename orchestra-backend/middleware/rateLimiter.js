import rateLimit from 'express-rate-limit';

// Rate limiter dla logowania
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 5, // 5 prób
  message: {
    error: 'Too many login attempts',
    message: 'Zbyt wiele prób logowania. Spróbuj ponownie za 15 minut.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiter dla API
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 100, // 100 requestów na minutę
  message: {
    error: 'Too many requests',
    message: 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter dla rejestracji
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 godzina
  max: 3, // 3 próby na godzinę
  message: {
    error: 'Too many registration attempts',
    message: 'Zbyt wiele prób rejestracji. Spróbuj ponownie za godzinę.'
  },
  standardHeaders: true,
  legacyHeaders: false,
}); 