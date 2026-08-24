import { Request, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import { catchAsync } from "../middleware/errorHandler";
import Progress from "../models/Progress";
import Module from "../models/Module";

// @desc    Mark a lesson as complete
// @route   POST /api/courses/:courseId/modules/:moduleId/lessons/:lessonId/complete
// @access  Private
export const markLessonComplete = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { courseId, lessonId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Find or create progress document
    let progress = await Progress.findOne({ user: userId, course: courseId });
    if (!progress) {
      progress = new Progress({
        user: userId,
        course: courseId,
        completedLessons: [],
      });
    }

    // ✅ FIX: Cast lessonId to String to avoid 'string | string[]' type error
    const lessonObjectId = new mongoose.Types.ObjectId(String(lessonId));

    if (!progress.completedLessons.some((id) => id.equals(lessonObjectId))) {
      progress.completedLessons.push(lessonObjectId);
    }

    progress.lastAccessedLesson = lessonObjectId;
    await progress.save();

    // Calculate overall percentage to return to frontend
    const courseModules = await Module.find({ course: courseId });
    const totalLessons = courseModules.reduce(
      (acc: number, m: any) => acc + (m.lessons?.length || 0),
      0,
    );

    const completedCount = progress.completedLessons.length;
    const percentage =
      totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    res.status(200).json({
      success: true,
      message: "Lesson marked as complete",
      data: {
        completedLessons: progress.completedLessons,
        progressPercentage: percentage,
      },
    });
  },
);
