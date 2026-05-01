import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";
import Batch from "../models/Batch";
import Course from "../models/Course";

// Helper to safely get a string from params (handles string | string[])
const getParam = (param: string | string[]): string => {
  return Array.isArray(param) ? param[0] : param;
};

export const createBatch = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const courseId = getParam(req.params.courseId);
    const { name, startDate, endDate, maxSeats, schedule, instructor } =
      req.body;

    const course = await Course.findById(courseId);
    if (!course) return next(new AppError("Course not found", 404));

    const batch = await Batch.create({
      course: courseId,
      name,
      instructor: instructor || req.user?._id,
      startDate,
      endDate,
      maxSeats,
      schedule,
    });

    res.status(201).json({ success: true, data: batch });
  },
);

export const getBatchesByCourse = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const courseId = getParam(req.params.courseId);
    const { page = 1, limit = 10, status = "all" } = req.query;

    // Define query type explicitly or handle courseId correctly
    const query: any = { course: courseId };

    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const batches = await Batch.find(query)
      .populate("instructor", "name email")
      .populate("enrolledStudents", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Batch.countDocuments(query);

    res.status(200).json({
      success: true,
      count: batches.length,
      pagination: { page: pageNum, pages: Math.ceil(total / limitNum), total },
      data: batches,
    });
  },
);

export const enrollInBatch = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const batchId = getParam(req.params.batchId);
    const userId = req.user!._id;

    const batch = await Batch.findById(batchId);
    if (!batch) return next(new AppError("Batch not found", 404));

    if (!batch.isActive) return next(new AppError("Batch is not active", 400));
    if (batch.enrolledStudents.length >= batch.maxSeats) {
      return next(new AppError("Batch is full", 400));
    }
    if (batch.enrolledStudents.includes(userId)) {
      return next(new AppError("Already enrolled", 400));
    }

    batch.enrolledStudents.push(userId);
    await batch.save();

    res
      .status(200)
      .json({ success: true, message: "Enrolled successfully", data: batch });
  },
);
