// src/models/User.ts

import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  uid: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    uid: { type: String, required: true, unique: true },
    firstName: {
      type: String,
      required: function (this: IUser) {
        // Only require firstName if not a temporary Firebase user
        return !this.uid.startsWith("temp_");
      },
      default: "",
    },
    lastName: {
      type: String,
      required: function (this: IUser) {
        // Only require lastName if not a temporary Firebase user
        return !this.uid.startsWith("temp_");
      },
      default: "",
    },
    email: {
      type: String,
      sparse: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      sparse: true,
      unique: true,
    },
    role: { type: String, default: "student" },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<IUser>("User", UserSchema);
