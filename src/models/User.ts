import mongoose, { Document, Schema } from "mongoose";

export type UserRole = "student" | "teacher" | "instructor" | "admin";

export interface IUser extends Document {
  uid: string;
  _id: mongoose.Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phoneNumber?: string;
  avatar?: string;
  profileImageUrl?: string;
  profileImageKey?: string;
  role: UserRole;
  isActive: boolean;
  bio?: string;
  isEmailVerified: boolean; // ✅ ADDED
  isPhoneVerified: boolean; // ✅ ADDED
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: false, trim: true, default: "" },
    fullName: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    avatar: { type: String },
    profileImageUrl: { type: String },
    profileImageKey: { type: String, default: "" },
    role: {
      type: String,
      enum: ["student", "teacher", "instructor", "admin"],
      default: "student",
      index: true,
    },
    isActive: { type: Boolean, default: true },
    bio: { type: String, trim: true },
    isEmailVerified: { type: Boolean, default: false }, // ✅ ADDED
    isPhoneVerified: { type: Boolean, default: false }, // ✅ ADDED
  },
  { timestamps: true },
);

UserSchema.virtual("fullNameVirtual").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

export default mongoose.model<IUser>("User", UserSchema);
