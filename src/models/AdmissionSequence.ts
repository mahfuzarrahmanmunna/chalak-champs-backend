import mongoose, { Document, Schema } from "mongoose";

interface IAdmissionSequence extends Document {
  year: number;
  sequence: number;
}

const AdmissionSequenceSchema = new Schema<IAdmissionSequence>({
  year: { type: Number, required: true, unique: true },
  sequence: { type: Number, required: true, default: 0 },
});

export default mongoose.model<IAdmissionSequence>(
  "AdmissionSequence",
  AdmissionSequenceSchema,
);
