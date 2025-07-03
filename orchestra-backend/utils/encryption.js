import crypto from 'crypto';

// Upewnij się, że te zmienne są ustawione w Twoim środowisku (.env)
// UWAGA: Nigdy nie umieszczaj tych wartości bezpośrednio w kodzie w środowisku produkcyjnym!
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'; // 32 bajty
const IV_LENGTH = 16; // Dla AES, to zawsze 16
const ALGORITHM = 'aes-256-cbc';

// Funkcja do szyfrowania tekstu
export const encrypt = (text) => {
  if (text === null || typeof text === 'undefined' || text === '') {
    return text;
  }
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text.toString());
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  // Zwracamy IV razem z zaszyfrowanym tekstem (IV jest publiczny)
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// Funkcja do deszyfrowania tekstu
export const decrypt = (text) => {
  if (text === null || typeof text === 'undefined' || text === '' || !text.includes(':')) {
    return text;
  }

  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error("Błąd deszyfrowania:", error);
    // W przypadku błędu (np. zmiana klucza), zwróć oryginalny, zaszyfrowany tekst lub pusty ciąg, aby uniknąć awarii aplikacji
    return text;
  }
}; 