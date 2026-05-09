import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";
import Module from "../models/Module";
import Lesson from "../models/Lesson";
import Course from "../models/Course";

// Helper to safely get a string from params
const getParam = (param: string | string[]): string => {
  return Array.isArray(param) ? param[0] : param;
};

// --- MODULES ---

export const createModule = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const courseId = getParam(req.params.courseId);
    const { title, description } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return next(new AppError("Course not found", 404));

    const count = await Module.countDocuments({ courseId });

    const module = await Module.create({
      courseId,
      title,
      description,
      order: count + 1,
    });

    res.status(201).json({ success: true, data: module });
  },
);

export const getCourseStructure = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const courseId = getParam(req.params.courseId);

    const course = await Course.findById(courseId);
    if (!course) return next(new AppError("Course not found", 404));

    const modules = await Module.find({ courseId }).sort({
      order: 1,
    });

    const structure = await Promise.all(
      modules.map(async (mod) => {
        // FIX: Added 'as any'
        const lessons = await Lesson.find({ module: mod._id } as any).sort({
          order: 1,
        });
        return {
          _id: mod._id,
          title: mod.title,
          description: mod.description,
          order: mod.order,
          lessons: lessons,
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: {
        course,
        curriculum: structure,
      },
    });
  },
);

export const updateModule = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = getParam(req.params.id);
    const module = await Module.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!module) return next(new AppError("Module not found", 404));
    res.status(200).json({ success: true, data: module });
  },
);

export const deleteModule = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = getParam(req.params.id);
    // FIX: Added 'as any'
    await Lesson.deleteMany({ module: id } as any);
    await Module.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Module deleted" });
  },
);

// --- LESSONS ---

export const createLesson = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const moduleId = getParam(req.params.moduleId);
    const { title, content, videoUrl, duration, quiz } = req.body;

    const moduleExists = await Module.findById(moduleId);
    if (!moduleExists) return next(new AppError("Module not found", 404));

    let parsedContent = content;
    if (typeof content === "string") {
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        return next(new AppError("Invalid JSON format for content", 400));
      }
    }

    // FIX: Added 'as any'
    const count = await Lesson.countDocuments({ module: moduleId } as any);

    const lesson = await Lesson.create({
      module: moduleId,
      title,
      content: parsedContent,
      videoUrl,
      duration,
      quiz,
      order: count + 1,
    });

    res.status(201).json({ success: true, data: lesson });
  },
);

export const getLessonById = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = getParam(req.params.id);
    const lesson = await Lesson.findById(id).populate({
      path: "module",
      populate: { path: "courseId" },
    });
    if (!lesson) return next(new AppError("Lesson not found", 404));
    res.status(200).json({ success: true, data: lesson });
  },
);

export const updateLesson = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = getParam(req.params.id);
    let updateData = { ...req.body };

    if (req.body.content && typeof req.body.content === "string") {
      updateData.content = JSON.parse(req.body.content);
    }

    const lesson = await Lesson.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!lesson) return next(new AppError("Lesson not found", 404));
    res.status(200).json({ success: true, data: lesson });
  },
);

export const deleteLesson = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = getParam(req.params.id);
    await Lesson.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Lesson deleted" });
  },
);
