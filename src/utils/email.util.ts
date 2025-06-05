import nodemailer from 'nodemailer';
import logger from './logger';

// Validate required environment variables
const requiredEnvVars = ['SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required email configuration', { missingVars: missingEnvVars });
  throw new Error(`Missing required email configuration: ${missingEnvVars.join(', ')}`);
}

// Create a transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Send welcome email with credentials
export const sendWelcomeEmail = async (email: string, name: string, password: string) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Welcome to BNI Connect - Your Account Details',
      html: `
        <h1>Welcome to BNI Connect!</h1>
        <p>Dear ${name},</p>
        <p>Your account has been created successfully. Here are your login credentials:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p>For security reasons, please change your password after your first login.</p>
        <p>Best regards,<br>BNI Connect Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info('Welcome email sent successfully', { email });
  } catch (error) {
    logger.error('Failed to send welcome email', { error, email });
    throw error;
  }
}; 