import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from './logger.js';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    pool: true,
    maxConnections: 5,
  });

  return transporter;
};

const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  try {
    const info = await getTransporter().sendMail({
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text,
      attachments,
    });
    logger.info({ messageId: info.messageId, to, subject }, 'Email sent');
    return info;
  } catch (err) {
    logger.error({ err, to, subject }, 'Email send failed');
    throw err;
  }
};

const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to Together In India!',
    html: `<h1>Welcome, ${name}!</h1><p>We're thrilled to have you on Together In India — your gateway to incredible Indian experiences.</p>`,
  }),
  verifyEmail: (name, otp) => ({
    subject: 'Verify Your Email — Together In India',
    html: `<h2>Hi ${name},</h2><p>Your email verification OTP is: <strong>${otp}</strong></p><p>This OTP expires in 10 minutes.</p>`,
  }),
  passwordReset: (name, resetUrl) => ({
    subject: 'Reset Your Password — Together In India',
    html: `<h2>Hi ${name},</h2><p>Click below to reset your password:</p><a href="${resetUrl}">Reset Password</a><p>Link expires in 1 hour.</p>`,
  }),
  vendorApproved: (vendorName) => ({
    subject: 'Your Vendor Account is Approved!',
    html: `<h2>Congratulations, ${vendorName}!</h2><p>Your vendor account on Together In India has been approved. You can now start listing your services.</p>`,
  }),
  vendorRejected: (vendorName, reason) => ({
    subject: 'Vendor Application Update — Together In India',
    html: `<h2>Hi ${vendorName},</h2><p>Unfortunately your vendor application was not approved at this time.</p><p>Reason: ${reason}</p>`,
  }),
  slotExpiry: (vendorName, slotType, expiryDate) => ({
    subject: 'Your Premium Slot is Expiring Soon',
    html: `<h2>Hi ${vendorName},</h2><p>Your ${slotType} slot expires on <strong>${expiryDate}</strong>. Renew now to maintain your premium visibility.</p>`,
  }),
  inquiryReceived: (vendorName, listingName) => ({
    subject: `New Inquiry for ${listingName}`,
    html: `<h2>Hi ${vendorName},</h2><p>You have received a new inquiry for <strong>${listingName}</strong>. Please login to view and respond.</p>`,
  }),
  luckyDrawWinner: (name, prize) => ({
    subject: '🎉 You Won! Together In India Lucky Draw',
    html: `<h2>Congratulations ${name}!</h2><p>You have won: <strong>${prize}</strong> in the Together In India Lucky Draw!</p>`,
  }),
};

export { sendEmail, emailTemplates };
