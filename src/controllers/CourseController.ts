import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";
import { uploadToCloudinary, deleteLocalFile } from "../utils/cloudinary";
import cloudinary from "cloudinary";
import Course from "../models/Course";

// Type for Multer files
type MulterFiles = { [fieldname: string]: { path: string }[] };
type RequestWithFiles = Omit<AuthRequest, "files"> & { files?: MulterFiles };

// Helper: Extract Public ID from Cloudinary URL
const getPublicId = (url: string) => {
  const parts = url.split("/");
  const file = parts[parts.length - 1];
  return file.split(".")[0];
};

// --- CREATE ---
export const createCourse = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    const { user } = req;
    const files = req.files as MulterFiles;

    let thumbnailUrl: string | undefined;
    let videoUrl: string | undefined;

    try {
      // 1. Handle Thumbnail
      if (files && files.thumbnail) {
        const path = files.thumbnail[0].path;
        thumbnailUrl = await uploadToCloudinary(
          path,
          "course_thumbnails",
          "image",
        );
        deleteLocalFile(path);
      }

      // 2. Handle Video
      if (files && files.video) {
        const path = files.video[0].path;
        videoUrl = await uploadToCloudinary(path, "course_videos", "video");
        deleteLocalFile(path);
      }

      // 3. Prepare Data
      const courseData = {
        ...req.body,
        instructor: user?._id || req.body.instructor,
        price: parseFloat(req.body.price),
        originalPrice: req.body.originalPrice
          ? parseFloat(req.body.originalPrice)
          : undefined,
        objectives: req.body.objectives ? JSON.parse(req.body.objectives) : [],
        requirements: req.body.requirements
          ? JSON.parse(req.body.requirements)
          : [],
        tags: req.body.tags
          ? req.body.tags.split(",").map((t: string) => t.trim())
          : [],
        thumbnail: thumbnailUrl,
        videoUrl: videoUrl,
        isPublished: true,
        publishedAt: new Date(),
      };

      const course = await Course.create(courseData);

      res.status(201).json({
        success: true,
        data: course,
        message: "Course created successfully",
      });
    } catch (error: any) {
      if (files?.thumbnail) deleteLocalFile(files.thumbnail[0].path);
      if (files?.video) deleteLocalFile(files.video[0].path);
      return next(
        new AppError(error.message || "Failed to create course", 500),
      );
    }
  },
);

// --- GET ALL ---
export const getCourses = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { search, category, level, page = 1, limit = 10 } = req.query;

    const query: any = {};

    if (category) query.category = category;
    if (level) query.level = level;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search as string, "i")] } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const courses = await Course.find(query)
      .populate("instructor", "name email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      count: courses.length,
      pagination: { page: pageNum, pages: Math.ceil(total / limitNum), total },
      data: courses,
    });
  },
);

// --- GET ONE ---
export const getCourseById = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const course = await Course.findById(req.params.id).populate(
      "instructor",
      "name email bio",
    );

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  },
);

// --- UPDATE ---
export const updateCourse = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    let course = await Course.findById(req.params.id);

    if (!course) return next(new AppError("Course not found", 404));

    // Authorization Check
    if (
      course.instructor.toString() !== req.user!._id.toString() &&
      req.user!.role !== "admin"
    ) {
      return next(new AppError("Not authorized to update this course", 403));
    }

    const files = req.files as MulterFiles;
    const updateData: any = { ...req.body };

    // Handle Price conversion
    if (req.body.price) updateData.price = parseFloat(req.body.price);
    if (req.body.originalPrice)
      updateData.originalPrice = parseFloat(req.body.originalPrice);

    // Handle Arrays
    if (req.body.objectives)
      updateData.objectives = JSON.parse(req.body.objectives);
    if (req.body.requirements)
      updateData.requirements = JSON.parse(req.body.requirements);
    if (req.body.tags)
      updateData.tags = req.body.tags.split(",").map((t: string) => t.trim());

    // 1. Handle Thumbnail Update
    if (files && files.thumbnail) {
      // Delete old thumbnail from Cloudinary if it exists
      if (course.thumbnail) {
        const publicId = `course_thumbnails/${getPublicId(course.thumbnail)}`;
        await cloudinary.v2.uploader.destroy(publicId);
      }

      // Upload new
      const path = files.thumbnail[0].path;
      updateData.thumbnail = await uploadToCloudinary(
        path,
        "course_thumbnails",
        "image",
      );
      deleteLocalFile(path);
    }

    // 2. Handle Video Update
    if (files && files.video) {
      // Delete old video
      if (course.videoUrl) {
        const publicId = `course_videos/${getPublicId(course.videoUrl)}`;
        await cloudinary.v2.uploader.destroy(publicId, {
          resource_type: "video",
        });
      }

      // Upload new
      const path = files.video[0].path;
      updateData.videoUrl = await uploadToCloudinary(
        path,
        "course_videos",
        "video",
      );
      deleteLocalFile(path);
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

// --- DELETE ---
export const deleteCourse = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const course = await Course.findById(req.params.id);

    if (!course) return next(new AppError("Course not found", 404));

    // Authorization Check
    if (
      course.instructor.toString() !== req.user!._id.toString() &&
      req.user!.role !== "admin"
    ) {
      return next(new AppError("Not authorized to delete this course", 403));
    }

    // Delete Assets from Cloudinary
    if (course.thumbnail) {
      await cloudinary.v2.uploader.destroy(
        `course_thumbnails/${getPublicId(course.thumbnail)}`,
      );
    }
    if (course.videoUrl) {
      await cloudinary.v2.uploader.destroy(
        `course_videos/${getPublicId(course.videoUrl)}`,
        { resource_type: "video" },
      );
    }

    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  },
);

// --- GET COURSES BY INSTRUCTOR (My Courses) ---
export const getInstructorCourses = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const courses = await Course.find({ instructor: req.user!._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  },
);
