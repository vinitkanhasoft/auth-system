import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  description: string;
  altText: string;
  bannerImage: string;
  bannerImagePublicId: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema: Schema = new Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Banner description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  altText: {
    type: String,
    required: [true, 'Alt text is required for accessibility'],
    trim: true,
    maxlength: [100, 'Alt text cannot exceed 100 characters']
  },
  bannerImage: {
    type: String,
    required: [true, 'Banner image URL is required']
  },
  bannerImagePublicId: {
    type: String,
    required: [true, 'Banner image public ID is required for Cloudinary management']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret: Record<string, any>) {
      delete ret.__v;
      return ret;
    }
  }
});

// Index for better query performance
BannerSchema.index({ isActive: 1, displayOrder: 1 });
BannerSchema.index({ createdAt: -1 });

export const Banner = mongoose.model<IBanner>('Banner', BannerSchema);
