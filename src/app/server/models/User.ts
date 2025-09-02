import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  companyName: string;
  logo?: string;
  firstName?: string;
  lastName?: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  logo: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  firstName: {
    type: String,
    required: false,
    trim: true
  },
  lastName: {
    type: String,
    required: false,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true
  },
  lastLogin: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ companyName: 1 });
UserSchema.index({ role: 1, isActive: 1 });

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
