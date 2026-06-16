import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";
// RENAME IMPORT to ModuleModel to avoid conflict with Express Router
import ModuleModel, { IModule } from "../models/Module";
import Lesson from "../models/Lesson";
import { uploadToImgBB, deleteLocalFile } from "../utils/imgbb";

const getCourseId = (params: Request["params"]) =>
  (params.courseId || params.id) as string;

// --- TYPES ---
type MulterFiles = {
  [fieldname: string]: {
    buffer?: Buffer;
    path?: string;
    originalname?: string;
  }[];
};

type RequestWithFiles = Omit<AuthRequest, "files"> & { files?: MulterFiles };

// 1. CREATE MODULE
export const createModule = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    const courseId = getCourseId(req.params);
    const { title } = req.body ?? {};
    const files = req.files as MulterFiles;

    if (!title) {
      return next(new AppError("Module title is required", 400));
    }

    const lastModule = await ModuleModel.findOne({ courseId }).sort("-order");
    const nextOrder = lastModule ? lastModule.order + 1 : 1;

    const isPublished =
      req.body.isPublished === "true" || req.body.isPublished === true;

    const moduleFields: {
      courseId: mongoose.Types.ObjectId;
      title: string;
      order: number;
      titleBn?: string;
      description?: string;
      videoUrl?: string;
      isPublished?: boolean;
      publishedAt?: Date;
      thumbnail?: string;
    } = {
      courseId: new mongoose.Types.ObjectId(courseId),
      title,
      order: nextOrder,
    };

    if (req.body.titleBn) moduleFields.titleBn = req.body.titleBn;
    if (req.body.description) moduleFields.description = req.body.description;
    if (req.body.videoUrl) moduleFields.videoUrl = req.body.videoUrl;
    if (typeof req.body.isPublished !== "undefined") {
      moduleFields.isPublished = isPublished;
      if (isPublished) moduleFields.publishedAt = new Date();
    }

    try {
      if (files?.thumbnail?.[0]) {
        const file = files.thumbnail[0];
        const payload = file.buffer ? file.buffer : (file.path as string);
        const result = await uploadToImgBB(payload as Buffer | string);
        moduleFields.thumbnail = result.url;
        if (file.path) deleteLocalFile(file.path);
      }

      if (files?.video?.[0]) {
        const file = files.video[0];
        const payload = file.buffer ? file.buffer : (file.path as string);
        const result = await uploadToImgBB(payload as Buffer | string);
        moduleFields.videoUrl = result.url;
        if (file.path) deleteLocalFile(file.path);
      }

      const newModule = await ModuleModel.create(moduleFields);

      res.status(201).json({
        success: true,
        data: newModule,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create module";
      return next(new AppError(message, 500));
    }
  },
);

// 2. GET MODULES WITH LESSONS
export const getCourseModules = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const courseId = getCourseId(req.params);

    const modules = await ModuleModel.find({ courseId }).sort("order");

    // Fetch lessons for each module
    const moduleIds = modules.map((m: IModule) => m._id);
    const lessons = await Lesson.find({ module: { $in: moduleIds } }).sort(
      "order",
    );

    // Map lessons to their modules
    const modulesWithLessons = modules.map((mod: IModule) => ({
      ...mod.toObject(),
      lessons: lessons.filter(
        (l) => l.module.toString() === mod._id.toString(),
      ),
    }));

    res.status(200).json({
      success: true,
      data: modulesWithLessons,
    });
  },
);

// 3. UPDATE MODULE (MISSING FUNCTION)
export const updateModule = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const files = req.files as MulterFiles;

    let module = await ModuleModel.findById(id);

    if (!module) {
      return next(new AppError("Module not found", 404));
    }

    try {
      // Handle Thumbnail Update
      if (files && files.thumbnail && files.thumbnail[0]) {
        const file = files.thumbnail[0];
        const payload = file.buffer ? file.buffer : (file.path as string);
        const result = await uploadToImgBB(payload as any);
        module.thumbnail = result.url;
        if (file.path) deleteLocalFile(file.path);
      }

      // Handle Video Update
      if (files && files.video && files.video[0]) {
        const file = files.video[0];
        const payload = file.buffer ? file.buffer : (file.path as string);
        const result = await uploadToImgBB(payload as any);
        module.videoUrl = result.url;
        if (file.path) deleteLocalFile(file.path);
      } else if (req.body.videoUrl) {
        module.videoUrl = req.body.videoUrl;
      }

      // Update Text Fields
      if (req.body.title) module.title = req.body.title;
      if (req.body.titleBn) module.titleBn = req.body.titleBn;
      if (req.body.description) module.description = req.body.description;
      if (typeof req.body.isPublished !== "undefined") {
        const published =
          req.body.isPublished === "true" || req.body.isPublished === true;
        module.isPublished = published;
        module.publishedAt = published ? new Date() : undefined;
      }

      await module.save();

      res.status(200).json({
        success: true,
        data: module,
        message: "Module updated successfully",
      });
    } catch (error: any) {
      return next(
        new AppError(error.message || "Failed to update module", 500),
      );
    }
  },
);

// 4. DELETE MODULE (MISSING FUNCTION)
export const deleteModule = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const module = await ModuleModel.findById(id);

    if (!module) {
      return next(new AppError("Module not found", 404));
    }

    try {
      // Optional: Delete all lessons inside this module
      await Lesson.deleteMany({ module: id });

      await module.deleteOne();

      res.status(200).json({
        success: true,
        message: "Module deleted successfully",
      });
    } catch (error: any) {
      return next(
        new AppError(error.message || "Failed to delete module", 500),
      );
    }
  },
);

// 5. CREATE LESSON
export const createLesson = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    const { moduleId } = req.params;
    const module = await ModuleModel.findById(moduleId);
    if (!module) return next(new AppError("Module not found", 404));

    // Determine order
    const lastLesson = await Lesson.findOne({ module: moduleId }).sort(
      "-order",
    );
    const nextOrder = lastLesson ? lastLesson.order + 1 : 1;

    const lessonData: any = {
      module: moduleId,
      title: req.body.title, // { en, bn }
      videoUrl: req.body.videoUrl,
      content: req.body.content,
      order: nextOrder,
      duration: parseInt(req.body.duration) || 0,
      resources: req.body.resources ? JSON.parse(req.body.resources) : [],
      quiz: req.body.quiz ? JSON.parse(req.body.quiz) : [],
      isFreePreview: req.body.isFreePreview === "true",
      type: req.body.type || "video",
    };

    const lesson = await Lesson.create(lessonData);

    res.status(201).json({
      success: true,
      data: lesson,
    });
  },
);

export const getModulesByCourse = getCourseModules;

// 6. DELETE LESSON
export const deleteLesson = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const lesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!lesson) return next(new AppError("Lesson not found", 404));
    res.status(200).json({ success: true, message: "Lesson deleted" });
  },
);
