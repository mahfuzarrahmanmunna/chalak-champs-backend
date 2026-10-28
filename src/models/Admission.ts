import mongoose, { Document, Schema } from "mongoose";

export type AdmissionStatus =
  | "Submitted"
  | "Under Review"
  | "Additional Information Required"
  | "Approved"
  | "Rejected"
  | "Enrolled";

export interface IAdmission extends Document {
  applicationNumber: string;
  student: {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth?: Date;
    gender?: string;
    presentAddress?: string;
    permanentAddress?: string;
  };
  guardian: {
    fullName: string;
    relationship?: string;
    phone: string;
    email?: string;
  };
  education: {
    qualification?: string;
    institution?: string;
    passingYear?: number;
    details?: string;
  };
  course: mongoose.Types.ObjectId;
  courseTitle: string;
  preferredBatch?: string;
  motivation?: string;
  previousExperience?: string;
  status: AdmissionStatus;
  statusHistory: {
    status: AdmissionStatus;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
  }[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdmissionSchema = new Schema<IAdmission>(
  {
    applicationNumber: { type: String, required: true, unique: true, index: true },
    student: {
      fullName: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
      dateOfBirth: Date,
      gender: { type: String, trim: true },
      presentAddress: { type: String, trim: true },
      permanentAddress: { type: String, trim: true },
    },
    guardian: {
      fullName: { type: String, required: true, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },
    education: {
      qualification: { type: String, trim: true },
      institution: { type: String, trim: true },
      passingYear: Number,
      details: { type: String, trim: true },
    },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    courseTitle: { type: String, required: true, trim: true },
    preferredBatch: { type: String, trim: true },
    motivation: { type: String, trim: true },
    previousExperience: { type: String, trim: true },
    status: {
      type: String,
      enum: [
        "Submitted",
        "Under Review",
        "Additional Information Required",
        "Approved",
        "Rejected",
        "Enrolled",
      ],
      default: "Submitted",
      required: true,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        changedAt: { type: Date, required: true, default: Date.now },
        _id: false,
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IAdmission>("Admission", AdmissionSchema);
