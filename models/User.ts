import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  role: 'student' | 'instructor';
  fullName: string;
  department: string;
  // Student fields
  registrationNumber?: string;
  rollNumber?: string;
  section?: string;
  graduationYear?: number;
  // Instructor fields
  instructorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['student', 'instructor'],
      required: [true, 'Role is required'],
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
    },
    
    // Student specific fields
    registrationNumber: {
      type: String,
      required: function(this: any) {
        return this.role === 'student';
      },
    },
    rollNumber: {
      type: String,
      required: function(this: any) {
        return this.role === 'student';
      },
    },
    section: {
      type: String, // optional
    },
    graduationYear: {
      type: Number,
      required: function(this: any) {
        return this.role === 'student';
      },
    },

    // Instructor specific fields
    instructorId: {
      type: String,
      required: function(this: any) {
        return this.role === 'instructor';
      },
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
