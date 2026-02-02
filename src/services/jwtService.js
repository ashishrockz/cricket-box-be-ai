const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../utils/errors');

class JWTService {
  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @param {string} payload.id - User ID
   * @param {string} payload.email - User email
   * @param {string} payload.role - User role
   * @returns {string} - JWT access token
   */
  generateAccessToken(payload) {
    return jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        role: payload.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'cricket-box',
        audience: 'cricket-box-users'
      }
    );
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {string} - JWT refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(
      {
        id: payload.id,
        type: 'refresh'
      },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
        issuer: 'cricket-box',
        audience: 'cricket-box-users'
      }
    );
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object
   * @returns {Object} - { accessToken, refreshToken }
   */
  generateTokens(user) {
    const payload = {
      id: user._id || user.id,
      email: user.email,
      role: user.role
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * Verify access token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token payload
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'cricket-box',
        audience: 'cricket-box-users'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token');
      }
      throw new AuthenticationError('Token verification failed');
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - JWT refresh token
   * @returns {Object} - Decoded token payload
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
        issuer: 'cricket-box',
        audience: 'cricket-box-users'
      });

      if (decoded.type !== 'refresh') {
        throw new AuthenticationError('Invalid refresh token');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Refresh token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid refresh token');
      }
      throw new AuthenticationError('Refresh token verification failed');
    }
  }

  /**
   * Decode token without verification (for debugging)
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token payload
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} - Token or null
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split(' ')[1];
  }

  /**
   * Get token expiry time
   * @param {string} token - JWT token
   * @returns {Date|null} - Expiry date or null
   */
  getTokenExpiry(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }
    return new Date(decoded.exp * 1000);
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean}
   */
  isTokenExpired(token) {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    return expiry < new Date();
  }
}

module.exports = new JWTService();
