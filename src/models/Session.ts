import { Schema, model, Document, Model } from 'mongoose';

export interface IActiveSession {
  device: string;
  location: string;
  ip: string;
  lastActive: string;
  active: boolean;
  browser: string;
  os: string;
  sessionId: string;
}

export interface ISessionDocument extends IActiveSession, Document {
  userId: import('mongoose').Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionModel extends Model<ISessionDocument> {
  findActiveByUser(userId: string): Promise<ISessionDocument[]>;
  findBySessionId(sessionId: string): Promise<ISessionDocument | null>;
  deactivateAllExcept(userId: string, currentSessionId: string): Promise<any>;
  deactivateSession(sessionId: string): Promise<any>;
}

const sessionSchema = new Schema<ISessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    device: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    ip: {
      type: String,
      required: true,
      trim: true,
    },
    lastActive: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    browser: {
      type: String,
      required: true,
      trim: true,
    },
    os: {
      type: String,
      required: true,
      trim: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (doc: any, ret: any) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for better performance
sessionSchema.index({ userId: 1, active: 1 });
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ createdAt: -1 });

// Static method to find active sessions by user
sessionSchema.statics.findActiveByUser = function (userId: string) {
  return this.find({ userId, active: true }).sort({ createdAt: -1 });
};

// Static method to find session by sessionId
sessionSchema.statics.findBySessionId = function (sessionId: string) {
  return this.findOne({ sessionId });
};

// Static method to deactivate all user sessions except current
sessionSchema.statics.deactivateAllExcept = function (userId: string, currentSessionId: string) {
  return this.updateMany({ userId, sessionId: { $ne: currentSessionId } }, { active: false });
};

// Static method to deactivate specific session
sessionSchema.statics.deactivateSession = function (sessionId: string) {
  return this.updateOne({ sessionId }, { active: false });
};

const Session = model<ISessionDocument, ISessionModel>('Session', sessionSchema);

export default Session;
