import { Schema, model, Document, Model } from 'mongoose';

export interface ISessionData {
  sessionId: string;
  loginDate: Date;
  loginTime: string;
  device: string;
  ip: string;
  browser: string;
  os: string;
  location: string;
  lastActive: Date;
  active: boolean;
}

export interface ISessionDocument extends Document {
  userId: import('mongoose').Types.ObjectId;
  sessions: ISessionData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionModel extends Model<ISessionDocument> {
  findActiveByUser(userId: string): Promise<ISessionDocument | null>;
  addSession(userId: string, sessionData: Omit<ISessionData, 'loginDate' | 'lastActive'>): Promise<ISessionDocument>;
  removeSession(userId: string, sessionId: string): Promise<ISessionDocument | null>;
  updateLastActive(userId: string, sessionId: string): Promise<ISessionDocument | null>;
  deactivateSession(userId: string, sessionId: string): Promise<ISessionDocument | null>;
}

const sessionSchema = new Schema<ISessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    sessions: [
      {
        sessionId: {
          type: String,
          required: true,
          trim: true,
        },
        loginDate: {
          type: Date,
          required: true,
          default: Date.now,
        },
        loginTime: {
          type: String,
          required: true,
          default: function () {
            return new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit',
              hour12: true 
            });
          },
        },
        device: {
          type: String,
          required: true,
          trim: true,
        },
        ip: {
          type: String,
          required: true,
          trim: true,
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
        location: {
          type: String,
          required: true,
          trim: true,
        },
        lastActive: {
          type: Date,
          required: true,
          default: Date.now,
        },
        active: {
          type: Boolean,
          required: true,
          default: true,
        },
      },
    ],
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
  return this.findOne({ userId }).select('sessions');
};

// Static method to add a new session (max 4 sessions)
sessionSchema.statics.addSession = function (userId: string, sessionData: Omit<ISessionData, 'loginDate' | 'lastActive'>) {
  return this.findOneAndUpdate(
    { userId },
    { 
      $push: { 
        sessions: {
          $each: [{
            ...sessionData,
            loginDate: new Date(),
            lastActive: new Date(),
          }],
          $slice: -4 // Keep only the last 4 sessions
        }
      }
    },
    { upsert: true, new: true }
  );
};

// Static method to remove a session
sessionSchema.statics.removeSession = function (userId: string, sessionId: string) {
  return this.findOneAndUpdate(
    { userId },
    { $pull: { sessions: { sessionId } } },
    { new: true }
  );
};

// Static method to update last active time
sessionSchema.statics.updateLastActive = function (userId: string, sessionId: string) {
  return this.findOneAndUpdate(
    { userId, 'sessions.sessionId': sessionId },
    { $set: { 'sessions.$.lastActive': new Date() } },
    { new: true }
  );
};

// Static method to deactivate a specific session
sessionSchema.statics.deactivateSession = function (userId: string, sessionId: string) {
  return this.findOneAndUpdate(
    { userId, 'sessions.sessionId': sessionId },
    { $set: { 'sessions.$.active': false } },
    { new: true }
  );
};

const Session = model<ISessionDocument, ISessionModel>('Session', sessionSchema);

export default Session;
