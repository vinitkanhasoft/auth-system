import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserRoles } from '../enums/UserRoles';
import { TokenTypes } from '../enums/TokenTypes';
import { IUser } from '../types';
import Session, { ISessionDocument } from './Session';

export interface UserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  getPublicProfile(): Omit<
    IUser,
    | 'password'
    | 'passwordResetToken'
    | 'passwordResetExpires'
    | 'emailVerificationToken'
    | 'emailVerificationExpires'
  >;
  getActiveSessions(): Promise<ISessionDocument[]>;
  addToken(token: string, type: TokenTypes, expiresAt: Date): Promise<UserDocument>;
  findValidToken(token: string, type: TokenTypes): any;
  revokeAllTokens(type?: TokenTypes): Promise<UserDocument>;
  revokeToken(token: string): Promise<UserDocument>;
}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\d\s\-\(\)]+$/, 'Please enter a valid phone number'],
    },
    phoneCountryCode: {
      type: String,
      trim: true,
      match: [/^\+\d{1,3}$/, 'Please enter a valid country code'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (value: Date) {
          return !value || value < new Date();
        },
        message: 'Date of birth must be in the past',
      },
    },
    joinDate: {
      type: String,
      trim: true,
      default: function () {
        return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      },
    },
    profileImage: {
      type: String,
      trim: true,
      default: function () {
        return `/avatars/${this.firstName?.toLowerCase()}-${this.lastName?.toLowerCase()}.jpg`;
      },
    },
    role: {
      type: String,
      enum: Object.values(UserRoles),
      default: UserRoles.USER,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    tokens: [
      {
        token: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: Object.values(TokenTypes),
          required: true,
        },
        expiresAt: {
          type: Date,
          required: true,
        },
        isRevoked: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc: any, ret: any) {
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    if (this.password) {
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function (): Omit<
  IUser,
  | 'password'
  | 'passwordResetToken'
  | 'passwordResetExpires'
  | 'emailVerificationToken'
  | 'emailVerificationExpires'
> {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  delete user.__v;
  return user;
};

// Static method to find user by email with password
userSchema.statics.findByEmailWithPassword = function (email: string) {
  return this.findOne({ email }).select('+password');
};

// Static method to find user by verification token
userSchema.statics.findByVerificationToken = function (token: string) {
  return this.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');
};

// Static method to find user by password reset token
userSchema.statics.findByPasswordResetToken = function (token: string) {
  return this.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');
};

// Instance method to get active sessions
userSchema.methods.getActiveSessions = async function () {
  return await Session.findActiveByUser(this._id);
};

// Instance method to add token
userSchema.methods.addToken = function (token: string, type: TokenTypes, expiresAt: Date) {
  this.tokens.push({
    token,
    type,
    expiresAt,
    isRevoked: false,
    createdAt: new Date(),
  });
  return this.save();
};

// Instance method to find valid token
userSchema.methods.findValidToken = function (token: string, type: TokenTypes) {
  return this.tokens.find(
    (t: {
      token: string;
      type: TokenTypes;
      expiresAt: Date;
      isRevoked: boolean;
      createdAt?: Date;
    }) => t.token === token && t.type === type && !t.isRevoked && t.expiresAt > new Date()
  );
};

// Instance method to revoke all tokens
userSchema.methods.revokeAllTokens = function (type?: TokenTypes) {
  if (type) {
    this.tokens.forEach(
      (token: {
        token: string;
        type: TokenTypes;
        expiresAt: Date;
        isRevoked: boolean;
        createdAt?: Date;
      }) => {
        if (token.type === type) token.isRevoked = true;
      }
    );
  } else {
    this.tokens.forEach(
      (token: {
        token: string;
        type: TokenTypes;
        expiresAt: Date;
        isRevoked: boolean;
        createdAt?: Date;
      }) => (token.isRevoked = true)
    );
  }
  return this.save();
};

// Instance method to revoke specific token
userSchema.methods.revokeToken = function (token: string) {
  const tokenObj = this.tokens.find(
    (t: {
      token: string;
      type: TokenTypes;
      expiresAt: Date;
      isRevoked: boolean;
      createdAt?: Date;
    }) => t.token === token
  );
  if (tokenObj) {
    tokenObj.isRevoked = true;
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to cleanup expired tokens
userSchema.statics.cleanupExpiredTokens = function () {
  return this.updateMany({}, { $pull: { tokens: { expiresAt: { $lt: new Date() } } } });
};

const User = model<UserDocument>('User', userSchema);

export default User;
