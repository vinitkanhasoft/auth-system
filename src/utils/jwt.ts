import jwt from 'jsonwebtoken';
import { TokenTypes } from '../enums/TokenTypes';
import { IJwtPayload } from '../types';

export class JwtUtils {
  private static accessTokenSecret = process.env.JWT_ACCESS_TOKEN_SECRET || 'default-access-secret';
  private static refreshTokenSecret =
    process.env.JWT_REFRESH_TOKEN_SECRET || 'default-refresh-secret';
  private static passwordResetSecret =
    process.env.JWT_PASSWORD_RESET_SECRET || 'default-password-reset-secret';
  private static emailVerificationSecret =
    process.env.JWT_EMAIL_VERIFICATION_SECRET || 'default-email-verification-secret';

  private static getSecret(tokenType: TokenTypes): string {
    switch (tokenType) {
      case TokenTypes.ACCESS_TOKEN:
        return this.accessTokenSecret;
      case TokenTypes.REFRESH_TOKEN:
        return this.refreshTokenSecret;
      case TokenTypes.PASSWORD_RESET:
        return this.passwordResetSecret;
      case TokenTypes.EMAIL_VERIFICATION:
        return this.emailVerificationSecret;
      default:
        throw new Error(`Invalid token type: ${tokenType}`);
    }
  }

  private static getExpirationTime(tokenType: TokenTypes): string {
    switch (tokenType) {
      case TokenTypes.ACCESS_TOKEN:
        return process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m';
      case TokenTypes.REFRESH_TOKEN:
        return process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d';
      case TokenTypes.PASSWORD_RESET:
        return process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '1h';
      case TokenTypes.EMAIL_VERIFICATION:
        return '24h';
      default:
        throw new Error(`Invalid token type: ${tokenType}`);
    }
  }

  public static generateToken(payload: Omit<IJwtPayload, 'type'>, tokenType: TokenTypes): string {
    const secret = this.getSecret(tokenType);
    const expiresIn = this.getExpirationTime(tokenType);

    const tokenPayload: IJwtPayload = {
      ...payload,
      type: tokenType,
    };

    const signOptions: jwt.SignOptions = {
      expiresIn: expiresIn as any,
      issuer: process.env.JWT_ISSUER || 'auth-system',
      audience: process.env.JWT_AUDIENCE || 'auth-users',
    };

    return jwt.sign(tokenPayload, secret, signOptions);
  }

  public static verifyToken(token: string, tokenType: TokenTypes): IJwtPayload {
    try {
      const secret = this.getSecret(tokenType);

      const decoded = jwt.verify(token, secret, {
        issuer: process.env.JWT_ISSUER || 'auth-system',
        audience: process.env.JWT_AUDIENCE || 'auth-users',
      }) as IJwtPayload;

      if (decoded.type !== tokenType) {
        throw new Error(`Token type mismatch. Expected: ${tokenType}, Got: ${decoded.type}`);
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw error;
      }
    }
  }

  public static decodeToken(token: string): IJwtPayload | null {
    try {
      return jwt.decode(token) as IJwtPayload;
    } catch (error) {
      return null;
    }
  }

  public static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp ? decoded.exp < currentTime : true;
    } catch (error) {
      return true;
    }
  }

  public static generateAccessToken(userId: string, email: string, role: string): string {
    return this.generateToken({ userId, email, role: role as any }, TokenTypes.ACCESS_TOKEN);
  }

  public static generateRefreshToken(userId: string, email: string, role: string): string {
    return this.generateToken({ userId, email, role: role as any }, TokenTypes.REFRESH_TOKEN);
  }

  public static generatePasswordResetToken(userId: string, email: string, role: string): string {
    return this.generateToken({ userId, email, role: role as any }, TokenTypes.PASSWORD_RESET);
  }

  public static generateEmailVerificationToken(
    userId: string,
    email: string,
    role: string
  ): string {
    return this.generateToken({ userId, email, role: role as any }, TokenTypes.EMAIL_VERIFICATION);
  }

  public static verifyAccessToken(token: string): IJwtPayload {
    return this.verifyToken(token, TokenTypes.ACCESS_TOKEN);
  }

  public static verifyRefreshToken(token: string): IJwtPayload {
    return this.verifyToken(token, TokenTypes.REFRESH_TOKEN);
  }

  public static verifyPasswordResetToken(token: string): IJwtPayload {
    return this.verifyToken(token, TokenTypes.PASSWORD_RESET);
  }

  public static verifyEmailVerificationToken(token: string): IJwtPayload {
    return this.verifyToken(token, TokenTypes.EMAIL_VERIFICATION);
  }

  public static getTokenExpirationDate(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return null;
      }
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  public static refreshAccessToken(refreshToken: string): string {
    const payload = this.verifyRefreshToken(refreshToken);
    return this.generateAccessToken(payload.userId, payload.email, payload.role);
  }
}
