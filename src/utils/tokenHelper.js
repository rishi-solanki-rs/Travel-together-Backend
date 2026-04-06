import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const signAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
};

const signRefreshToken = (payload) => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

const signPasswordResetToken = (payload) => {
  return jwt.sign(payload, env.PASSWORD_RESET_SECRET, { expiresIn: env.PASSWORD_RESET_EXPIRES_IN });
};

const verifyPasswordResetToken = (token) => {
  return jwt.verify(token, env.PASSWORD_RESET_SECRET);
};

const generateTokenPair = (payload) => ({
  accessToken: signAccessToken(payload),
  refreshToken: signRefreshToken(payload),
});

export default {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
  generateTokenPair,
};
