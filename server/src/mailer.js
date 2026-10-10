const nodemailer = require('nodemailer');

// In-memory record of emails that were not really sent (no SMTP configured). Used by tests.
const outbox = [];

let transporter;
function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587 (STARTTLS)
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sendVerificationEmail(to, name, link) {
  const transport = getTransporter();

  // No SMTP configured (local development or tests): don't send, keep the link instead.
  if (!transport) {
    outbox.push({ to, link });
    if (outbox.length > 50) outbox.shift();
    if (process.env.NODE_ENV !== 'test') {
      console.log(`\n[email not configured] Verification link for ${to}:\n${link}\n`);
    }
    return;
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Verify your email for Job Tracker',
    text:
      `Hi ${name || 'there'},\n\n` +
      `Confirm your email to finish creating your Job Tracker account:\n${link}\n\n` +
      `This link expires in 24 hours. If you did not sign up, you can ignore this email.`,
    html:
      `<p>Hi ${escapeHtml(name || 'there')},</p>` +
      `<p>Confirm your email to finish creating your Job Tracker account:</p>` +
      `<p><a href="${link}">Verify my email</a></p>` +
      `<p>Or paste this link into your browser:<br>${link}</p>` +
      `<p>This link expires in 24 hours. If you did not sign up, you can ignore this email.</p>`,
  });
}

module.exports = { sendVerificationEmail, outbox };