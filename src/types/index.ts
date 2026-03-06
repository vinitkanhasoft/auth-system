import { Request } from 'express';
import { UserRoles } from '../enums/UserRoles';
import { TokenTypes } from '../enums/TokenTypes';

export interface IUser {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  phoneCountryCode?: string;
  address?: string;
  dateOfBirth?: Date;
  joinDate?: string;
  profileImage?: string;
  role: UserRoles;
  twoFactorEnabled?: boolean;
  isEmailVerified: boolean;
  isPhoneVerified?: boolean;
  tokens?: Array<{
    token: string;
    type: TokenTypes;
    expiresAt: Date;
    isRevoked: boolean;
    createdAt?: Date;
  }>;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IToken {
  userId: import('mongoose').Types.ObjectId;
  token: string;
  type: TokenTypes;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAuthRequest extends Request {
  user?: Partial<IUser> & { _id?: string };
  tokenData?: IJwtPayload;
}

export interface IJwtPayload {
  userId: string;
  email: string;
  role: UserRoles;
  type: TokenTypes;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface IRegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  phoneCountryCode?: string;
  address?: string;
  dateOfBirth?: string;
  profileImage?: string;
}

export interface ILoginData {
  email: string;
  password: string;
}

export interface IAuthResponse {
  user: Omit<IUser, 'password'>;
  accessToken: string;
  refreshToken: string;
}

export interface IPasswordResetRequest {
  email: string;
}

export interface IPasswordReset {
  token: string;
  newPassword: string;
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}

export interface IRateLimitInfo {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

export interface IRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<boolean>;
}

export interface IEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface IValidationError {
  field: string;
  message: string;
}

export interface ICustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}
