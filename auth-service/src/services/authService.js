const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-2024';
const JWT_EXPIRY = '24h';

class AuthService {
  async handleOAuthToken({ email, name, provider, providerId }) {
    // Find or create user
    let user = await userRepository.findByEmail(email);

    if (!user) {
      user = await userRepository.create({ email, name, provider, providerId });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return { accessToken: token };
  }

  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return {
        valid: true,
        claims: {
          sub: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          exp: decoded.exp
        }
      };
    } catch (error) {
      return { valid: false };
    }
  }
}

module.exports = new AuthService();
