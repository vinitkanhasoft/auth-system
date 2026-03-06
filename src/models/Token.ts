import { Schema, model, Document } from 'mongoose';
import { IToken } from '../types';
import { TokenTypes } from '../enums/TokenTypes';

export interface TokenDocument extends IToken, Document {}

const tokenSchema = new Schema<TokenDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TokenTypes),
      required: [true, 'Token type is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'tokens',
  }
);

// Index for efficient queries
tokenSchema.index({ userId: 1, type: 1, isRevoked: 1 });
tokenSchema.index({ token: 1, isRevoked: 1 });

// Method to check if token is expired
tokenSchema.methods.isExpired = function (): boolean {
  return this.expiresAt < new Date();
};

// Method to check if token is valid (not expired and not revoked)
tokenSchema.methods.isValid = function (): boolean {
  return !this.isRevoked && !this.isExpired();
};

// Static method to find valid tokens
tokenSchema.statics.findValidToken = function (token: string, type?: TokenTypes) {
  const query: any = {
    token,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  };

  if (type) {
    query.type = type;
  }

  return this.findOne(query).populate('userId');
};

// Static method to revoke all tokens for a user
tokenSchema.statics.revokeAllUserTokens = function (userId: string, type?: TokenTypes) {
  const query: any = { userId, isRevoked: false };

  if (type) {
    query.type = type;
  }

  return this.updateMany(query, { isRevoked: true });
};

// Static method to clean up expired tokens
tokenSchema.statics.cleanupExpiredTokens = function () {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
  });
};

export default model<TokenDocument>('Token', tokenSchema);
