// src/controllers/courseController.ts
import { Request, Response, NextFunction } from "express";
import { Course, ICourse } from "../models/Course";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";
import { uploadToCloudinary } from "../utils/cloudinary";
import fs from "fs";

/** Type for multer file fields (we only use .path) */
type MulterFiles = { [fieldname: string]: { path: string }[] };

/** Request with optional files (set by upload middleware). Omit files to avoid clashing with Express.Multer typings. */
type RequestWithFiles = Omit<AuthRequest, "files"> & { files?: MulterFiles };

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private (Instructor/Admin)
export const createCourse = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    const courseData = {
      ...req.body,
      instructor: req.user!._id,
    };

    // Handle file uploads
    if (req.files) {
      const files = req.files as MulterFiles;

      if (files.thumbnail) {
        const thumbnailPath = files.thumbnail[0].path;
        const thumbnailResult = await uploadToCloudinary(
          thumbnailPath,
          "course-thumbnails",
        );
        courseData.thumbnail = thumbnailResult.secure_url;

        // Delete local file after upload
        fs.unlinkSync(thumbnailPath);
      }

      if (files.video) {
        const videoPath = files.video[0].path;
        const videoResult = await uploadToCloudinary(
          videoPath,
          "course-videos",
        );
        courseData.introVideo = videoResult.secure_url;

        // Delete local file after upload
        fs.unlinkSync(videoPath);
      }
    }

    const course = await Course.create(courseData);

    res.status(201).json({
      success: true,
      data: course,
      message: "Course created successfully",
    });
  },
);

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
export const getCourses = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      page = 1,
      limit = 10,
      category,
      level,
      language,
      search,
      sort = "-createdAt",
      isPublished,
    } = req.query;

    // Build query
    const query: any = {};

    if (isPublished !== undefined) {
      query.isPublished = isPublished === "true";
    }

    if (category) {
      query.category = category;
    }

    if (level) {
      query.level = level;
    }

    if (language) {
      query.language = language;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { titleBn: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { descriptionBn: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search as string, "i")] } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const courses = await Course.find(query)
      .populate("instructor", "name email")
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum);

    const total = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  },
);

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Public
export const getCourseById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const course = await Course.findById(req.params.id)
      .populate("instructor", "name email bio")
      .populate("lessons");

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  },
);

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Instructor/Admin)
export const updateCourse = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    let course = await Course.findById(req.params.id);

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Check if user is course instructor or admin
    if (
      course.instructor.toString() !== req.user!._id.toString() &&
      req.user!.role !== "admin"
    ) {
      return next(new AppError("Not authorized to update this course", 403));
    }

    // Handle file uploads
    const updateData = { ...req.body };

    if (req.files) {
      const files = req.files as MulterFiles;

      if (files.thumbnail) {
        const thumbnailPath = files.thumbnail[0].path;
        const thumbnailResult = await uploadToCloudinary(
          thumbnailPath,
          "course-thumbnails",
        );
        updateData.thumbnail = thumbnailResult.secure_url;

        // Delete local file after upload
        fs.unlinkSync(thumbnailPath);
      }

      if (files.video) {
        const videoPath = files.video[0].path;
        const videoResult = await uploadToCloudinary(
          videoPath,
          "course-videos",
        );
        updateData.introVideo = videoResult.secure_url;

        // Delete local file after upload
        fs.unlinkSync(videoPath);
      }
    }

    course = await Course.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: course,
      message: "Course updated successfully",
    });
  },
);

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Instructor/Admin)
export const deleteCourse = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Check if user is course instructor or admin
    if (
      course.instructor.toString() !== req.user!._id.toString() &&
      req.user!.role !== "admin"
    ) {
      return next(new AppError("Not authorized to delete this course", 403));
    }

    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  },
);

// @desc    Get courses by instructor
// @route   GET /api/courses/instructor/my-courses
// @access  Private (Instructor/Admin)
export const getCoursesByInstructor = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const {
      page = 1,
      limit = 10,
      isPublished,
      sort = "-createdAt",
    } = req.query;

    const query: any = { instructor: req.user!._id };

    if (isPublished !== undefined) {
      query.isPublished = isPublished === "true";
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const courses = await Course.find(query)
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum);

    const total = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  },
);

// @desc    Publish course
// @route   PATCH /api/courses/:id/publish
// @access  Private (Instructor/Admin)
export const publishCourse = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Check if user is course instructor or admin
    if (
      course.instructor.toString() !== req.user!._id.toString() &&
      req.user!.role !== "admin"
    ) {
      return next(new AppError("Not authorized to publish this course", 403));
    }

    course.isPublished = true;
    course.publishedAt = new Date();
    await course.save();

    res.status(200).json({
      success: true,
      data: course,
      message: "Course published successfully",
    });
  },
);

// @desc    Unpublish course
// @route   PATCH /api/courses/:id/unpublish
// @access  Private (Instructor/Admin)
export const unpublishCourse = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Check if user is course instructor or admin
    if (
      course.instructor.toString() !== req.user!._id.toString() &&
      req.user!.role !== "admin"
    ) {
      return next(new AppError("Not authorized to unpublish this course", 403));
    }

    course.isPublished = false;
    await course.save();

    res.status(200).json({
      success: true,
      data: course,
      message: "Course unpublished successfully",
    });
  },
);
