import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import Task from "../models/Task";
import User from "../models/User";

// Helper to check overdue tasks
const checkOverdue = async () => {
  await Task.updateMany(
    {
      status: { $in: ["assigned", "in_progress"] },
      deadline: { $lt: new Date() },
    },
    { $set: { status: "overdue" } },
  );
};

export const createTask = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== "admin") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }
    const { title, description, assignedTo, priority, deadline, attachments } =
      req.body;

    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedBy: req.user._id,
      priority,
      deadline,
      attachments,
    });

    // Optional: Send notification here
    res.status(201).json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTasks = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    await checkOverdue();
    const { status, priority, search, assignedTo } = req.query;

    const query: any = {};
    if (req.user?.role !== "admin") {
      query.assignedTo = req.user?._id; // Students only see their tasks
    } else {
      if (assignedTo) query.assignedTo = assignedTo;
    }
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const tasks = await Task.find(query)
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedBy", "firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, tasks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTask = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== "admin") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }
    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findByIdAndUpdate(id, updates, { new: true });
    if (!task) {
      res.status(404).json({ success: false, message: "Task not found" });
      return;
    }
    res.status(200).json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTask = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== "admin") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }
    const { id } = req.params;
    await Task.findByIdAndDelete(id);
    res
      .status(200)
      .json({ success: true, message: "Task deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Student submits task
export const submitTask = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { note, files } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({ success: false, message: "Task not found" });
      return;
    }
    if (task.assignedTo.toString() !== req.user?._id.toString()) {
      res.status(403).json({ success: false, message: "Not authorized" });
      return;
    }

    task.submission = { note, files, submittedAt: new Date() };
    task.status = "submitted";
    await task.save();

    res.status(200).json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin reviews submission
export const reviewSubmission = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== "admin") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }
    const { id } = req.params;
    const { action, adminFeedback } = req.body; // action: 'complete' or 'reject'

    const task = await Task.findById(id);
    if (!task || task.status !== "submitted") {
      res
        .status(400)
        .json({ success: false, message: "Task not found or not submitted" });
      return;
    }

    task.adminFeedback = adminFeedback;
    if (action === "complete") {
      task.status = "completed";
      task.completedAt = new Date();
    } else {
      task.status = "in_progress"; // Send back to student
    }
    await task.save();

    res.status(200).json({ success: true, task });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Dashboard Stats
export const getTaskStats = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const matchStage =
      req.user?.role === "admin" ? {} : { assignedTo: req.user?._id };

    const stats = await Task.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats: any = {
      total: 0,
      assigned: 0,
      in_progress: 0,
      submitted: 0,
      completed: 0,
      overdue: 0,
    };
    stats.forEach((s) => (formattedStats[s._id] = s.count));
    formattedStats.total =
      Object.values(formattedStats).reduce((a: number, b: any) => a + b, 0) -
      (formattedStats.total || 0);

    res.status(200).json({ success: true, stats: formattedStats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
