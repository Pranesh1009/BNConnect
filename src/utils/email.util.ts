import sgMail from '@sendgrid/mail';
import logger from './logger';

// Validate required environment variables
const requiredEnvVars = ['SMTP_PASSWORD', 'SMTP_FROM'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required email configuration', { missingVars: missingEnvVars });
  throw new Error(`Missing required email configuration: ${missingEnvVars.join(', ')}`);
}

// Initialize SendGrid with API key
sgMail.setApiKey(process.env.SMTP_PASSWORD!);

// Send welcome email with credentials
export const sendWelcomeEmail = async (email: string, name: string, password: string) => {
  try {
    const msg = {
      to: email,
      from: 'pranesh.s1009@gmail.com',
      subject: 'Welcome to Business Lion - Your Account Details',
      html: `
        <h1>Welcome to Business Lion!</h1>
        <p>Dear ${name},</p>
        <p>Your account has been created successfully. Here are your login credentials:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p>For security reasons, please change your password after your first login.</p>
        <p>Best regards,<br>Business Lion Team</p>
      `
    };

    await sgMail.send(msg).then((response) => {
      logger.info('Welcome email sent successfully', { response, email, name, password });
    }).catch((error) => {
      logger.error('Failed to send welcome email', { error, email, name, password });
      throw error;
    });
  } catch (error) {
    logger.error('Failed to send welcome email', { error, email });
    throw error;
  }
}; 