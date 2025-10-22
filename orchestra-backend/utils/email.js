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
});

/**
 * Wysyła e-mail.
 * @param {object} options - Opcje maila.
 * @param {string} options.to - Adres e-mail odbiorcy.
 * @param {string} options.subject - Temat maila.
 * @param {string} options.html - Treść maila w formacie HTML.
 */
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `"Artesymfoniko" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Wiadomość wysłana: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Błąd podczas wysyłania e-maila:', error);
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