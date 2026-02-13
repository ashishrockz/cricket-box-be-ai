const { User } = require('../models');
const jwtService = require('../services/jwtService');
const emailService = require('../services/emailService');
const { 
  generateOTP, 
  generateToken, 
  hashToken, 
  calculateOTPExpiry, 
  isOTPExpired 
} = require('../utils/helpers');
const { 
  successResponse, 
  createdResponse 
} = require('../utils/response');
const { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError, 
  ConflictError,
  ERROR_CODES,
  ERROR_MESSAGES 
} = require('../utils/errors');
const { ACCOUNT_STATUS, OTP } = require('../config/constants');

/**
 * @desc    Register a new user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = async (req, res) => {
  const { username, email, password, firstName, lastName, phone } = req.body;

  // Check if email already exists
  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    throw new ConflictError(ERROR_MESSAGES[ERROR_CODES.EMAIL_ALREADY_EXISTS]);
  }

  // Check if username already exists
  const existingUsername = await User.findOne({ username: username.toLowerCase() });
  if (existingUsername) {
    throw new ConflictError(ERROR_MESSAGES[ERROR_CODES.USERNAME_ALREADY_EXISTS]);
  }

  // Generate email verification OTP
  const otp = generateOTP();

  // Create user
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password,
    firstName,
    lastName,
    phone,
    otp: {
      code: otp,
      expiresAt: calculateOTPExpiry(),
      attempts: 0
    },
    status: ACCOUNT_STATUS.PENDING_VERIFICATION
  });

  // Send verification email (don't await - send in background)
  emailService.sendOTPEmail(email, otp, 'verification')
    .catch(error => console.error('Failed to send verification email:', error));

  // Generate tokens
  const tokens = jwtService.generateTokens(user);

  // Update user with refresh token using updateOne to avoid triggering pre-save hooks
  await User.updateOne(
    { _id: user._id },
    { $set: { refreshToken: tokens.refreshToken } }
  );

  return createdResponse(res, {
    message: 'Registration successful. Please verify your email.',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified
      },
      tokens
    }
  });
};

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  // Find user by credentials
  const { user, error } = await User.findByCredentials(email, password);

  if (error) {
    const errorMessages = {
      INVALID_CREDENTIALS: ERROR_MESSAGES[ERROR_CODES.INVALID_CREDENTIALS],
      ACCOUNT_LOCKED: ERROR_MESSAGES[ERROR_CODES.ACCOUNT_LOCKED],
      ACCOUNT_BLOCKED: ERROR_MESSAGES[ERROR_CODES.ACCOUNT_BLOCKED],
      ACCOUNT_INACTIVE: ERROR_MESSAGES[ERROR_CODES.ACCOUNT_INACTIVE]
    };
    throw new AuthenticationError(errorMessages[error] || 'Login failed');
  }

  // Generate tokens
  const tokens = jwtService.generateTokens(user);

  // Update user using updateOne to avoid triggering pre-save hooks
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        refreshToken: tokens.refreshToken,
        lastLogin: new Date()
      }
    }
  );

  return successResponse(res, {
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar
      },
      tokens
    }
  });
};

/**
 * @desc    Verify email with OTP
 * @route   POST /api/v1/auth/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  if (user.isEmailVerified) {
    throw new ValidationError('Email is already verified');
  }

  // Check OTP expiry
  if (!user.otp || !user.otp.code || isOTPExpired(user.otp.expiresAt)) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.OTP_EXPIRED]);
  }

  // Check max attempts
  if (user.otp.attempts >= OTP.MAX_ATTEMPTS) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.OTP_MAX_ATTEMPTS]);
  }

  // Verify OTP
  if (user.otp.code !== otp) {
    await User.updateOne(
      { _id: user._id },
      { $inc: { 'otp.attempts': 1 } }
    );
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.OTP_INVALID]);
  }

  // Update user using updateOne
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        isEmailVerified: true,
        status: ACCOUNT_STATUS.ACTIVE
      },
      $unset: { otp: 1 }
    }
  );

  // Send welcome email (don't await - send in background)
  emailService.sendWelcomeEmail(user.email, user.firstName)
    .catch(error => console.error('Failed to send welcome email:', error));

  return successResponse(res, {
    message: 'Email verified successfully'
  });
};

/**
 * @desc    Resend verification OTP
 * @route   POST /api/v1/auth/resend-otp
 * @access  Public
 */
const resendOTP = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  if (user.isEmailVerified) {
    throw new ValidationError('Email is already verified');
  }

  // Generate new OTP
  const otp = generateOTP();

  // Update user with new OTP using updateOne
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        otp: {
          code: otp,
          expiresAt: calculateOTPExpiry(),
          attempts: 0
        }
      }
    }
  );

  // Send OTP email
  await emailService.sendOTPEmail(email, otp, 'verification');

  return successResponse(res, {
    message: 'OTP sent successfully'
  });
};

/**
 * @desc    Forgot password - Send OTP
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if email exists
    return successResponse(res, {
      message: 'If an account exists with this email, you will receive a password reset OTP'
    });
  }

  // Generate OTP
  const otp = generateOTP();

  // Update user with OTP using updateOne
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        otp: {
          code: otp,
          expiresAt: calculateOTPExpiry(),
          attempts: 0
        }
      }
    }
  );

  // Send OTP email
  await emailService.sendOTPEmail(email, otp, 'password_reset');

  return successResponse(res, {
    message: 'If an account exists with this email, you will receive a password reset OTP'
  });
};

/**
 * @desc    Reset password with OTP
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  // Check OTP expiry
  if (!user.otp || !user.otp.code || isOTPExpired(user.otp.expiresAt)) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.OTP_EXPIRED]);
  }

  // Check max attempts
  if (user.otp.attempts >= OTP.MAX_ATTEMPTS) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.OTP_MAX_ATTEMPTS]);
  }

  // Verify OTP
  if (user.otp.code !== otp) {
    await User.updateOne(
      { _id: user._id },
      { $inc: { 'otp.attempts': 1 } }
    );
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.OTP_INVALID]);
  }

  // Update password - this will trigger pre-save hook to hash the password
  user.password = newPassword;
  await user.save();

  // Clear OTP and refresh token using updateOne
  await User.updateOne(
    { _id: user._id },
    {
      $unset: { otp: 1, refreshToken: 1 }
    }
  );

  // Send confirmation email (don't await - send in background)
  emailService.sendPasswordResetSuccessEmail(user.email, user.firstName)
    .catch(error => console.error('Failed to send password reset confirmation email:', error));

  return successResponse(res, {
    message: 'Password reset successful. Please login with your new password.'
  });
};

/**
 * @desc    Change password (logged in user)
 * @route   POST /api/v1/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AuthenticationError('Current password is incorrect');
  }

  // Update password - this will trigger pre-save hook to hash the password
  user.password = newPassword;
  await user.save();

  // Generate new tokens and update refresh token
  const tokens = jwtService.generateTokens(user);
  await User.updateOne(
    { _id: user._id },
    { $set: { refreshToken: tokens.refreshToken } }
  );

  return successResponse(res, {
    message: 'Password changed successfully',
    data: { tokens }
  });
};

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public
 */
const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;

  // Verify refresh token
  const decoded = jwtService.verifyRefreshToken(token);

  // Find user
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AuthenticationError('User not found');
  }

  // Verify refresh token matches stored token
  if (user.refreshToken !== token) {
    throw new AuthenticationError('Invalid refresh token');
  }

  // Generate new tokens
  const tokens = jwtService.generateTokens(user);

  // Update refresh token using updateOne
  await User.updateOne(
    { _id: user._id },
    { $set: { refreshToken: tokens.refreshToken } }
  );

  return successResponse(res, {
    message: 'Token refreshed successfully',
    data: { tokens }
  });
};

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
const logout = async (req, res) => {
  // Clear refresh token using updateOne
  await User.updateOne(
    { _id: req.user._id },
    { $unset: { refreshToken: 1 } }
  );

  return successResponse(res, {
    message: 'Logged out successfully'
  });
};

/**
 * @desc    Get current user profile
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id);

  return successResponse(res, {
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        statistics: user.statistics,
        createdAt: user.createdAt
      }
    }
  });
};

/**
 * @desc    OTP-based login (for forgot password scenario)
 * @route   POST /api/v1/auth/otp-login
 * @access  Public
 */
const otpLogin = async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new NotFoundError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND]);
  }

  // Check account status
  if (user.status === ACCOUNT_STATUS.BLOCKED) {
    throw new AuthenticationError(ERROR_MESSAGES[ERROR_CODES.ACCOUNT_BLOCKED]);
  }

  // Check OTP expiry
  if (!user.otp || !user.otp.code || isOTPExpired(user.otp.expiresAt)) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.OTP_EXPIRED]);
  }

  // Check max attempts
  if (user.otp.attempts >= OTP.MAX_ATTEMPTS) {
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.OTP_MAX_ATTEMPTS]);
  }

  // Verify OTP
  if (user.otp.code !== otp) {
    await User.updateOne(
      { _id: user._id },
      { $inc: { 'otp.attempts': 1 } }
    );
    throw new ValidationError(ERROR_MESSAGES[ERROR_CODES.OTP_INVALID]);
  }

  // Generate tokens
  const tokens = jwtService.generateTokens(user);

  // Clear OTP and update user using updateOne
  await User.updateOne(
    { _id: user._id },
    {
      $unset: { otp: 1 },
      $set: {
        refreshToken: tokens.refreshToken,
        lastLogin: new Date()
      }
    }
  );

  return successResponse(res, {
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified
      },
      tokens
    }
  });
};

/**
 * @desc    Request OTP for login
 * @route   POST /api/v1/auth/request-login-otp
 * @access  Public
 */
const requestLoginOTP = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Don't reveal if email exists
    return successResponse(res, {
      message: 'If an account exists with this email, you will receive a login OTP'
    });
  }

  // Generate OTP
  const otp = generateOTP();

  // Update user with OTP using updateOne
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        otp: {
          code: otp,
          expiresAt: calculateOTPExpiry(),
          attempts: 0
        }
      }
    }
  );

  // Send OTP email
  await emailService.sendOTPEmail(email, otp, 'login');

  return successResponse(res, {
    message: 'If an account exists with this email, you will receive a login OTP'
  });
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendOTP,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  logout,
  getMe,
  otpLogin,
  requestLoginOTP
};
