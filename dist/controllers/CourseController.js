"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCourse = exports.updateCourse = exports.getInstructorCourses = exports.getCourseBySlug = exports.getCourseById = exports.getAdminCourses = exports.getAllCourses = exports.createCourse = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const errorHandler_1 = require("../middleware/errorHandler");
const r2_service_1 = require("../services/r2.service");
const Course_1 = __importDefault(require("../models/Course"));
// --- HELPERS ---
const parseJSON = (value) => {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value === "object")
        return value;
    if (typeof value !== "string")
        return value;
    try {
        return JSON.parse(value);
    }
    catch {
        try {
            return JSON.parse(value.replace(/'/g, '"'));
        }
        catch {
            return { en: value, bn: value };
        }
    }
};
// ====================================================================
// ✅ FIX: Deep Merge Utility
// ====================================================================
function deepMerge(target, source) {
    const output = { ...target };
    for (const key of Object.keys(source)) {
        const sourceVal = source[key];
        const targetVal = output[key];
        if (sourceVal !== null &&
            sourceVal !== undefined &&
            typeof sourceVal === "object" &&
            !Array.isArray(sourceVal) &&
            targetVal !== null &&
            targetVal !== undefined &&
            typeof targetVal === "object" &&
            !Array.isArray(targetVal)) {
            output[key] = deepMerge(targetVal, sourceVal);
        }
        else if (sourceVal !== undefined) {
            output[key] = sourceVal;
        }
    }
    return output;
}
const uploadToR2 = async (file, folder) => {
    if (!file.buffer?.length) {
        throw new Error(`Empty file buffer for ${file.originalname}`);
    }
    const subFolder = file.mimetype.startsWith("video") ? "videos" : "images";
    return r2_service_1.R2Service.uploadFile(file.buffer, file.mimetype, `${folder}/${subFolder}`);
};
const deleteFromR2 = async (url) => {
    if (!url)
        return;
    try {
        const key = r2_service_1.R2Service.extractKeyFromUrl(url);
        if (key) {
            await r2_service_1.R2Service.deleteFile(key);
        }
    }
    catch (err) {
        console.error("Failed to delete from R2:", err);
    }
};
// ====================================================================
// ✅ HELPER: Process instructor images (used in both create & update)
// Maps uploaded R2 URLs to instructors marked with isNewImage
// ====================================================================
function mapInstructorImages(instructors, uploadedUrls) {
    if (!uploadedUrls.length || !instructors?.length)
        return instructors || [];
    let urlIndex = 0;
    return instructors.map((inst) => {
        if (inst.isNewImage &&
            inst.tempImageIndex !== undefined &&
            urlIndex < uploadedUrls.length) {
            const url = uploadedUrls[urlIndex++];
            return {
                ...inst,
                image: url,
                isNewImage: undefined,
                tempImageIndex: undefined,
            };
        }
        // Clean up flags even if no new image
        return {
            ...inst,
            isNewImage: undefined,
            tempImageIndex: undefined,
        };
    });
}
// ====================================================================
// 1. CREATE COURSE
// ====================================================================
exports.createCourse = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { user } = req;
    const files = req.files;
    console.log("=== COURSE CREATION START ===");
    console.log("Files received:", files ? Object.keys(files) : "NONE");
    console.log("Media files count:", files?.mediaFiles?.length || 0);
    console.log("Instructor images count:", files?.instructorImages?.length || 0);
    const uploadedKeys = [];
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
        // ====================================================================
        // ✅ NEW: Upload MULTIPLE Instructor Images to R2
        // ====================================================================
        const instructorImageUrls = [];
        if (files?.instructorImages?.length) {
            console.log(`\n=== UPLOADING ${files.instructorImages.length} INSTRUCTOR IMAGES ===`);
            for (let i = 0; i < files.instructorImages.length; i++) {
                const file = files.instructorImages[i];
                console.log(`[${i + 1}/${files.instructorImages.length}] Uploading: ${file.originalname}`);
                try {
                    const result = await uploadToR2(file, "courses/instructors");
                    instructorImageUrls.push(result.url);
                    uploadedKeys.push(result.key);
                    console.log(`[${i + 1}/${files.instructorImages.length}] ✓ Uploaded: ${result.url}`);
                }
                catch (uploadError) {
                    console.error(`[${i + 1}/${files.instructorImages.length}] ✗ Failed:`, uploadError);
                    throw uploadError;
                }
            }
            console.log(`=== ALL ${instructorImageUrls.length} INSTRUCTOR IMAGES UPLOADED ===\n`);
        }
        // 3. Upload Media Files to R2
        const mediaFileUrls = [];
        if (files?.mediaFiles?.length) {
            console.log(`\n=== UPLOADING ${files.mediaFiles.length} MEDIA FILES ===`);
            for (let i = 0; i < files.mediaFiles.length; i++) {
                const file = files.mediaFiles[i];
                console.log(`[${i + 1}/${files.mediaFiles.length}] Uploading: ${file.originalname} (${file.mimetype}, ${Math.round(file.size / 1024)}KB)`);
                try {
                    const result = await uploadToR2(file, "courses/media");
                    const mediaType = file.mimetype.startsWith("video")
                        ? "video"
                        : "image";
                    mediaFileUrls.push({
                        url: result.url,
                        type: mediaType,
                        originalName: file.originalname,
                    });
                    uploadedKeys.push(result.key);
                    console.log(`[${i + 1}/${files.mediaFiles.length}] ✓ Uploaded: ${result.url} (type: ${mediaType})`);
                }
                catch (uploadError) {
                    console.error(`[${i + 1}/${files.mediaFiles.length}] ✗ Failed:`, uploadError);
                    throw uploadError;
                }
            }
            console.log(`=== ALL ${mediaFileUrls.length} MEDIA FILES UPLOADED ===\n`);
        }
        // 4. Parse JSON Data from FormData
        let incoming = { ...req.body };
        let contentData = parseJSON(incoming.content) || {};
        // ✅ Legacy fallback
        if (Object.keys(contentData).length === 0) {
            contentData = {
                hero: {
                    title: parseJSON(incoming.title) || { en: "", bn: "" },
                    subtitle: parseJSON(incoming.heroSubtitle) || { en: "", bn: "" },
                },
                quickInfo: parseJSON(incoming.quickInfo) || {
                    items: { en: [], bn: [] },
                },
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
        // ====================================================================
        // ✅ NEW: Map uploaded instructor image URLs to instructors
        // ====================================================================
        if (instructorImageUrls.length > 0 && contentData.instructors) {
            console.log("\n=== MAPPING INSTRUCTOR IMAGE URLS ===");
            contentData.instructors = mapInstructorImages(contentData.instructors, instructorImageUrls);
            console.log(`Mapped ${instructorImageUrls.length} instructor images`);
            console.log("=== MAPPING COMPLETE ===\n");
        }
        else if (contentData.instructors) {
            // Clean up flags even if no new uploads
            contentData.instructors = contentData.instructors.map((inst) => ({
                ...inst,
                isNewImage: undefined,
                tempImageIndex: undefined,
            }));
        }
        // Map uploaded URLs to media assets
        if (mediaFileUrls.length > 0) {
            console.log("\n=== MAPPING UPLOADED URLS TO MEDIA ASSETS ===");
            if (!contentData.mediaAssets) {
                contentData.mediaAssets = [];
            }
            let urlIndex = 0;
            contentData.mediaAssets = contentData.mediaAssets.map((asset, i) => {
                const isNewUpload = asset.isNew === true ||
                    (asset.src && asset.src.startsWith("blob:"));
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
        // 5. Parse Prices
        const rawPrice = (incoming.price ?? incoming.price === 0) ? incoming.price : 0;
        const parsedPrice = parseFloat(String(rawPrice));
        if (Number.isNaN(parsedPrice)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid price provided" });
        }
        const parsedOriginalPrice = incoming.originalPrice
            ? parseFloat(String(incoming.originalPrice))
            : undefined;
        // 6. Get title for validation
        const title = parseJSON(incoming.title) ||
            contentData.hero?.title ||
            contentData.breadcrumb;
        if (!title?.en) {
            return res.status(400).json({
                success: false,
                message: "Course title is required (title.en)",
            });
        }
        // ====================================================================
        // ✅ NEW: Build instructorName from first instructor in the list
        // ====================================================================
        const firstInstructorName = contentData.instructors?.[0]?.name ||
            contentData.instructor?.name ||
            "";
        // 7. Create Course
        const courseData = {
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
            instructorName: incoming.instructorName || firstInstructorName,
            isPublished: incoming.isPublished === "true" || incoming.isPublished === true,
            publishedAt: new Date(),
        };
        console.log("Saving course to database...");
        const course = await Course_1.default.create(courseData);
        console.log("=== COURSE CREATED SUCCESSFULLY ===");
        console.log("Course ID:", course._id);
        console.log("Instructors count:", course.content?.instructors?.length || 0);
        console.log("Media assets saved:", course.content?.mediaAssets?.length || 0);
        res.status(201).json({
            success: true,
            data: course,
            message: "Course created successfully",
        });
    }
    catch (error) {
        console.error("\n=== ERROR IN COURSE CREATION ===");
        console.error("Error:", error.message);
        console.error("Cleaning up", uploadedKeys.length, "uploaded files...");
        for (const key of uploadedKeys) {
            try {
                await r2_service_1.R2Service.deleteFile(key);
                console.log("Deleted:", key);
            }
            catch (deleteErr) {
                console.error("Failed to delete:", key, deleteErr);
            }
        }
        console.error("=== CLEANUP COMPLETE ===\n");
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res
                .status(400)
                .json({ success: false, message: `${field} already exists` });
        }
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((err) => err.message);
            return res
                .status(400)
                .json({ success: false, message: messages.join(", ") });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create course",
        });
    }
});
// ====================================================================
// 2. GET ALL COURSES (Public)
// ====================================================================
exports.getAllCourses = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { category, search, published, limit, page } = req.query;
    const filter = {};
    const requestedLimit = Number(limit);
    const limitNum = Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.max(1, Math.min(Math.floor(requestedLimit), 100))
        : 50;
    const requestedPage = Number(page);
    const pageNum = Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;
    if (category && category !== "all") {
        filter.category = category;
    }
    if (published !== undefined) {
        if (published === "all") {
            // return both
        }
        else {
            filter.isPublished = published === "true";
        }
    }
    else {
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
    const queryStartedAt = Date.now();
    const [courses, total] = await Promise.all([
        Course_1.default.find(filter)
            .populate("instructor", "firstName lastName email avatar")
            .sort("-createdAt")
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum)
            .lean(),
        Course_1.default.countDocuments(filter),
    ]);
    console.info(JSON.stringify({
        event: "course_list_query",
        durationMs: Date.now() - queryStartedAt,
        resultCount: courses.length,
    }));
    if (filter.isPublished === true) {
        res.setHeader("Cache-Control", "private, max-age=30");
    }
    res.status(200).json({
        success: true,
        count: courses.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: courses,
    });
});
// ====================================================================
// 3. GET ADMIN COURSES
// ====================================================================
exports.getAdminCourses = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { category, search, published, limit, page } = req.query;
    const filter = {};
    if (category && category !== "all") {
        filter.category = category;
    }
    if (published !== undefined) {
        if (published === "all") {
            // return everything
        }
        else {
            filter.isPublished = published === "true";
        }
    }
    if (search) {
        filter.$or = [
            { "title.en": { $regex: search, $options: "i" } },
            { "title.bn": { $regex: search, $options: "i" } },
            { slug: { $regex: search, $options: "i" } },
            { instructorName: { $regex: search, $options: "i" } },
        ];
    }
    const limitNum = Number(limit) || 10;
    const pageNum = Number(page) || 1;
    const courses = await Course_1.default.find(filter)
        .populate("instructor", "firstName lastName email avatar")
        .sort("-createdAt")
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum);
    const total = await Course_1.default.countDocuments(filter);
    res.status(200).json({
        success: true,
        count: courses.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        data: courses,
    });
});
// ====================================================================
// 4. GET SINGLE COURSE BY ID
// ====================================================================
exports.getCourseById = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: "Invalid course ID format.",
        });
    }
    const course = await Course_1.default.findById(id).populate("instructor", "name email");
    if (!course) {
        return res
            .status(404)
            .json({ success: false, message: "Course not found" });
    }
    res.status(200).json({ success: true, data: course });
});
// ====================================================================
// 5. GET SINGLE COURSE BY SLUG
// ====================================================================
exports.getCourseBySlug = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const course = await Course_1.default.findOne({ slug: req.params.slug }).populate("instructor", "name email");
    if (!course) {
        return res
            .status(404)
            .json({ success: false, message: "Course not found" });
    }
    res.status(200).json({ success: true, data: course });
});
// ====================================================================
// 6. GET INSTRUCTOR COURSES
// ====================================================================
exports.getInstructorCourses = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const courses = await Course_1.default.find({ instructor: req.user?._id }).sort("-createdAt");
    res.status(200).json({
        success: true,
        count: courses.length,
        data: courses,
    });
});
// ====================================================================
// 7. UPDATE COURSE
// ====================================================================
exports.updateCourse = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { id } = req.params;
    const files = req.files;
    // Fix primitive string fields
    const rawCourse = await Course_1.default.findById(id).lean();
    if (rawCourse) {
        const fixes = {};
        if (typeof rawCourse.duration === "string")
            fixes.duration = {
                en: rawCourse.duration,
                bn: rawCourse.duration,
            };
        if (typeof rawCourse.title === "string")
            fixes.title = { en: rawCourse.title, bn: rawCourse.title };
        if (typeof rawCourse.heroSubtitle === "string")
            fixes.heroSubtitle = {
                en: rawCourse.heroSubtitle,
                bn: rawCourse.heroSubtitle,
            };
        if (typeof rawCourse.description === "string")
            fixes.description = {
                en: rawCourse.description,
                bn: rawCourse.description,
            };
        if (Object.keys(fixes).length > 0) {
            await Course_1.default.updateOne({ _id: id }, { $set: fixes });
        }
        // ====================================================================
        // ✅ AUTO-MIGRATE: Convert old single instructor to instructors array
        // ====================================================================
        if (rawCourse.content?.instructor && !rawCourse.content?.instructors) {
            console.log("=== AUTO-MIGRATING: content.instructor → content.instructors ===");
            await Course_1.default.updateOne({ _id: id }, {
                $set: {
                    "content.instructors": [rawCourse.content.instructor],
                    "content.instructorsTitle": rawCourse.content.instructor
                        ?.title || {
                        en: "Course Instructors",
                        bn: "কোর্স ইন্সট্রাক্টর",
                    },
                },
            });
        }
    }
    const course = await Course_1.default.findById(id);
    if (!course) {
        return res
            .status(404)
            .json({ success: false, message: "Course not found" });
    }
    if (course.instructor?.toString() !== req.user?._id?.toString() &&
        req.user?.role !== "admin") {
        return res
            .status(403)
            .json({
            success: false,
            message: "Not authorized to update this course",
        });
    }
    const uploadedKeys = [];
    const oldUrlsToDelete = [];
    try {
        // Handle thumbnail upload
        if (files?.thumbnail?.[0]) {
            const result = await uploadToR2(files.thumbnail[0], "courses/thumbnails");
            uploadedKeys.push(result.key);
            if (course.thumbnail)
                oldUrlsToDelete.push(course.thumbnail);
            course.thumbnail = result.url;
        }
        // Handle video upload
        if (files?.video?.[0]) {
            const result = await uploadToR2(files.video[0], "courses/videos");
            uploadedKeys.push(result.key);
            if (course.videoUrl)
                oldUrlsToDelete.push(course.videoUrl);
            course.videoUrl = result.url;
        }
        // ====================================================================
        // ✅ NEW: Upload MULTIPLE Instructor Images
        // ====================================================================
        const instructorImageUrls = [];
        if (files?.instructorImages?.length) {
            console.log(`\n=== UPLOADING ${files.instructorImages.length} INSTRUCTOR IMAGES (UPDATE) ===`);
            for (let i = 0; i < files.instructorImages.length; i++) {
                const file = files.instructorImages[i];
                try {
                    const result = await uploadToR2(file, "courses/instructors");
                    instructorImageUrls.push(result.url);
                    uploadedKeys.push(result.key);
                    console.log(`[${i + 1}] ✓ Instructor image uploaded: ${result.url}`);
                }
                catch (uploadError) {
                    console.error(`[${i + 1}] ✗ Failed:`, uploadError);
                    throw uploadError;
                }
            }
            console.log("=== INSTRUCTOR IMAGES UPLOAD COMPLETE ===\n");
        }
        // ====================================================================
        // ✅ Collect OLD instructor image URLs BEFORE merge (for cleanup)
        // ====================================================================
        const oldInstructorImages = [];
        const oldContent = course.content;
        if (oldContent?.instructors) {
            for (const inst of oldContent.instructors) {
                if (inst.image)
                    oldInstructorImages.push(inst.image);
            }
        }
        // Also check legacy single instructor
        if (oldContent?.instructor?.image) {
            oldInstructorImages.push(oldContent.instructor.image);
        }
        // Parse content FIRST
        const parsedContent = parseJSON(req.body.content) || {};
        // Handle media file uploads and map URLs
        if (files?.mediaFiles?.length) {
            const mediaFileUrls = [];
            for (const file of files.mediaFiles) {
                const result = await uploadToR2(file, "courses/media");
                mediaFileUrls.push({
                    url: result.url,
                    type: file.mimetype.startsWith("video") ? "video" : "image",
                });
                uploadedKeys.push(result.key);
            }
            if (parsedContent.mediaAssets) {
                let urlIndex = 0;
                parsedContent.mediaAssets = parsedContent.mediaAssets.map((asset) => {
                    if ((asset.isNew || asset.src?.startsWith("blob:")) &&
                        mediaFileUrls[urlIndex]) {
                        const uploaded = mediaFileUrls[urlIndex++];
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
                    parsedContent.mediaAssets.push({
                        type: uploaded.type,
                        src: uploaded.url,
                    });
                }
            }
        }
        // ====================================================================
        // ✅ Map uploaded instructor image URLs to instructors in parsed content
        // ====================================================================
        if (instructorImageUrls.length > 0 && parsedContent.instructors) {
            console.log("=== MAPPING INSTRUCTOR IMAGE URLS (UPDATE) ===");
            parsedContent.instructors = mapInstructorImages(parsedContent.instructors, instructorImageUrls);
            console.log("=== MAPPING COMPLETE ===\n");
        }
        else if (parsedContent.instructors) {
            parsedContent.instructors = parsedContent.instructors.map((inst) => ({
                ...inst,
                isNewImage: undefined,
                tempImageIndex: undefined,
            }));
        }
        // Deep merge
        const existingContent = course.content
            ? JSON.parse(JSON.stringify(course.content))
            : {};
        course.content = deepMerge(existingContent, parsedContent);
        // Update top-level fields from content
        if (course.content) {
            const c = course.content;
            if (c.hero?.title)
                course.title = c.hero.title;
            if (c.hero?.subtitle)
                course.heroSubtitle = c.hero.subtitle;
            if (c.overview?.content)
                course.description = c.overview.content;
            if (c.quickInfo)
                course.quickInfo = c.quickInfo;
            if (c.levels)
                course.levels = c.levels;
            if (c.features)
                course.features = c.features;
            if (c.faq)
                course.faqs = c.faq;
        }
        // ====================================================================
        // ✅ Update instructorName from first instructor in the list
        // ====================================================================
        const updatedInstructors = course.content?.instructors;
        if (updatedInstructors?.length > 0) {
            course.instructorName =
                updatedInstructors[0].name || course.instructorName;
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
            if (!isNaN(p))
                course.price = p;
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
        if (req.body.isPublished !== undefined) {
            const isPublished = req.body.isPublished === "true" || req.body.isPublished === true;
            course.isPublished = isPublished;
            course.publishedAt = isPublished
                ? course.publishedAt || new Date()
                : undefined;
        }
        course.markModified("content");
        console.log("=== SAVING COURSE UPDATE ===");
        console.log("Instructors count:", course.content?.instructors?.length || 0);
        console.log("Media assets:", course.content?.mediaAssets?.length || 0);
        await course.save();
        console.log("=== COURSE UPDATED SUCCESSFULLY ===");
        // Delete old URLs after successful save
        for (const url of oldUrlsToDelete) {
            await deleteFromR2(url);
        }
        // ====================================================================
        // ✅ Delete removed instructor images (ones that are no longer in the list)
        // ====================================================================
        const newInstructorImages = [];
        const savedContent = course.content;
        if (savedContent?.instructors) {
            for (const inst of savedContent.instructors) {
                if (inst.image)
                    newInstructorImages.push(inst.image);
            }
        }
        const instrImagesToDelete = oldInstructorImages.filter((url) => !newInstructorImages.includes(url));
        if (instrImagesToDelete.length > 0) {
            console.log(`Deleting ${instrImagesToDelete.length} removed instructor images...`);
            for (const url of instrImagesToDelete) {
                await deleteFromR2(url);
            }
        }
        res.status(200).json({
            success: true,
            data: course,
            message: "Course updated successfully",
        });
    }
    catch (error) {
        console.error("Update error:", error);
        for (const key of uploadedKeys) {
            await r2_service_1.R2Service.deleteFile(key).catch(console.error);
        }
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res
                .status(400)
                .json({ success: false, message: `${field} already exists` });
        }
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((err) => err.message);
            return res
                .status(400)
                .json({ success: false, message: messages.join(", ") });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update course",
        });
    }
});
// ====================================================================
// 8. DELETE COURSE
// ====================================================================
exports.deleteCourse = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { id } = req.params;
    const course = await Course_1.default.findById(id);
    if (!course) {
        return res
            .status(404)
            .json({ success: false, message: "Course not found" });
    }
    if (course.instructor?.toString() !== req.user?._id?.toString() &&
        req.user?.role !== "admin") {
        return res
            .status(403)
            .json({
            success: false,
            message: "Not authorized to delete this course",
        });
    }
    try {
        if (course.thumbnail)
            await deleteFromR2(course.thumbnail);
        if (course.videoUrl)
            await deleteFromR2(course.videoUrl);
        const content = course.content;
        // ✅ Delete all instructor images (plural)
        if (content?.instructors?.length) {
            for (const inst of content.instructors) {
                if (inst.image)
                    await deleteFromR2(inst.image);
            }
        }
        // Also handle legacy single instructor
        if (content?.instructor?.image) {
            await deleteFromR2(content.instructor.image);
        }
        if (content?.mediaAssets?.length) {
            for (const asset of content.mediaAssets) {
                if (asset.src)
                    await deleteFromR2(asset.src);
                if (asset.poster)
                    await deleteFromR2(asset.poster);
            }
        }
        await course.deleteOne();
        res.status(200).json({
            success: true,
            message: "Course deleted successfully",
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete course",
        });
    }
});
