import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Konfiguracja transportera email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587, // Standardowy port dla SMTP z TLS
  secure: false, // true dla portu 465, false dla innych portów
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Hasło do aplikacji wygenerowane w Google
  },
  connectionTimeout: 10000, // 10 sekund timeout połączenia
  greetingTimeout: 5000,    // 5 sekund timeout powitania
  socketTimeout: 10000,     // 10 sekund timeout socket
  // Dodatkowe ustawienia dla lepszej kompatybilności
  tls: {
    rejectUnauthorized: false, // Nie odrzucaj certyfikatów
    ciphers: 'SSLv3' // Dodaj z powrotem dla kompatybilności
  },
  debug: true, // Włącz debugowanie
  logger: true // Włącz logowanie
});

/**
 * Wysyła e-mail.
 * @param {object} options - Opcje maila.
 * @param {string} options.to - Adres e-mail odbiorcy.
 * @param {string} options.subject - Temat maila.
 * @param {string} options.html - Treść maila w formacie HTML.
 */
const sendEmail = async (options) => {
  const startTime = Date.now(); // Przenieś poza try-catch
  
  try {
    const mailOptions = {
      from: `"Artesymfoniko" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    console.log(`📧 Attempting to send email to: ${options.to}`);
    
    const info = await transporter.sendMail(mailOptions);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Email sent successfully to ${options.to} in ${duration}ms. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Failed to send email to ${options.to} after ${duration}ms:`, {
      error: error.message,
      code: error.code,
      command: error.command
    });
    // Nie rzucamy błędu dalej, aby nie przerywać głównych operacji (np. tworzenia wydarzenia)
  }
};

export default sendEmail;

// Funkcja do wysyłania emaila weryfikacyjnego
export const sendVerificationEmail = async (user) => {
  const verificationToken = user.generateEmailVerificationToken();
  await user.save();

  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  
  await sendEmail({
    to: user.email,
    subject: 'Weryfikacja adresu email',
    text: `Aby zweryfikować swój adres email, kliknij w link: ${verificationUrl}`,
    html: `
      <h1>Weryfikacja adresu email</h1>
      <p>Aby zweryfikować swój adres email, kliknij w poniższy link:</p>
      <a href="${verificationUrl}">Weryfikuj email</a>
      <p>Link wygaśnie za 24 godziny.</p>
    `
  });
}; 