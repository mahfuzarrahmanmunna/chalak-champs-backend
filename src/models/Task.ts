import mongoose, { Document, Schema } from "mongoose";

export type TaskStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "completed"
  | "overdue";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface ITask extends Document {
  title: string;
  description: string;
  assignedTo: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: Date;
  attachments?: string[];
  submission?: {
    note?: string;
    files?: string[];
    submittedAt?: Date;
  };
  adminFeedback?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["assigned", "in_progress", "submitted", "completed", "overdue"],
      default: "assigned",
    },
    deadline: { type: Date, required: true },
    attachments: [{ type: String }],
    submission: {
      note: { type: String },
      files: [{ type: String }],
      submittedAt: { type: Date },
    },
    adminFeedback: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model<ITask>("Task", TaskSchema);
