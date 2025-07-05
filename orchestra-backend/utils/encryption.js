import crypto from 'crypto';

// Odczytaj klucz ze zmiennych środowiskowych lub użyj domyślnego
const SECRET_KEY = process.env.ENCRYPTION_KEY || 'my-super-secret-default-key-that-is-long-enough';

// Użyj SHA-256, aby zawsze uzyskać klucz o stałej, prawidłowej długości (32 bajty)
// To jest bardziej niezawodne niż poleganie na formacie 'hex'
const KEY = crypto.createHash('sha256').update(String(SECRET_KEY)).digest('base64').substring(0, 32);

const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

// Funkcja do szyfrowania tekstu
export const encrypt = (text) => {
  if (text === null || typeof text === 'undefined' || text === '') {
    return text;
  }
  
  const iv = crypto.randomBytes(IV_LENGTH);
  // Używamy zahashowanego klucza KEY
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(text.toString());
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
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
    // Używamy tego samego zahashowanego klucza KEY
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error("Błąd deszyfrowania - dane mogą być uszkodzone lub klucz został zmieniony:", error.message);
    // Jeśli deszyfrowanie się nie powiedzie, zwróć pusty ciąg,
    // aby nie wyświetlać użytkownikowi zaszyfrowanych "śmieci".
    return ''; 
  }
}; 