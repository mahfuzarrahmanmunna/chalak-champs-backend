import mongoose, { Document, Schema } from "mongoose";
// REMOVED: import type { Request } from "express";

export type UserRole = "student" | "teacher" | "instructor" | "admin";

export interface IUser extends Document {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phoneNumber?: string;
  avatar?: string;
  role: UserRole; 
  isActive: boolean;
  bio?: string;
  [key: string]: any;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    fullName: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    avatar: { type: String },
    role: {
      type: String,
      enum: ["student", "teacher", "instructor", "admin"],
      default: "student",
      index: true,
    },
    isActive: { type: Boolean, default: true },
    bio: { type: String, trim: true },
  },
  { timestamps: true }
);

// UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

UserSchema.virtual("fullNameVirtual").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

// ONLY keep this one, delete the { role: 1 } index!
UserSchema.index({ email: 1 }); 

export default mongoose.model<IUser>("User", UserSchema);