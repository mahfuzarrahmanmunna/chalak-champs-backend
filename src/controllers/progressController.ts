import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import { catchAsync } from "../middleware/errorHandler";
import Progress from "../models/Progress";
import Module from "../models/Module";
import Lesson from "../models/Lesson";

interface IModuleLean {
  _id: mongoose.Types.ObjectId;
}

const getFlatLessons = async (
  courseId: string | string[],
): Promise<mongoose.Types.ObjectId[]> => {
  const normalizedCourseId = Array.isArray(courseId) ? courseId[0] : courseId;

  const modules = await Module.find({ courseId: normalizedCourseId })
    .sort("order")
    .select("_id")
    .lean<IModuleLean[]>();

  const lessonsByModule = await Promise.all(
    modules.map((mod) =>
      Lesson.find({ module: mod._id })
        .sort("order")
        .select("_id")
        .lean<{ _id: mongoose.Types.ObjectId }[]>(),
    ),
  );

  return lessonsByModule.flatMap((lessons) =>
    lessons.map((lesson) => lesson._id),
  );
};

// @desc    Get Course Progress
// @route   GET /api/courses/:courseId/progress
// @access  Private
export const getCourseProgress = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let progress = await Progress.findOne({ user: userId, course: courseId });
    const flatLessons = await getFlatLessons(courseId);
    const totalLessons = flatLessons.length;

    if (!progress) {
      const firstModule = await Module.findOne({ courseId })
        .sort("order")
        .select("_id")
        .lean<IModuleLean | null>();
      const firstLesson = firstModule
        ? await Lesson.findOne({ module: firstModule._id })
            .sort("order")
            .select("_id")
            .lean<{ _id: mongoose.Types.ObjectId } | null>()
        : null;

      progress = await Progress.create({
        user: userId,
        course: courseId,
        completedLessons: [],
        lastAccessedModule: firstModule?._id,
        lastAccessedLesson: firstLesson?._id,
        progressPercentage: 0,
      });
    }

    const completedCount = progress.completedLessons.length;
    const percentage =
      totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    if (progress.progressPercentage !== percentage) {
      progress.progressPercentage = percentage;
      await progress.save();
    }

    res.status(200).json({
      success: true,
      data: {
        completedLessons: progress.completedLessons,
        lastAccessedModule: progress.lastAccessedModule,
        lastAccessedLesson: progress.lastAccessedLesson,
        progressPercentage: percentage,
        completedLessonsCount: completedCount,
        totalLessons: totalLessons,
      },
    });
  },
);

// @desc    Update Last Accessed Lesson
// @route   PATCH /api/courses/:courseId/progress
// @access  Private
export const updateLastAccessedLesson = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;
    const { moduleId, lessonId } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const progress = await Progress.findOneAndUpdate(
      { user: userId, course: courseId },
      { lastAccessedModule: moduleId, lastAccessedLesson: lessonId },
      { upsert: true, new: true },
    );

    res.status(200).json({ success: true, data: progress });
  },
);

// @desc    Mark a lesson as complete
// @route   POST /api/courses/:courseId/modules/:moduleId/lessons/:lessonId/complete
// @access  Private
export const markLessonComplete = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { courseId, moduleId, lessonId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(String(courseId)) ||
      !mongoose.Types.ObjectId.isValid(String(moduleId)) ||
      !mongoose.Types.ObjectId.isValid(String(lessonId))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid course, module, or lesson ID.",
      });
    }

    const lessonObjectId = new mongoose.Types.ObjectId(String(lessonId));

    const module = await Module.findOne({
      _id: moduleId,
      courseId,
    })
      .select("_id")
      .lean();
    const lesson = await Lesson.findOne({
      _id: lessonObjectId,
      module: moduleId,
    })
      .select("_id")
      .lean();
    if (!module || !lesson) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found in course." });
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

    // Prevent duplicates
    if (progress.completedLessons.some((id) => id.equals(lessonObjectId))) {
      return res
        .status(200)
        .json({ success: true, message: "Lesson already completed" });
    }

    // 🔒 BACKEND SEQUENTIAL VALIDATION
    const flatLessons = await getFlatLessons(String(courseId));
    const currentIndex = flatLessons.findIndex((l) => l.equals(lessonObjectId));

    if (currentIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Lesson not found in course." });
    }

    if (currentIndex > 0) {
      const previousLessonId = flatLessons[currentIndex - 1];
      if (
        !progress.completedLessons.some((id) => id.equals(previousLessonId))
      ) {
        return res.status(403).json({
          success: false,
          message: "Please complete the previous lesson first.",
        });
      }
    }

    // Add to completed and update last accessed
    progress.completedLessons.push(lessonObjectId);
    progress.lastAccessedModule = new mongoose.Types.ObjectId(String(moduleId));
    progress.lastAccessedLesson = lessonObjectId;

    // Calculate new percentage
    const totalLessons = flatLessons.length;
    progress.progressPercentage =
      totalLessons > 0
        ? Math.round((progress.completedLessons.length / totalLessons) * 100)
        : 0;

    await progress.save();

    res.status(200).json({
      success: true,
      message: "Lesson marked as complete",
      data: {
        completedLessons: progress.completedLessons,
        lastAccessedModule: progress.lastAccessedModule,
        lastAccessedLesson: progress.lastAccessedLesson,
        progressPercentage: progress.progressPercentage,
        completedLessonsCount: progress.completedLessons.length,
        totalLessons,
      },
    });
  },
);
