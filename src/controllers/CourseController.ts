// src/controllers/courseController.ts
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";
import { R2Service } from "../services/r2.service";
import Course, { ICourse } from "../models/Course";
import { r2PublicUrl } from "../config/r2";

// --- TYPES ---
type MulterFiles = {
  [fieldname: string]: Express.Multer.File[];
};

type RequestWithFiles = Omit<AuthRequest, "files"> & {
  files?: MulterFiles;
};

// --- HELPERS ---

// Parse JSON safely from FormData string
const parseJSON = (value: any): any => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    try {
      return JSON.parse(value.replace(/'/g, '"'));
    } catch {
      return { en: value, bn: value };
    }
  }
};

// Upload file to R2 and return URL + key
const uploadToR2 = async (
  file: Express.Multer.File,
  folder: string,
): Promise<{ url: string; key: string }> => {
  if (!file.buffer?.length) {
    throw new Error(`Empty file buffer for ${file.originalname}`);
  }

  const subFolder = file.mimetype.startsWith("video") ? "videos" : "images";
  return R2Service.uploadFile(file.buffer, file.mimetype, `${folder}/${subFolder}`);
};

// Delete file from R2
const deleteFromR2 = async (url: string): Promise<void> => {
  if (!url) return;
  try {
    const key = R2Service.extractKeyFromUrl(url);
    if (key) {
      await R2Service.deleteFile(key);
    }
  } catch (err) {
    console.error("Failed to delete from R2:", err);
  }
};

// --- CONTROLLERS ---

// 1. CREATE COURSE
export const createCourse = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    const { user } = req;
    const files = req.files as MulterFiles | undefined;

    const uploadedKeys: string[] = []; // Track for cleanup on failure

    try {
      // 1. Upload Thumbnail to R2
      let thumbnailUrl = "";
      if (files?.thumbnail?.[0]) {
        const result = await uploadToR2(files.thumbnail[0], "courses/thumbnails");
        thumbnailUrl = result.url;
        uploadedKeys.push(result.key);
      }

      // 2. Upload Video to R2 (if provided)
      let videoUrl = "";
      if (files?.video?.[0]) {
        const result = await uploadToR2(files.video[0], "courses/videos");
        videoUrl = result.url;
        uploadedKeys.push(result.key);
      }

      // 3. Upload Instructor Image to R2 (if provided)
      let instructorImageUrl = "";
      if (files?.instructorImage?.[0]) {
        const result = await uploadToR2(files.instructorImage[0], "courses/instructors");
        instructorImageUrl = result.url;
        uploadedKeys.push(result.key);
      }

      // 4. Upload Media Files to R2 (if provided)
      const mediaFileUrls: string[] = [];
      if (files?.mediaFiles?.length) {
        for (const file of files.mediaFiles) {
          const result = await uploadToR2(file, "courses/media");
          mediaFileUrls.push(result.url);
          uploadedKeys.push(result.key);
        }
      }

      // 5. Parse JSON Data from FormData
      let incoming = { ...req.body } as any;

      // Support single `content` JSON field from new frontend
      let contentData = parseJSON(incoming.content) || {};

      // Support old frontend fields (backward compatibility)
      if (!contentData.hero) {
        contentData = {
          hero: {
            title: parseJSON(incoming.title) || { en: "", bn: "" },
            subtitle: parseJSON(incoming.heroSubtitle) || { en: "", bn: "" },
          },
          quickInfo: parseJSON(incoming.quickInfo) || { items: { en: [], bn: [] } },
          levels: parseJSON(incoming.levels) || {},
          whoIsThisFor: parseJSON(incoming.whoIsThisFor) || {},
          features: parseJSON(incoming.features) || { cards: [] },
          faq: parseJSON(incoming.faqs) || { items: [] },
          overview: {
            title: { en: "Course Details", bn: "কোর্স সম্পর্কে বিস্তারিত" },
            content: {
              en: incoming.contentEn || "",
              bn: incoming.contentBn || "",
            },
          },
          ...contentData,
        };
      }

      // Add instructor image to content if uploaded
      if (instructorImageUrl) {
        if (!contentData.instructor) contentData.instructor = {} as any;
        contentData.instructor.image = instructorImageUrl;
      }

      // Add media file URLs to content
      if (mediaFileUrls.length > 0) {
        if (!contentData.mediaAssets) contentData.mediaAssets = [];

        let urlIndex = 0;
        contentData.mediaAssets = contentData.mediaAssets.map(
          (asset: any, i: number) => {
            if (asset.isNew && mediaFileUrls[urlIndex]) {
              const url = mediaFileUrls[urlIndex++];
              return {
                type: asset.type || (url.match(/\.(mp4|webm|mov)/i) ? "video" : "image"),
                src: url,
                poster: asset.poster || "",
              };
            }
            return asset;
          },
        );

        // Add any remaining URLs that weren't mapped
        while (urlIndex < mediaFileUrls.length) {
          const url = mediaFileUrls[urlIndex++];
          contentData.mediaAssets.push({
            type: url.match(/\.(mp4|webm|mov)/i) ? "video" : "image",
            src: url,
          });
        }
      }

      // 6. Parse Prices
      const rawPrice = incoming.price ?? incoming.price === 0 ? incoming.price : 0;
      const parsedPrice = parseFloat(String(rawPrice));
      if (Number.isNaN(parsedPrice)) {
        return next(new AppError("Invalid price provided", 400));
      }

      const parsedOriginalPrice = incoming.originalPrice
        ? parseFloat(String(incoming.originalPrice))
        : undefined;

      // 7. Get title for validation
      const title =
        parseJSON(incoming.title) ||
        contentData.hero?.title ||
        contentData.breadcrumb;

      if (!title?.en) {
        return next(new AppError("Course title is required (title.en)", 400));
      }

      // 8. Create Course
      const courseData: any = {
        // Basic fields
        slug: incoming.slug || "",
        title: title,
        category: incoming.category || "general",
        price: parsedPrice,
        originalPrice: parsedOriginalPrice,
        duration: parseJSON(incoming.duration) || { en: "", bn: "" },

        // Media URLs
        thumbnail: thumbnailUrl,
        videoUrl: videoUrl,

        // Full content structure
        content: contentData,

        // Backward compatibility fields
        heroSubtitle: contentData.hero?.subtitle || title,
        description: contentData.overview?.content || { en: "", bn: "" },
        quickInfo: contentData.quickInfo || [],
        levels: contentData.levels || [],
        features: contentData.features || [],
        faqs: contentData.faq || [],

        // Meta
        instructor: user?._id || incoming.instructor,
        instructorName: incoming.instructorName || contentData.instructor?.name || "",
        isPublished: incoming.isPublished === "true" || incoming.isPublished === true,
        publishedAt: new Date(),
      };

      const course = await Course.create(courseData);

      res.status(201).json({
        success: true,
        data: course,
        message: "Course created successfully",
      });
    } catch (error: any) {
      // Cleanup: Delete all uploaded R2 files if DB save fails
      for (const key of uploadedKeys) {
        await deleteFromR2(`${r2PublicUrl}/${key}`).catch(console.error);
      }
      return next(
        new AppError(error.message || "Failed to create course", 500),
      );
    }
  },
);

// 2. GET ALL COURSES (Public)
export const getAllCourses = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { category, search, published, limit, page } = req.query;

    const filter: any = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    if (published !== undefined) {
      filter.isPublished = published === "true";
    } else {
      filter.isPublished = true; // Default: only published
    }

    if (search) {
      filter.$or = [
        { "title.en": { $regex: search, $options: "i" } },
        { "title.bn": { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { instructorName: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await Course.find(filter)
      .select(
        "slug title category price originalPrice thumbnail isPublished instructorName createdAt",
      )
      .sort("-createdAt")
      .limit(Number(limit) || 50)
      .skip(((Number(page) || 1) - 1) * (Number(limit) || 50));

    const total = await Course.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: courses.length,
      total,
      page: Number(page) || 1,
      totalPages: Math.ceil(total / (Number(limit) || 50)),
      data: courses,
    });
  },
);

// 3. GET SINGLE COURSE BY ID (Public)
export const getCourseById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const course = await Course.findById(req.params.id).populate(
      "instructor",
      "name email",
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

// 4. GET SINGLE COURSE BY SLUG (Public)
export const getCourseBySlug = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const course = await Course.findOne({ slug: req.params.slug }).populate(
      "instructor",
      "name email",
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

// 5. GET INSTRUCTOR COURSES (Protected)
export const getInstructorCourses = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const courses = await Course.find({ instructor: req.user?._id })
      .select(
        "slug title category price originalPrice thumbnail isPublished createdAt",
      )
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  },
);

// 6. UPDATE COURSE
export const updateCourse = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const files = req.files as MulterFiles | undefined;

    const course = await Course.findById(id);

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Authorization
    if (
      course.instructor?.toString() !== req.user?._id?.toString() &&
      req.user?.role !== "admin"
    ) {
      return next(new AppError("Not authorized to update this course", 403));
    }

    const uploadedKeys: string[] = [];
    const oldUrlsToDelete: string[] = [];

    // ✅ FIX: Initialize content once to avoid undefined errors
    if (!course.content) {
      course.content = {} as any;
    }

    // Cast to any for deep mutations on Mixed schema type
    const content = course.content as any;

    try {
      // 1. Handle Thumbnail Update
      if (files?.thumbnail?.[0]) {
        const result = await uploadToR2(files.thumbnail[0], "courses/thumbnails");
        uploadedKeys.push(result.key);

        if (course.thumbnail) {
          oldUrlsToDelete.push(course.thumbnail);
        }
        course.thumbnail = result.url;
      }

      // 2. Handle Video Update
      if (files?.video?.[0]) {
        const result = await uploadToR2(files.video[0], "courses/videos");
        uploadedKeys.push(result.key);

        if (course.videoUrl) {
          oldUrlsToDelete.push(course.videoUrl);
        }
        course.videoUrl = result.url;
      }

      // 3. Handle Instructor Image Update
      if (files?.instructorImage?.[0]) {
        const result = await uploadToR2(
          files.instructorImage[0],
          "courses/instructors",
        );
        uploadedKeys.push(result.key);

        // ✅ FIX: Safe access to nested property
        const oldInstructorImage = content.instructor?.image;
        if (oldInstructorImage) {
          oldUrlsToDelete.push(oldInstructorImage);
        }

        if (!content.instructor) content.instructor = {};
        content.instructor.image = result.url;
      }

      // 4. Handle Media Files Update
      if (files?.mediaFiles?.length) {
        const mediaFileUrls: string[] = [];
        for (const file of files.mediaFiles) {
          const result = await uploadToR2(file, "courses/media");
          mediaFileUrls.push(result.url);
          uploadedKeys.push(result.key);
        }

        // Parse new content and merge media URLs
        const newContent = parseJSON(req.body.content) || {};

        if (newContent.mediaAssets) {
          let urlIndex = 0;
          newContent.mediaAssets = newContent.mediaAssets.map(
            (asset: any) => {
              if (asset.isNew && mediaFileUrls[urlIndex]) {
                const url = mediaFileUrls[urlIndex++];
                return {
                  type:
                    asset.type ||
                    (url.match(/\.(mp4|webm|mov)/i) ? "video" : "image"),
                  src: url,
                  poster: asset.poster || "",
                };
              }
              return asset;
            },
          );
        }

        // Merge other content fields
        Object.assign(content, newContent);
      } else if (req.body.content) {
        // No new files, just update content
        const newContent = parseJSON(req.body.content) || {};
        Object.assign(content, newContent);
      }

      // 5. Update Basic Fields
      if (req.body.slug) course.slug = req.body.slug;
      if (req.body.title) course.title = parseJSON(req.body.title);
      if (req.body.category) course.category = req.body.category;
      if (req.body.price !== undefined) {
        course.price = parseFloat(req.body.price);
      }
      if (req.body.originalPrice !== undefined) {
        course.originalPrice = req.body.originalPrice
          ? parseFloat(req.body.originalPrice)
          : undefined;
      }
      if (req.body.duration) course.duration = parseJSON(req.body.duration);
      if (req.body.instructorName) {
        course.instructorName = req.body.instructorName;
      }

      // Backward compatibility updates
      if (req.body.heroSubtitle) {
        course.heroSubtitle = parseJSON(req.body.heroSubtitle);
      }
      if (req.body.quickInfo) {
        course.quickInfo = parseJSON(req.body.quickInfo);
      }
      if (req.body.levels) {
        course.levels = parseJSON(req.body.levels);
      }
      if (req.body.features) {
        course.features = parseJSON(req.body.features);
      }
      if (req.body.faqs) {
        course.faqs = parseJSON(req.body.faqs);
      }

      // Handle Quill content for backward compatibility
      if (
        req.body.contentEn !== undefined ||
        req.body.contentBn !== undefined
      ) {
        if (!content.overview) content.overview = {};
        if (!content.overview.content) {
          content.overview.content = { en: "", bn: "" };
        }
        if (req.body.contentEn !== undefined) {
          content.overview.content.en = req.body.contentEn;
        }
        if (req.body.contentBn !== undefined) {
          content.overview.content.bn = req.body.contentBn;
        }
        // Also update the old description field
        course.description = content.overview.content;
      }

      // Handle publish status
      if (req.body.isPublished !== undefined) {
        const isPublished =
          req.body.isPublished === "true" || req.body.isPublished === true;
        course.isPublished = isPublished;
        course.publishedAt = isPublished ? new Date() : undefined;
      }

      await course.save();

      // Cleanup old files after successful save
      for (const url of oldUrlsToDelete) {
        await deleteFromR2(url);
      }

      res.status(200).json({
        success: true,
        data: course,
        message: "Course updated successfully",
      });
    } catch (error: any) {
      // Cleanup: Delete newly uploaded files
      for (const key of uploadedKeys) {
        await R2Service.deleteFile(key).catch(console.error);
      }
      return next(
        new AppError(error.message || "Failed to update course", 500),
      );
    }
  },
);

// 7. DELETE COURSE
export const deleteCourse = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return next(new AppError("Course not found", 404));
    }

    // Authorization
    if (
      course.instructor?.toString() !== req.user?._id?.toString() &&
      req.user?.role !== "admin"
    ) {
      return next(new AppError("Not authorized to delete this course", 403));
    }

    try {
      // 1. Delete Thumbnail from R2
      if (course.thumbnail) {
        await deleteFromR2(course.thumbnail);
      }

      // 2. Delete Video from R2
      if (course.videoUrl) {
        await deleteFromR2(course.videoUrl);
      }

      // ✅ FIX: Safe access to nested content properties
      const content = course.content as any;

      // 3. Delete Instructor Image from R2
      if (content?.instructor?.image) {
        await deleteFromR2(content.instructor.image);
      }

      // 4. Delete Media Assets from R2
      if (content?.mediaAssets?.length) {
        for (const asset of content.mediaAssets) {
          if (asset.src) {
            await deleteFromR2(asset.src);
          }
          if (asset.poster) {
            await deleteFromR2(asset.poster);
          }
        }
      }

      // 5. Delete from Database
      await course.deleteOne();

      res.status(200).json({
        success: true,
        message: "Course deleted successfully",
      });
    } catch (error: any) {
      return next(
        new AppError(error.message || "Failed to delete course", 500),
      );
    }
  },
);
