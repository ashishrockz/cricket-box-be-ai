const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.text - Plain text content
   * @param {string} options.html - HTML content
   * @returns {Promise}
   */
  async sendEmail({ to, subject, text, html }) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Email error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send OTP email
   * @param {string} email - Recipient email
   * @param {string} otp - OTP code
   * @param {string} purpose - Purpose of OTP (login, password_reset, etc.)
   */
  async sendOTPEmail(email, otp, purpose = 'verification') {
    const purposeTexts = {
      verification: 'verify your email address',
      password_reset: 'reset your password',
      login: 'login to your account'
    };

    const subject = `Cricket Box - Your OTP Code`;
    const text = `Your OTP to ${purposeTexts[purpose] || purpose} is: ${otp}. This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .otp-box { background-color: #2563eb; color: white; font-size: 32px; letter-spacing: 8px; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏏 Cricket Box</h1>
          </div>
          <div class="content">
            <h2>Your OTP Code</h2>
            <p>Use the following OTP to ${purposeTexts[purpose] || purpose}:</p>
            <div class="otp-box">${otp}</div>
            <p><strong>This code will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</strong></p>
            <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Cricket Box. All rights reserved.</p>
            <p>This is an automated message. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send welcome email
   * @param {string} email - Recipient email
   * @param {string} name - User's name
   */
  async sendWelcomeEmail(email, name) {
    const subject = 'Welcome to Cricket Box! 🏏';
    const text = `Hi ${name}, Welcome to Cricket Box! Your account has been successfully created.`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .cta-button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .feature-list { list-style: none; padding: 0; }
          .feature-list li { padding: 8px 0; padding-left: 24px; position: relative; }
          .feature-list li:before { content: '✓'; position: absolute; left: 0; color: #2563eb; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏏 Cricket Box</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${name}! 🎉</h2>
            <p>Your Cricket Box account has been successfully created. Get ready to experience the ultimate box cricket management platform!</p>
            <h3>What you can do:</h3>
            <ul class="feature-list">
              <li>Create and join match rooms</li>
              <li>Set up teams and invite players</li>
              <li>Real-time ball-by-ball scoring</li>
              <li>Track your performance statistics</li>
              <li>View leaderboards and match history</li>
            </ul>
            <p>Start your cricket journey today!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Cricket Box. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send password reset success email
   * @param {string} email - Recipient email
   * @param {string} name - User's name
   */
  async sendPasswordResetSuccessEmail(email, name) {
    const subject = 'Password Reset Successful - Cricket Box';
    const text = `Hi ${name}, Your password has been successfully reset.`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .success-box { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏏 Cricket Box</h1>
          </div>
          <div class="content">
            <h2>Password Reset Successful</h2>
            <div class="success-box">
              <p>✓ Your password has been successfully changed</p>
            </div>
            <p>Hi ${name},</p>
            <p>This is a confirmation that your Cricket Box account password has been reset successfully.</p>
            <p>If you did not make this change, please contact our support team immediately.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Cricket Box. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send match invitation email
   * @param {string} email - Recipient email
   * @param {Object} options - Invitation options
   */
  async sendMatchInvitationEmail(email, { hostName, roomName, roomCode }) {
    const subject = `You're invited to a match - ${roomName}`;
    const text = `${hostName} has invited you to join a cricket match. Room Code: ${roomCode}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .room-code { background-color: #2563eb; color: white; font-size: 28px; letter-spacing: 4px; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏏 Cricket Box</h1>
          </div>
          <div class="content">
            <h2>You're Invited! 🎉</h2>
            <p><strong>${hostName}</strong> has invited you to join a cricket match.</p>
            <p><strong>Room:</strong> ${roomName}</p>
            <p>Use this code to join the room:</p>
            <div class="room-code">${roomCode}</div>
            <p>Open Cricket Box and enter this code to join the match!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Cricket Box. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();
