"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicTeacherCourses = exports.getPublicTeacherBySlug = exports.listPublicTeachers = exports.deleteTeacher = exports.updateTeacherStatus = exports.updateTeacher = exports.createTeacher = exports.listTeachersForSelect = exports.uploadTeacherPhoto = exports.getTeacherByUser = exports.getTeacherById = exports.listTeachers = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const TeacherProfile_1 = __importDefault(require("../models/TeacherProfile"));
const User_1 = __importDefault(require("../models/User"));
const r2_service_1 = require("../services/r2.service");
const slugify_1 = require("../utils/slugify");
// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────
const ELIGIBLE_ROLES = ["teacher", "instructor"];
// Fields safe to return on PUBLIC endpoints (NO userId, NO email, NO phone,
// NO internal admin metadata, NO verification documents)
const PUBLIC_FIELDS = "displayName profilePhotoUrl professionalTitle shortIntro biography slug " +
    "languagesSpoken subjects expertiseAreas teachingMethods skillsStudentsLearn " +
    "ageGroups gradeLevels levels education totalYearsExperience achievements awards " +
    "childFocusedExperience teachingPhilosophy teachingApproach whyTeachChildren " +
    "classFormat preferredLanguages portfolio availability verificationStatus";
// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────
function isObjectId(v) {
    return typeof v === "string" && mongoose_1.default.Types.ObjectId.isValid(v);
}
function bad(res, message, status = 400) {
    return res.status(status).json({ success: false, message });
}
/** Whitelist of fields an admin may update via PUT. Avoids raw $set(req.body). */
function pickUpdateFields(body) {
    const out = {};
    const allow = [
        "displayName", "profilePhotoUrl", "professionalTitle", "shortIntro",
        "biography", "slug", "languagesSpoken", "subjects", "expertiseAreas",
        "teachingMethods", "skillsStudentsLearn", "ageGroups", "gradeLevels",
        "levels", "education", "experience", "totalYearsExperience", "achievements",
        "awards", "childFocusedExperience", "teachingPhilosophy", "teachingApproach",
        "whyTeachChildren", "classFormat", "preferredLanguages", "portfolio",
        "availability",
        // ✅ NEW: allow status fields to be saved via PUT (Save Profile button)
        "verificationStatus",
        "approvalStatus",
        "approvalNote",
        "isPublished",
        "isActive",
    ];
    for (const k of allow) {
        if (body[k] !== undefined)
            out[k] = body[k];
    }
    return out;
}
// ═════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS
// ═════════════════════════════════════════════════════════════
// GET /api/admin/teachers — list ALL users with role teacher/instructor,
// LEFT-JOINED with their TeacherProfile (if any). Users without a profile
// still appear in the list with an empty profile shell.
const listTeachers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || "1"));
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10")));
        const skip = (page - 1) * limit;
        const search = req.query.search?.trim() || "";
        const subjects = req.query.subjects
            ? req.query.subjects.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
        const approvalStatus = req.query.approvalStatus;
        const verificationStatus = req.query.verificationStatus;
        const isPublished = req.query.isPublished;
        const isActive = req.query.isActive;
        // ── Build the aggregation pipeline ───────────────────────────
        // Stage 1: match users with eligible role
        const userMatch = { role: { $in: ELIGIBLE_ROLES } };
        if (search) {
            userMatch.$or = [
                { firstName: { $regex: search, $options: "i" } },
                { lastName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                // also match against profile fields, applied post-lookup
            ];
        }
        // Stages that filter on the joined TeacherProfile (post-lookup)
        const profileMatch = [];
        if (search) {
            // search also against profile fields (joined later)
            profileMatch.push({
                $match: {
                    $or: [
                        { "profile.displayName": { $regex: search, $options: "i" } },
                        { "profile.professionalTitle": { $regex: search, $options: "i" } },
                        { "profile.slug": { $regex: search, $options: "i" } },
                    ],
                },
            });
        }
        if (approvalStatus) {
            profileMatch.push({
                $match: {
                    $or: [
                        { "profile.approvalStatus": approvalStatus },
                        { profile: null }, // include users without profile when filter is "all"-like
                    ],
                },
            });
        }
        if (verificationStatus) {
            profileMatch.push({
                $match: { "profile.verificationStatus": verificationStatus },
            });
        }
        if (isPublished === "true") {
            profileMatch.push({ $match: { "profile.isPublished": true } });
        }
        if (isPublished === "false") {
            profileMatch.push({
                $match: { $or: [{ "profile.isPublished": false }, { profile: null }] },
            });
        }
        if (isActive === "true") {
            profileMatch.push({
                $match: { $or: [{ "profile.isActive": true }, { profile: null }] },
            });
        }
        if (isActive === "false") {
            profileMatch.push({ $match: { "profile.isActive": false } });
        }
        if (subjects.length) {
            profileMatch.push({ $match: { "profile.subjects": { $in: subjects } } });
        }
        const basePipeline = [
            { $match: userMatch },
            {
                $lookup: {
                    from: "teacherprofiles",
                    localField: "_id",
                    foreignField: "user",
                    as: "profile",
                },
            },
            {
                $unwind: {
                    path: "$profile",
                    preserveNullAndEmptyArrays: true,
                },
            },
            ...profileMatch,
        ];
        // Data pipeline (with sort + paginate + projection)
        const dataPipeline = [
            ...basePipeline,
            {
                $sort: {
                    "profile.updatedAt": -1,
                    updatedAt: -1,
                },
            },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    profileId: { $ifNull: ["$profile._id", null] },
                    userId: "$_id",
                    hasProfile: { $ne: [{ $type: "$profile" }, "missing"] },
                    displayName: {
                        $ifNull: [
                            "$profile.displayName",
                            { $concat: ["$firstName", " ", "$lastName"] },
                        ],
                    },
                    professionalTitle: { $ifNull: ["$profile.professionalTitle", ""] },
                    slug: { $ifNull: ["$profile.slug", ""] },
                    profilePhotoUrl: { $ifNull: ["$profile.profilePhotoUrl", ""] },
                    subjects: { $ifNull: ["$profile.subjects", []] },
                    verificationStatus: { $ifNull: ["$profile.verificationStatus", "none"] },
                    approvalStatus: { $ifNull: ["$profile.approvalStatus", "none"] },
                    isPublished: { $ifNull: ["$profile.isPublished", false] },
                    isActive: { $ifNull: ["$profile.isActive", true] },
                    updatedAt: { $ifNull: ["$profile.updatedAt", "$updatedAt"] },
                    user: {
                        firstName: "$firstName",
                        lastName: "$lastName",
                        email: "$email",
                        role: "$role",
                    },
                },
            },
        ];
        // Count pipeline (same filters, no pagination)
        const countPipeline = [...basePipeline, { $count: "total" }];
        const [items, countResult] = await Promise.all([
            User_1.default.aggregate(dataPipeline).exec(),
            User_1.default.aggregate(countPipeline).exec(),
        ]);
        const total = countResult[0]?.total || 0;
        res.status(200).json({
            success: true,
            teachers: items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        });
    }
    catch (e) {
        console.error("listTeachers error:", e);
        res.status(500).json({ success: false, message: e?.message || "Server Error" });
    }
};
exports.listTeachers = listTeachers;
// GET /api/admin/teachers/:id
const getTeacherById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id))
            return bad(res, "Invalid teacher profile ID");
        const teacher = await TeacherProfile_1.default.findById(id)
            .populate("user", "firstName lastName email role phoneNumber isEmailVerified")
            .lean();
        if (!teacher)
            return bad(res, "Teacher profile not found", 404);
        res.status(200).json({ success: true, teacher });
    }
    catch (e) {
        console.error("getTeacherById error:", e);
        res.status(500).json({ success: false, message: e?.message || "Server Error" });
    }
};
exports.getTeacherById = getTeacherById;
// GET /api/admin/teachers/by-user/:userId — for the Users page "Manage" button
const getTeacherByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!isObjectId(userId))
            return bad(res, "Invalid user ID");
        const teacher = await TeacherProfile_1.default.findOne({ user: userId })
            .populate("user", "firstName lastName email role")
            .lean();
        if (!teacher)
            return bad(res, "No teacher profile for this user", 404);
        res.status(200).json({ success: true, teacher });
    }
    catch (e) {
        console.error("getTeacherByUser error:", e);
        res.status(500).json({ success: false, message: e?.message || "Server Error" });
    }
};
exports.getTeacherByUser = getTeacherByUser;
// ─────────────────────────────────────────────────────────────
//  Multer config for profile photo uploads
// ─────────────────────────────────────────────────────────────
const photoUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowed.join(", ")}`), false);
        }
    },
});
// ═════════════════════════════════════════════════════════════
//  PHOTO UPLOAD
//  POST /api/admin/teachers/upload-photo
//  Body: multipart form with field "photo" containing a single image
//  Returns: { success: true, url: "https://cdn.../teachers/photos/xxx.jpg" }
// ═════════════════════════════════════════════════════════════
const uploadTeacherPhoto = (req, res) => {
    photoUpload.single("photo")(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        try {
            const adminId = req.user?._id;
            if (!adminId)
                return bad(res, "Unauthorized", 401);
            const file = req.file;
            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: "No file uploaded. Send a multipart form with a 'photo' field.",
                });
            }
            // Upload to R2 — uses the same R2Service your gallery + course controllers use
            const result = await r2_service_1.R2Service.uploadImage(file.buffer, file.mimetype, "teachers/photos");
            res.status(200).json({
                success: true,
                url: result.url,
                key: result.key || "",
                message: "Photo uploaded successfully",
            });
        }
        catch (e) {
            console.error("uploadTeacherPhoto error:", e);
            res.status(500).json({ success: false, message: e?.message || "Server Error" });
        }
    });
};
exports.uploadTeacherPhoto = uploadTeacherPhoto;
// GET /api/admin/teachers/for-course-select
// Lightweight list of approved teachers — optimized for the course instructor dropdown
// GET /api/admin/teachers/for-course-select
const listTeachersForSelect = async (req, res) => {
    try {
        const teachers = await TeacherProfile_1.default.find({
            approvalStatus: "approved",
            isActive: true,
        })
            .populate("user", "firstName lastName email role")
            .select("displayName professionalTitle profilePhotoUrl subjects slug totalYearsExperience shortIntro biography awards education")
            .lean();
        res.status(200).json({
            success: true,
            teachers: teachers.map((t) => ({
                _id: t._id,
                displayName: t.displayName,
                professionalTitle: t.professionalTitle || "",
                profilePhotoUrl: t.profilePhotoUrl || "",
                subjects: t.subjects || [],
                slug: t.slug,
                totalYearsExperience: t.totalYearsExperience || 0,
                shortIntro: t.shortIntro || "",
                biography: t.biography || "",
                awards: t.awards || [],
                education: t.education || [],
                user: t.user,
            })),
        });
    }
    catch (e) {
        console.error("listTeachersForSelect error:", e);
        res.status(500).json({ success: false, message: e?.message || "Server Error" });
    }
};
exports.listTeachersForSelect = listTeachersForSelect;
// POST /api/admin/teachers — create teacher profile for an eligible user
const createTeacher = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    try {
        const adminId = req.user?._id;
        if (!adminId)
            return bad(res, "Unauthorized", 401);
        const { userId, ...payload } = req.body || {};
        if (!isObjectId(userId))
            return bad(res, "A valid `userId` is required");
        if (!payload.displayName || !payload.professionalTitle) {
            return bad(res, "`displayName` and `professionalTitle` are required");
        }
        const user = await User_1.default.findById(userId).select("role firstName lastName");
        if (!user)
            return bad(res, "User not found", 404);
        if (!ELIGIBLE_ROLES.includes(user.role)) {
            return bad(res, `User role must be one of: ${ELIGIBLE_ROLES.join(", ")}`, 400);
        }
        // Prevent duplicate
        const existing = await TeacherProfile_1.default.findOne({ user: userId }).lean();
        if (existing) {
            return bad(res, "Teacher profile already exists for this user", 409);
        }
        // Generate slug
        const slugBase = payload.slug
            ? (0, slugify_1.slugifyBase)(payload.slug)
            : (0, slugify_1.slugifyBase)(`${user.firstName}-${user.lastName}`) || (0, slugify_1.slugifyBase)(payload.displayName);
        const slug = await (0, slugify_1.generateUniqueSlug)(slugBase);
        await session.withTransaction(async () => {
            const [created] = await TeacherProfile_1.default.create([
                {
                    ...pickUpdateFields(payload),
                    user: userId,
                    slug,
                    createdBy: adminId,
                    updatedBy: adminId,
                },
            ], { session });
            const populated = await TeacherProfile_1.default.findById(created._id)
                .populate("user", "firstName lastName email role")
                .lean();
            res.status(201).json({ success: true, teacher: populated });
        });
    }
    catch (e) {
        console.error("createTeacher error:", e);
        if (e?.name === "ValidationError") {
            return res.status(400).json({ success: false, message: e.message, details: e.errors });
        }
        if (e?.code === 11000) {
            return bad(res, "Slug or user already in use", 409);
        }
        res.status(500).json({ success: false, message: e?.message || "Server Error" });
    }
    finally {
        session.endSession();
    }
};
exports.createTeacher = createTeacher;
// PUT /api/admin/teachers/:id — update content fields only (NOT status)
const updateTeacher = async (req, res) => {
    try {
        const adminId = req.user?._id;
        if (!adminId)
            return bad(res, "Unauthorized", 401);
        const { id } = req.params;
        if (!isObjectId(id))
            return bad(res, "Invalid teacher profile ID");
        const existing = await TeacherProfile_1.default.findById(id);
        if (!existing)
            return bad(res, "Teacher profile not found", 404);
        const updates = pickUpdateFields(req.body || {});
        if (updates.slug && updates.slug !== existing.slug) {
            updates.slug = await (0, slugify_1.generateUniqueSlug)(updates.slug, existing._id);
        }
        updates.updatedBy = adminId;
        const updated = await TeacherProfile_1.default.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })
            .populate("user", "firstName lastName email role")
            .lean();
        res.status(200).json({ success: true, teacher: updated });
    }
    catch (e) {
        console.error("updateTeacher error:", e);
        if (e?.name === "ValidationError") {
            return res.status(400).json({ success: false, message: e.message, details: e.errors });
        }
        if (e?.code === 11000)
            return bad(res, "Slug already in use", 409);
        res.status(500).json({ success: false, message: e?.message || "Server Error" });
    }
};
exports.updateTeacher = updateTeacher;
// PATCH /api/admin/teachers/:id/status — approve/reject/publish/verify/deactivate
const updateTeacherStatus = async (req, res) => {
    const ALLOWED = {
        approvalStatus: ["pending", "approved", "rejected"],
        verificationStatus: ["pending", "verified", "rejected"],
        isPublished: [true, false],
        isActive: [true, false],
    };
    try {
        const adminId = req.user?._id;
        if (!adminId)
            return bad(res, "Unauthorized", 401);
        const { id } = req.params;
        if (!isObjectId(id))
            return bad(res, "Invalid teacher profile ID");
        const patch = { updatedBy: adminId };
        for (const key of Object.keys(ALLOWED)) {
            if (req.body[key] === undefined)
                continue;
            const value = req.body[key];
            const allowed = ALLOWED[key];
            const ok = allowed.includes(typeof value === "string" ? value : value);
            if (!ok)
                return bad(res, `Invalid value for ${key}`);
            patch[key] = value;
        }
        if (patch.approvalStatus === "approved") {
            patch.verificationStatus = patch.verificationStatus || "verified";
        }
        const updated = await TeacherProfile_1.default.findByIdAndUpdate(id, { $set: patch }, { new: true })
            .populate("user", "firstName lastName email role")
            .lean();
        if (!updated)
            return bad(res, "Teacher profile not found", 404);
        res.status(200).json({ success: true, teacher: updated });
    }
    catch (e) {
        console.error("updateTeacherStatus error:", e);
        res.status(500).json({ success: false, message: e?.message || "Server Error" });
    }
};
exports.updateTeacherStatus = updateTeacherStatus;
// DELETE /api/admin/teachers/:id — hard delete
const deleteTeacher = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isObjectId(id))
            return bad(res, "Invalid teacher profile ID");
        const deleted = await TeacherProfile_1.default.findByIdAndDelete(id);
        if (!deleted)
            return bad(res, "Teacher profile not found", 404);
        res.status(200).json({ success: true, message: "Teacher profile deleted" });
    }
    catch (e) {
        console.error("deleteTeacher error:", e);
        res.status(500).json({ success: false, message: e?.message || "Server Error" });
    }
};
exports.deleteTeacher = deleteTeacher;
// ═════════════════════════════════════════════════════════════
//  PUBLIC ENDPOINTS
//  Only approved + published + active profiles are returned.
//  Sensitive fields (user id, email, phone, createdBy/updatedBy,
//  approvalNote, certificate verification documents) are NEVER projected.
// ═════════════════════════════════════════════════════════════
const PUBLIC_FILTER = {
    approvalStatus: "approved",
    isPublished: true,
    isActive: true,
};
// GET /api/teachers — public listing with filters
const listPublicTeachers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || "1"));
        const limit = Math.min(30, Math.max(1, parseInt(req.query.limit || "9")));
        const skip = (page - 1) * limit;
        const search = req.query.search?.trim() || "";
        const subject = req.query.subject?.trim() || "";
        const ageGroup = req.query.ageGroup?.trim() || "";
        const gradeLevel = req.query.gradeLevel?.trim() || "";
        const language = req.query.language?.trim() || "";
        const filter = { ...PUBLIC_FILTER };
        if (search) {
            filter.$or = [
                { displayName: { $regex: search, $options: "i" } },
                { professionalTitle: { $regex: search, $options: "i" } },
                { shortIntro: { $regex: search, $options: "i" } },
            ];
        }
        if (subject)
            filter.subjects = subject;
        if (ageGroup)
            filter.ageGroups = ageGroup;
        if (gradeLevel)
            filter.gradeLevels = gradeLevel;
        if (language)
            filter.languagesSpoken = language;
        const [items, total] = await Promise.all([
            TeacherProfile_1.default.find(filter)
                .select(PUBLIC_FIELDS)
                .sort({ verificationStatus: -1, updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            TeacherProfile_1.default.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true,
            teachers: items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        });
    }
    catch (e) {
        console.error("listPublicTeachers error:", e);
        res.status(500).json({ success: false, message: e?.message || "Server Error" });
    }
};
exports.listPublicTeachers = listPublicTeachers;
// GET /api/teachers/:slug — public detail page
const getPublicTeacherBySlug = async (req, res) => {
    try {
        const slugParam = req.params.slug;
        if (typeof slugParam !== "string" || !slugParam) {
            return bad(res, "Invalid slug");
        }
        const slug = slugParam.toLowerCase();
        const teacher = await TeacherProfile_1.default.findOne({
            ...PUBLIC_FILTER,
            slug,
        })
            .select(PUBLIC_FIELDS)
            .lean();
        if (!teacher)
            return bad(res, "Teacher not found", 404);
        res.status(200).json({ success: true, teacher });
    }
    catch (e) {
        console.error("getPublicTeacherBySlug error:", e);
        res.status(500).json({ success: false, message: e?.message || "Server Error" });
    }
};
exports.getPublicTeacherBySlug = getPublicTeacherBySlug;
// GET /api/teachers/:slug/courses — courses taught by this teacher
// NOTE: Adjust the field names (instructor/teacher/createdBy) to match your
// actual Course schema. The $or covers common conventions.
const getPublicTeacherCourses = async (req, res) => {
    try {
        const slugParam = req.params.slug;
        if (typeof slugParam !== "string" || !slugParam) {
            return bad(res, "Invalid slug");
        }
        const slug = slugParam.toLowerCase();
        const teacher = await TeacherProfile_1.default.findOne({
            ...PUBLIC_FILTER,
            slug,
        })
            .select("user")
            .lean();
        if (!teacher)
            return bad(res, "Teacher not found", 404);
        const Course = mongoose_1.default.model("Course");
        const courses = await Course.find({
            $or: [
                { instructor: teacher.user },
                { teacher: teacher.user },
                { createdBy: teacher.user },
            ],
            status: { $in: ["published", "active"] },
        })
            .select("title slug thumbnail subject ageGroup difficultyLevel duration lessonsCount format price shortDescription")
            .limit(20)
            .lean()
            .catch(() => []);
        res.status(200).json({ success: true, courses });
    }
    catch (e) {
        console.error("getPublicTeacherCourses error:", e);
        res.status(500).json({ success: false, message: e?.message || "Server Error" });
    }
};
exports.getPublicTeacherCourses = getPublicTeacherCourses;
