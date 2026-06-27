import mongoose, { Document, Schema } from "mongoose";

export interface IContact extends Document {
  studentName: string;
  fatherName: string;
  phone: string;
  class: string;
  country: {
    name: string;
    flag: string;
    code: string;
    cca2: string;
  };
  submittedAt: Date;
}

const ContactSchema: Schema = new Schema(
  {
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    fatherName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    class: {
      type: String,
      required: true,
    },
    country: {
      name: { type: String },
      flag: { type: String },
      code: { type: String },
      cca2: { type: String },
    },
  },
  { timestamps: true },
);

const Contact =
  mongoose.models.Contact || mongoose.model<IContact>("Contact", ContactSchema);

export default Contact;
