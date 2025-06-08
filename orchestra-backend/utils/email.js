import nodemailer from 'nodemailer';

// Konfiguracja transportera email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Funkcja do wysyłania emaili
export const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailOptions = {
      from: `"Orkiestra" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

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