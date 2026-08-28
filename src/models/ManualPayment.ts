import mongoose, { Document, Schema } from "mongoose";

export interface IManualPayment extends Document {
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  userName: string;
  userPhone: string;
  paymentMethod: string;
  transactionId: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const ManualPaymentSchema = new Schema<IManualPayment>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    userName: { type: String, required: true },
    userPhone: { type: String, required: true },
    paymentMethod: { type: String, required: true, enum: ["bkash", "nagad", "rocket", "bank"] },
    transactionId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model<IManualPayment>("ManualPayment", ManualPaymentSchema);