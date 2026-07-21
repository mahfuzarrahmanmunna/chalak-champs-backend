import { Request, Response } from "express";
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

// ====================================================================
// ✅ FIX: Deep Merge Utility
// This prevents nested object properties (like instructor.title, payment.description)
// from being wiped out when the parent object is spread during an update.
// ====================================================================
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const output = { ...target };
  
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key];
    const targetVal = output[key];
    
    if (
      sourceVal !== null &&
      sourceVal !== undefined &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      targetVal !== undefined &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal)
    ) {
      // Both are objects - recursively merge them
      output[key] = deepMerge(
        targetVal as Record<string, any>, 
        sourceVal as Record<string, any>
      ) as T[keyof T];
    } else if (sourceVal !== undefined) {
      // Primitive or array - replace entirely (but don't overwrite with undefined)
      output[key] = sourceVal as T[keyof T];
    }
  }
  
  return output;
}

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
  async (req: RequestWithFiles, res: Response) => {
    const { user } = req;
    const files = req.files as MulterFiles | undefined;

    console.log("=== COURSE CREATION START ===");
    console.log("Files received:", files ? Object.keys(files) : "NONE");
    console.log("Media files count:", files?.mediaFiles?.length || 0);

    const uploadedKeys: string[] = [];

    try {
      // 1. Upload Thumbnail to R2
      let thumbnailUrl = "";
      if (files?.thumbnail?.[0]) {
        console.log("Uploading thumbnail:", files.thumbnail[0].originalname);
        const result = await uploadToR2(files.thumbnail[0], "courses/thumbnails");
        thumbnailUrl = result.url;
        uploadedKeys.push(result.key);
        console.log("Thumbnail uploaded:", thumbnailUrl);
      }

      // 2. Upload Video to R2 (if provided)
      let videoUrl = "";
      if (files?.video?.[0]) {
        console.log("Uploading video:", files.video[0].originalname);
        const result = await uploadToR2(files.video[0], "courses/videos");
        videoUrl = result.url;
        uploadedKeys.push(result.key);
        console.log("Video uploaded:", videoUrl);
      }

      // 3. Upload Instructor Image to R2 (if provided)
      let instructorImageUrl = "";
      if (files?.instructorImage?.[0]) {
        console.log("Uploading instructor image:", files.instructorImage[0].originalname);
        const result = await uploadToR2(files.instructorImage[0], "courses/instructors");
        instructorImageUrl = result.url;
        uploadedKeys.push(result.key);
        console.log("Instructor image uploaded:", instructorImageUrl);
      }

      // 4. Upload Media Files to R2
      const mediaFileUrls: { url: string; type: "image" | "video"; originalName: string }[] = [];
      
      if (files?.mediaFiles?.length) {
        console.log(`\n=== UPLOADING ${files.mediaFiles.length} MEDIA FILES ===`);
        
        for (let i = 0; i < files.mediaFiles.length; i++) {
          const file = files.mediaFiles[i];
          console.log(`[${i + 1}/${files.mediaFiles.length}] Uploading: ${file.originalname} (${file.mimetype}, ${Math.round(file.size / 1024)}KB)`);
          
          try {
            const result = await uploadToR2(file, "courses/media");
            const mediaType: "image" | "video" = file.mimetype.startsWith("video") ? "video" : "image";
            
            mediaFileUrls.push({
              url: result.url,
              type: mediaType,
              originalName: file.originalname,
            });
            uploadedKeys.push(result.key);
            
            console.log(`[${i + 1}/${files.mediaFiles.length}] ✓ Uploaded: ${result.url} (type: ${mediaType})`);
          } catch (uploadError) {
            console.error(`[${i + 1}/${files.mediaFiles.length}] ✗ Failed:`, uploadError);
            throw uploadError;
          }
        }
        console.log(`=== ALL ${mediaFileUrls.length} MEDIA FILES UPLOADED ===\n`);
      } else {
        console.log("No media files to upload");
      }

      // 5. Parse JSON Data from FormData
      let incoming = { ...req.body } as any;
      let contentData = parseJSON(incoming.content) || {};

      // ✅ FIX: Only use fallback if the frontend sent an empty content object (legacy support)
      if (Object.keys(contentData).length === 0) {
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
        };
      }

      if (instructorImageUrl) {
        if (!contentData.instructor) contentData.instructor = {} as any;
        contentData.instructor.image = instructorImageUrl;
      }

      // Map uploaded URLs to media assets
      if (mediaFileUrls.length > 0) {
        console.log("\n=== MAPPING UPLOADED URLS TO MEDIA ASSETS ===");
        
        if (!contentData.mediaAssets) {
          contentData.mediaAssets = [];
        }

        let urlIndex = 0;
        
        contentData.mediaAssets = contentData.mediaAssets.map((asset: any, i: number) => {
          const isNewUpload = asset.isNew === true || 
                              (asset.src && asset.src.startsWith('blob:'));
          
          if (isNewUpload && urlIndex < mediaFileUrls.length) {
            const uploaded = mediaFileUrls[urlIndex++];
            console.log(`Asset #${i}: Replaced blob URL -> ${uploaded.url} (type: ${uploaded.type})`);
            return {
              type: uploaded.type,
              src: uploaded.url,
              poster: asset.poster || "",
            };
          }
          return asset;
        });

        while (urlIndex < mediaFileUrls.length) {
          const uploaded = mediaFileUrls[urlIndex++];
          console.log(`Added new asset: ${uploaded.url} (type: ${uploaded.type})`);
          contentData.mediaAssets.push({
            type: uploaded.type,
            src: uploaded.url,
          });
        }
        
        console.log(`Final mediaAssets count: ${contentData.mediaAssets.length}`);
        console.log("=== MAPPING COMPLETE ===\n");
      }

      // 6. Parse Prices
      const rawPrice = incoming.price ?? incoming.price === 0 ? incoming.price : 0;
      const parsedPrice = parseFloat(String(rawPrice));
      
      if (Number.isNaN(parsedPrice)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid price provided" 
        });
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
        return res.status(400).json({ 
          success: false, 
          message: "Course title is required (title.en)" 
        });
      }

      // 8. Create Course
      const courseData: any = {
        slug: incoming.slug || "",
        title: title,
        category: incoming.category || "general",
        price: parsedPrice,
        originalPrice: parsedOriginalPrice,
        duration: parseJSON(incoming.duration) || { en: "", bn: "" },
        thumbnail: thumbnailUrl,
        videoUrl: videoUrl,
        content: contentData,
        heroSubtitle: contentData.hero?.subtitle || title,
        description: contentData.overview?.content || { en: "", bn: "" },
        quickInfo: contentData.quickInfo || [],
        levels: contentData.levels || [],
        features: contentData.features || [],
        faqs: contentData.faq || [],
        instructor: user?._id || incoming.instructor,
        instructorName: incoming.instructorName || contentData.instructor?.name || "",
        isPublished: incoming.isPublished === "true" || incoming.isPublished === true,
        publishedAt: new Date(),
      };

      console.log("Saving course to database...");
      const course = await Course.create(courseData);
      console.log("=== COURSE CREATED SUCCESSFULLY ===");
      console.log("Course ID:", course._id);
      console.log("Media assets saved:", course.content?.mediaAssets?.length || 0);

      res.status(201).json({
        success: true,
        data: course,
        message: "Course created successfully",
      });
    } catch (error: any) {
      console.error("\n=== ERROR IN COURSE CREATION ===");
      console.error("Error:", error.message);
      console.error("Cleaning up", uploadedKeys.length, "uploaded files...");
      
      for (const key of uploadedKeys) {
        try {
          await R2Service.deleteFile(key);
          console.log("Deleted:", key);
        } catch (deleteErr) {
          console.error("Failed to delete:", key, deleteErr);
        }
      }
      
      console.error("=== CLEANUP COMPLETE ===\n");

      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(400).json({ 
          success: false, 
          message: `${field} already exists` 
        });
      }

      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        return res.status(400).json({ 
          success: false, 
          message: messages.join(", ") 
        });
      }

      return res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to create course" 
      });
    }
  },
);


// 2. GET ALL COURSES (Public) - FIXED TO RETURN ALL DATA
export const getAllCourses = catchAsync(
  async (req: Request, res: Response) => {
    const { category, search, published, limit, page } = req.query;

    const filter: any = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    if (published !== undefined) {
      filter.isPublished = published === "true";
    } else {
      filter.isPublished = true;
    }

    if (search) {
      filter.$or = [
        { "title.en": { $regex: search, $options: "i" } },
        { "title.bn": { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { instructorName: { $regex: search, $options: "i" } },
      ];
    }

    // FIXED: Removed .select() so it returns ALL data including content, mediaAssets, hero, etc.
    const courses = await Course.find(filter)
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
  async (req: Request, res: Response) => {
    const course = await Course.findById(req.params.id).populate(
      "instructor",
      "name email",
    );

    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: "Course not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  },
);

// 4. GET SINGLE COURSE BY SLUG (Public)
export const getCourseBySlug = catchAsync(
  async (req: Request, res: Response) => {
    const course = await Course.findOne({ slug: req.params.slug }).populate(
      "instructor",
      "name email",
    );

    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: "Course not found" 
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  },
);

// 5. GET INSTRUCTOR COURSES (Protected)
export const getInstructorCourses = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const courses = await Course.find({ instructor: req.user?._id })
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
  async (req: RequestWithFiles, res: Response) => {
    const { id } = req.params;
    const files = req.files as MulterFiles | undefined;

    // Fix primitive string fields (existing code)
    const rawCourse = await Course.findById(id).lean();
    if (rawCourse) {
      const fixes: any = {};
      if (typeof rawCourse.duration === 'string') fixes.duration = { en: rawCourse.duration, bn: rawCourse.duration };
      if (typeof rawCourse.title === 'string') fixes.title = { en: rawCourse.title, bn: rawCourse.title };
      if (typeof rawCourse.heroSubtitle === 'string') fixes.heroSubtitle = { en: rawCourse.heroSubtitle, bn: rawCourse.heroSubtitle };
      if (typeof rawCourse.description === 'string') fixes.description = { en: rawCourse.description, bn: rawCourse.description };
      
      if (Object.keys(fixes).length > 0) {
        await Course.updateOne({ _id: id }, { $set: fixes });
      }
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    if (
      course.instructor?.toString() !== req.user?._id?.toString() &&
      req.user?.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized to update this course" });
    }

    const uploadedKeys: string[] = [];
    const oldUrlsToDelete: string[] = [];

    try {
      // Handle thumbnail upload
      if (files?.thumbnail?.[0]) {
        const result = await uploadToR2(files.thumbnail[0], "courses/thumbnails");
        uploadedKeys.push(result.key);
        if (course.thumbnail) oldUrlsToDelete.push(course.thumbnail);
        course.thumbnail = result.url;
      }

      // Handle video upload
      if (files?.video?.[0]) {
        const result = await uploadToR2(files.video[0], "courses/videos");
        uploadedKeys.push(result.key);
        if (course.videoUrl) oldUrlsToDelete.push(course.videoUrl);
        course.videoUrl = result.url;
      }

      // ✅ FIX: Handle instructor image upload ONCE (previously uploaded twice)
      let newInstructorImageUrl = "";
      if (files?.instructorImage?.[0]) {
        const result = await uploadToR2(files.instructorImage[0], "courses/instructors");
        newInstructorImageUrl = result.url;
        uploadedKeys.push(result.key);
        const oldInstructorImage = course.content?.instructor?.image;
        if (oldInstructorImage) oldUrlsToDelete.push(oldInstructorImage);
      }

      // ============================================
      // ✅ FIX #1: Parse content FIRST
      // ============================================
      const parsedContent = parseJSON(req.body.content) || {};

      // Handle media file uploads and map URLs
      if (files?.mediaFiles?.length) {
        const mediaFileUrls: { url: string; type: "image" | "video" }[] = [];
        for (const file of files.mediaFiles) {
          const result = await uploadToR2(file, "courses/media");
          mediaFileUrls.push({
            url: result.url,
            type: file.mimetype.startsWith("video") ? "video" : "image"
          });
          uploadedKeys.push(result.key);
        }

        // Map uploaded URLs to mediaAssets
        if (parsedContent.mediaAssets) {
          let urlIndex = 0;
          parsedContent.mediaAssets = parsedContent.mediaAssets.map((asset: any) => {
            if ((asset.isNew || asset.src?.startsWith('blob:')) && mediaFileUrls[urlIndex]) {
              const uploaded = mediaFileUrls[urlIndex++];
              return {
                type: uploaded.type,
                src: uploaded.url,
                poster: asset.poster || "",
              };
            }
            return asset;
          });

          // Add any remaining uploaded files as new assets
          while (urlIndex < mediaFileUrls.length) {
            const uploaded = mediaFileUrls[urlIndex++];
            parsedContent.mediaAssets.push({
              type: uploaded.type,
              src: uploaded.url,
            });
          }
        }
      }

      // Apply the newly uploaded instructor image URL to parsed content
      if (newInstructorImageUrl) {
        if (!parsedContent.instructor) parsedContent.instructor = {};
        parsedContent.instructor.image = newInstructorImageUrl;
      }

      // ============================================
      // ✅ FIX #2: Use DEEP MERGE instead of shallow spread
      // If parsedContent.instructor only has { name: "X" }, deep merge ensures
      // existing { title: "Y", designation: "Z" } are NOT wiped out.
      // ============================================
      const existingContent = course.content ? JSON.parse(JSON.stringify(course.content)) : {};
      course.content = deepMerge(existingContent, parsedContent) as any;

      // ============================================
      // ✅ FIX #3: Update top-level fields from content
      // ============================================
      if (course.content) {
        const c = course.content as any;
        if (c.hero?.title) course.title = c.hero.title;
        if (c.hero?.subtitle) course.heroSubtitle = c.hero.subtitle;
        if (c.overview?.content) course.description = c.overview.content;
        if (c.quickInfo) course.quickInfo = c.quickInfo;
        if (c.levels) course.levels = c.levels;
        if (c.features) course.features = c.features;
        if (c.faq) course.faqs = c.faq;
      }

      // Update simple fields
      if (req.body.slug !== undefined && req.body.slug !== course.slug) {
        course.slug = req.body.slug;
      }
      if (req.body.title) {
        course.title = parseJSON(req.body.title);
      }
      if (req.body.category) {
        course.category = req.body.category;
      }
      if (req.body.price !== undefined) {
        const p = parseFloat(req.body.price);
        if (!isNaN(p)) course.price = p;
      }
      if (req.body.originalPrice !== undefined) {
        const op = parseFloat(req.body.originalPrice);
        course.originalPrice = !isNaN(op) ? op : undefined;
      }
      if (req.body.duration) {
        course.duration = parseJSON(req.body.duration);
      }
      if (req.body.instructorName) {
        course.instructorName = req.body.instructorName;
      }

      // Update publish status
      if (req.body.isPublished !== undefined) {
        const isPublished = req.body.isPublished === "true" || req.body.isPublished === true;
        course.isPublished = isPublished;
        course.publishedAt = isPublished ? (course.publishedAt || new Date()) : undefined;
      }

      // ============================================
      // ✅ FIX #4: Mark content as modified (safety net for Mongoose)
      // ============================================
      course.markModified('content');

      console.log("=== SAVING COURSE UPDATE ===");
      console.log("Content keys:", Object.keys(course.content || {}));
      console.log("Media assets:", (course.content as any)?.mediaAssets?.length || 0);
      
      await course.save();
      
      console.log("=== COURSE UPDATED SUCCESSFULLY ===");

      // Delete old URLs after successful save
      for (const url of oldUrlsToDelete) {
        await deleteFromR2(url);
      }

      res.status(200).json({ 
        success: true, 
        data: course, 
        message: "Course updated successfully" 
      });

    } catch (error: any) {
      console.error("Update error:", error);
      
      // Cleanup uploaded files on error
      for (const key of uploadedKeys) {
        await R2Service.deleteFile(key).catch(console.error);
      }

      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(400).json({ 
          success: false, 
          message: `${field} already exists` 
        });
      }

      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        return res.status(400).json({ 
          success: false, 
          message: messages.join(", ") 
        });
      }

      return res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to update course" 
      });
    }
  },
);

// 7. DELETE COURSE
export const deleteCourse = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: "Course not found" 
      });
    }

    if (
      course.instructor?.toString() !== req.user?._id?.toString() &&
      req.user?.role !== "admin"
    ) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to delete this course" 
      });
    }

    try {
      if (course.thumbnail) {
        await deleteFromR2(course.thumbnail);
      }

      if (course.videoUrl) {
        await deleteFromR2(course.videoUrl);
      }

      const content = course.content as any;

      if (content?.instructor?.image) {
        await deleteFromR2(content.instructor.image);
      }

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

      await course.deleteOne();

      res.status(200).json({
        success: true,
        message: "Course deleted successfully",
      });
    } catch (error: any) {
      return res.status(500).json({ 
        success: false, 
        message: error.message || "Failed to delete course" 
      });
    }
  },
);