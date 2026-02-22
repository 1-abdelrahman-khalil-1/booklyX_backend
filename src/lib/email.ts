import nodemailer from "nodemailer";

// Create reusable transporter
// For development: use Ethereal (fake SMTP) or configure with real SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends email verification code (6 digits) to user
 */
export async function sendEmailVerification(
  email: string,
  code: string,
): Promise<void> {
  // await transporter.sendMail({
  //   from: process.env.EMAIL_FROM || '"BooklyX" <noreply@booklyx.com>',
  //   to: email,
  //   subject: "Your Email Verification Code",
  //   html: `
  //     <h1>Email Verification</h1>
  //     <p>Thank you for registering with BooklyX!</p>
  //     <p>Your verification code is:</p>
  //     <h2 style="font-size: 32px; letter-spacing: 5px; color: #007bff;">${code}</h2>
  //     <p>Enter this code in the app to verify your email address.</p>
  //     <p>This code will expire in 10 minutes.</p>
  //     <p>If you didn't create an account, please ignore this email.</p>
  //   `,
  // });
}

/**
 * Sends password reset OTP code to user
 */
export async function sendPasswordResetEmail(
  email: string,
  code: string,
): Promise<void> {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"BooklyX" <noreply@booklyx.com>',
    to: email,
    subject: "Your Password Reset Code",
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password for your BooklyX account.</p>
      <p>Your password reset code is:</p>
      <h2 style="font-size: 32px; letter-spacing: 5px; color: #dc3545;">${code}</h2>
      <p>Enter this code in the app to reset your password.</p>
      <p>This code will expire in ${process.env.VERIFICATION_CODE_EXPIRES_MINUTES || 10} minutes.</p>
      <p>If you didn't request a password reset, please ignore this email.</p>
    `,
  });
}

/**
 * Sends phone verification code via email (temporary, until SMS is integrated)
 */
export async function sendPhoneVerificationCode(
  email: string,
  code: string,
): Promise<void> {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"BooklyX" <noreply@booklyx.com>',
    to: email,
    subject: "Your Phone Verification Code",
    html: `
      <h1>Phone Verification</h1>
      <p>Your verification code is:</p>
      <h2 style="font-size: 32px; letter-spacing: 5px; color: #007bff;">${code}</h2>
      <p>Enter this code in the app to verify your phone number.</p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    `,
  });
}
