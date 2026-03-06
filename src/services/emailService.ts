import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { IEmailOptions } from '../types';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('Email service configuration error:', error);
      } else {
        logger.info('Email service is ready to send messages');
      }
    });
  }

  private async sendEmail(options: IEmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  public async sendEmailVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.PASSWORD_RESET_URL || 'http://localhost:3000'}/auth/verify-email?token=${token}`;

    const htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">Email Verification</h2>
        <p>Thank you for registering! Please click the button below to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html: htmlContent,
      text: `Please verify your email by visiting: ${verificationUrl}`,
    });
  }

  public async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.PASSWORD_RESET_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`;

    const htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">Password Reset</h2>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html: htmlContent,
      text: `Reset your password by visiting: ${resetUrl}`,
    });
  }

  public async sendPasswordChangedEmail(email: string): Promise<void> {
    const htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">Password Changed Successfully</h2>
        <p>Your password has been successfully changed.</p>
        <p>If you didn't make this change, please contact our support team immediately.</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #28a745; color: white; padding: 12px 30px; 
                      border-radius: 5px; display: inline-block;">
            ✓ Password Updated
          </div>
        </div>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          For security reasons, we recommend using a strong, unique password.
        </p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Your Password Has Been Changed',
      html: htmlContent,
      text: "Your password has been successfully changed. If you didn't make this change, please contact support.",
    });
  }

  public async sendLoginNotificationEmail(
    email: string,
    loginInfo: { ip?: string; userAgent?: string; timestamp: Date }
  ): Promise<void> {
    const htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #333; text-align: center;">New Login Detected</h2>
        <p>We detected a new login to your account:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Time:</strong> ${loginInfo.timestamp.toLocaleString()}</p>
          ${loginInfo.ip ? `<p><strong>IP Address:</strong> ${loginInfo.ip}</p>` : ''}
          ${loginInfo.userAgent ? `<p><strong>Device:</strong> ${loginInfo.userAgent}</p>` : ''}
        </div>
        <p>If this was you, you can safely ignore this email.</p>
        <p>If you don't recognize this login, please secure your account immediately.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.PASSWORD_RESET_URL || 'http://localhost:3000'}/auth/change-password" 
             style="background-color: #ffc107; color: #212529; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Change Password
          </a>
        </div>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'New Login to Your Account',
      html: htmlContent,
      text: `New login detected at ${loginInfo.timestamp.toLocaleString()}. IP: ${loginInfo.ip || 'Unknown'}`,
    });
  }

  public async sendAccountLockedEmail(email: string): Promise<void> {
    const htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h2 style="color: #dc3545; text-align: center;">Account Temporarily Locked</h2>
        <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #f5c6cb;">
          <p style="margin: 0; color: #721c24;">
            <strong>Security Notice:</strong> This lock is for your protection. The account will automatically unlock after 15 minutes.
          </p>
        </div>
        <p>If you believe this is an error, please contact our support team.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.PASSWORD_RESET_URL || 'http://localhost:3000'}/auth/forgot-password" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Account Temporarily Locked',
      html: htmlContent,
      text: 'Your account has been temporarily locked due to multiple failed login attempts. It will unlock automatically after 15 minutes.',
    });
  }
}

export const emailService = new EmailService();
