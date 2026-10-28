import { Request, Response, RequestHandler } from "express";
import mongoose from "mongoose";
import multer from "multer";
import TeacherProfile, { ITeacherProfile } from "../models/TeacherProfile";
import User from "../models/User";
import { R2Service } from "../services/r2.service";
import { generateUniqueSlug, slugifyBase } from "../utils/slugify";
// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────

const ELIGIBLE_ROLES = ["teacher", "instructor"];

// Fields safe to return on PUBLIC endpoints (NO userId, NO email, NO phone,
// NO internal admin metadata, NO verification documents)
const PUBLIC_FIELDS =
  "displayName profilePhotoUrl professionalTitle shortIntro biography slug " +
  "languagesSpoken subjects expertiseAreas teachingMethods skillsStudentsLearn " +
  "ageGroups gradeLevels levels education totalYearsExperience achievements awards " +
  "childFocusedExperience teachingPhilosophy teachingApproach whyTeachChildren " +
  "classFormat preferredLanguages portfolio availability verificationStatus";

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function isObjectId(v: unknown): boolean {
  return typeof v === "string" && mongoose.Types.ObjectId.isValid(v);
}

function bad(res: Response, message: string, status = 400) {
  return res.status(status).json({ success: false, message });
}

/** Whitelist of fields an admin may update via PUT. Avoids raw $set(req.body). */
function pickUpdateFields(body: any) {
  const out: Partial<ITeacherProfile> = {};
  const allow: (keyof ITeacherProfile)[] = [
    "displayName", "profilePhotoUrl", "professionalTitle", "shortIntro",
    "biography", "slug", "languagesSpoken", "subjects", "expertiseAreas",
    "teachingMethods", "skillsStudentsLearn", "ageGroups", "gradeLevels",
    "levels", "education", "experience", "totalYearsExperience", "achievements",
    "awards", "childFocusedExperience", "teachingPhilosophy", "teachingApproach",
    "whyTeachChildren", "classFormat", "preferredLanguages", "portfolio",
    "availability",
  ];
  for (const k of allow) {
    if (body[k] !== undefined) (out as any)[k] = body[k];
  }
  return out;
}

// ═════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS
// ═════════════════════════════════════════════════════════════

// GET /api/admin/teachers — list ALL users with role teacher/instructor,
// LEFT-JOINED with their TeacherProfile (if any). Users without a profile
// still appear in the list with an empty profile shell.
export const listTeachers: RequestHandler = async (req, res) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || "10")));
    const skip = (page - 1) * limit;

    const search = (req.query.search as string)?.trim() || "";
    const subjects = req.query.subjects
      ? (req.query.subjects as string).split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const approvalStatus = req.query.approvalStatus as string | undefined;
    const verificationStatus = req.query.verificationStatus as string | undefined;
    const isPublished = req.query.isPublished as string | undefined;
    const isActive = req.query.isActive as string | undefined;

    // ── Build the aggregation pipeline ───────────────────────────
    // Stage 1: match users with eligible role
    const userMatch: any = { role: { $in: ELIGIBLE_ROLES } };
    if (search) {
      userMatch.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        // also match against profile fields, applied post-lookup
      ];
    }

    // Stages that filter on the joined TeacherProfile (post-lookup)
    const profileMatch: any[] = [];
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

    const basePipeline: any[] = [
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
    const dataPipeline: any[] = [
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
    const countPipeline: any[] = [...basePipeline, { $count: "total" }];

    const [items, countResult] = await Promise.all([
      User.aggregate(dataPipeline).exec(),
      User.aggregate(countPipeline).exec(),
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
  } catch (e: any) {
    console.error("listTeachers error:", e);
    res.status(500).json({ success: false, message: e?.message || "Server Error" });
  }
};

// GET /api/admin/teachers/:id
export const getTeacherById: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return bad(res, "Invalid teacher profile ID");

    const teacher = await TeacherProfile.findById(id)
      .populate("user", "firstName lastName email role phoneNumber isEmailVerified")
      .lean();
    if (!teacher) return bad(res, "Teacher profile not found", 404);

    res.status(200).json({ success: true, teacher });
  } catch (e: any) {
    console.error("getTeacherById error:", e);
    res.status(500).json({ success: false, message: e?.message || "Server Error" });
  }
};

// GET /api/admin/teachers/by-user/:userId — for the Users page "Manage" button
export const getTeacherByUser: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isObjectId(userId)) return bad(res, "Invalid user ID");

    const teacher = await TeacherProfile.findOne({ user: userId })
      .populate("user", "firstName lastName email role")
      .lean();
    if (!teacher) return bad(res, "No teacher profile for this user", 404);

    res.status(200).json({ success: true, teacher });
  } catch (e: any) {
    console.error("getTeacherByUser error:", e);
    res.status(500).json({ success: false, message: e?.message || "Server Error" });
  }
};


// ─────────────────────────────────────────────────────────────
//  Multer config for profile photo uploads
// ─────────────────────────────────────────────────────────────
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowed.join(", ")}`) as any, false);
    }
  },
});

// ═════════════════════════════════════════════════════════════
//  PHOTO UPLOAD
//  POST /api/admin/teachers/upload-photo
//  Body: multipart form with field "photo" containing a single image
//  Returns: { success: true, url: "https://cdn.../teachers/photos/xxx.jpg" }
// ═════════════════════════════════════════════════════════════
export const uploadTeacherPhoto: RequestHandler = (req, res) => {
  photoUpload.single("photo")(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    try {
      const adminId = (req as any).user?._id;
      if (!adminId) return bad(res, "Unauthorized", 401);

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded. Send a multipart form with a 'photo' field.",
        });
      }

      // Upload to R2 — uses the same R2Service your gallery + course controllers use
      const result = await R2Service.uploadImage(
        file.buffer,
        file.mimetype,
        "teachers/photos",
      );

      res.status(200).json({
        success: true,
        url: result.url,
        key: result.key || "",
        message: "Photo uploaded successfully",
      });
    } catch (e: any) {
      console.error("uploadTeacherPhoto error:", e);
      res.status(500).json({ success: false, message: e?.message || "Server Error" });
    }
  });
};

// POST /api/admin/teachers — create teacher profile for an eligible user
export const createTeacher: RequestHandler = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const adminId = (req as any).user?._id;
    if (!adminId) return bad(res, "Unauthorized", 401);

    const { userId, ...payload } = req.body || {};
    if (!isObjectId(userId)) return bad(res, "A valid `userId` is required");
    if (!payload.displayName || !payload.professionalTitle) {
      return bad(res, "`displayName` and `professionalTitle` are required");
    }

    const user = await User.findById(userId).select("role firstName lastName");
    if (!user) return bad(res, "User not found", 404);
    if (!ELIGIBLE_ROLES.includes(user.role)) {
      return bad(res, `User role must be one of: ${ELIGIBLE_ROLES.join(", ")}`, 400);
    }

    // Prevent duplicate
    const existing = await TeacherProfile.findOne({ user: userId }).lean();
    if (existing) {
      return bad(res, "Teacher profile already exists for this user", 409);
    }

    // Generate slug
    const slugBase = payload.slug
      ? slugifyBase(payload.slug)
      : slugifyBase(`${user.firstName}-${user.lastName}`) || slugifyBase(payload.displayName);
    const slug = await generateUniqueSlug(slugBase);

    await session.withTransaction(async () => {
      const [created] = await TeacherProfile.create(
        [
          {
            ...pickUpdateFields(payload),
            user: userId,
            slug,
            createdBy: adminId,
            updatedBy: adminId,
          },
        ],
        { session },
      );
      const populated = await TeacherProfile.findById(created._id)
        .populate("user", "firstName lastName email role")
        .lean();
      res.status(201).json({ success: true, teacher: populated });
    });
  } catch (e: any) {
    console.error("createTeacher error:", e);
    if (e?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: e.message, details: e.errors });
    }
    if (e?.code === 11000) {
      return bad(res, "Slug or user already in use", 409);
    }
    res.status(500).json({ success: false, message: e?.message || "Server Error" });
  } finally {
    session.endSession();
  }
};

// PUT /api/admin/teachers/:id — update content fields only (NOT status)
export const updateTeacher: RequestHandler = async (req, res) => {
  try {
    const adminId = (req as any).user?._id;
    if (!adminId) return bad(res, "Unauthorized", 401);

    const { id } = req.params;
    if (!isObjectId(id)) return bad(res, "Invalid teacher profile ID");

    const existing = await TeacherProfile.findById(id);
    if (!existing) return bad(res, "Teacher profile not found", 404);

    const updates = pickUpdateFields(req.body || {});
    if (updates.slug && updates.slug !== existing.slug) {
      updates.slug = await generateUniqueSlug(updates.slug, existing._id);
    }
    updates.updatedBy = adminId;

    const updated = await TeacherProfile.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true },
    )
      .populate("user", "firstName lastName email role")
      .lean();

    res.status(200).json({ success: true, teacher: updated });
  } catch (e: any) {
    console.error("updateTeacher error:", e);
    if (e?.name === "ValidationError") {
      return res.status(400).json({ success: false, message: e.message, details: e.errors });
    }
    if (e?.code === 11000) return bad(res, "Slug already in use", 409);
    res.status(500).json({ success: false, message: e?.message || "Server Error" });
  }
};

// PATCH /api/admin/teachers/:id/status — approve/reject/publish/verify/deactivate
export const updateTeacherStatus: RequestHandler = async (req, res) => {
  const ALLOWED: Record<string, any> = {
    approvalStatus: ["pending", "approved", "rejected"],
    verificationStatus: ["pending", "verified", "rejected"],
    isPublished: [true, false],
    isActive: [true, false],
  };

  try {
    const adminId = (req as any).user?._id;
    if (!adminId) return bad(res, "Unauthorized", 401);

    const { id } = req.params;
    if (!isObjectId(id)) return bad(res, "Invalid teacher profile ID");

    const patch: any = { updatedBy: adminId };
    for (const key of Object.keys(ALLOWED)) {
      if (req.body[key] === undefined) continue;
      const value = req.body[key];
      const allowed = ALLOWED[key];
      const ok = allowed.includes(typeof value === "string" ? value : value);
      if (!ok) return bad(res, `Invalid value for ${key}`);
      patch[key] = value;
    }
    if (patch.approvalStatus === "approved") {
      patch.verificationStatus = patch.verificationStatus || "verified";
    }

    const updated = await TeacherProfile.findByIdAndUpdate(
      id,
      { $set: patch },
      { new: true },
    )
      .populate("user", "firstName lastName email role")
      .lean();
    if (!updated) return bad(res, "Teacher profile not found", 404);

    res.status(200).json({ success: true, teacher: updated });
  } catch (e: any) {
    console.error("updateTeacherStatus error:", e);
    res.status(500).json({ success: false, message: e?.message || "Server Error" });
  }
};

// DELETE /api/admin/teachers/:id — hard delete
export const deleteTeacher: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return bad(res, "Invalid teacher profile ID");

    const deleted = await TeacherProfile.findByIdAndDelete(id);
    if (!deleted) return bad(res, "Teacher profile not found", 404);

    res.status(200).json({ success: true, message: "Teacher profile deleted" });
  } catch (e: any) {
    console.error("deleteTeacher error:", e);
    res.status(500).json({ success: false, message: e?.message || "Server Error" });
  }
};

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
export const listPublicTeachers: RequestHandler = async (req, res) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit = Math.min(30, Math.max(1, parseInt((req.query.limit as string) || "9")));
    const skip = (page - 1) * limit;

    const search = (req.query.search as string)?.trim() || "";
    const subject = (req.query.subject as string)?.trim() || "";
    const ageGroup = (req.query.ageGroup as string)?.trim() || "";
    const gradeLevel = (req.query.gradeLevel as string)?.trim() || "";
    const language = (req.query.language as string)?.trim() || "";

    const filter: mongoose.FilterQuery<ITeacherProfile> = { ...PUBLIC_FILTER };
    if (search) {
      filter.$or = [
        { displayName: { $regex: search, $options: "i" } },
        { professionalTitle: { $regex: search, $options: "i" } },
        { shortIntro: { $regex: search, $options: "i" } },
      ];
    }
    if (subject) filter.subjects = subject;
    if (ageGroup) filter.ageGroups = ageGroup;
    if (gradeLevel) filter.gradeLevels = gradeLevel;
    if (language) filter.languagesSpoken = language;

    const [items, total] = await Promise.all([
      TeacherProfile.find(filter)
        .select(PUBLIC_FIELDS)
        .sort({ verificationStatus: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TeacherProfile.countDocuments(filter),
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
  } catch (e: any) {
    console.error("listPublicTeachers error:", e);
    res.status(500).json({ success: false, message: e?.message || "Server Error" });
  }
};

// GET /api/teachers/:slug — public detail page
export const getPublicTeacherBySlug: RequestHandler = async (req, res) => {
  try {
    const slugParam = req.params.slug;
    if (typeof slugParam !== "string" || !slugParam) {
      return bad(res, "Invalid slug");
    }
    const slug = slugParam.toLowerCase();

    const teacher = await TeacherProfile.findOne({
      ...PUBLIC_FILTER,
      slug,
    })
      .select(PUBLIC_FIELDS)
      .lean();

    if (!teacher) return bad(res, "Teacher not found", 404);

    res.status(200).json({ success: true, teacher });
  } catch (e: any) {
    console.error("getPublicTeacherBySlug error:", e);
    res.status(500).json({ success: false, message: e?.message || "Server Error" });
  }
};

// GET /api/teachers/:slug/courses — courses taught by this teacher
// NOTE: Adjust the field names (instructor/teacher/createdBy) to match your
// actual Course schema. The $or covers common conventions.
export const getPublicTeacherCourses: RequestHandler = async (req, res) => {
  try {
    const slugParam = req.params.slug;
    if (typeof slugParam !== "string" || !slugParam) {
      return bad(res, "Invalid slug");
    }
    const slug = slugParam.toLowerCase();

    const teacher = await TeacherProfile.findOne({
      ...PUBLIC_FILTER,
      slug,
    })
      .select("user")
      .lean();
    if (!teacher) return bad(res, "Teacher not found", 404);

    const Course = mongoose.model("Course");
    const courses = await Course.find({
      $or: [
        { instructor: teacher.user },
        { teacher: teacher.user },
        { createdBy: teacher.user },
      ],
      status: { $in: ["published", "active"] },
    })
      .select(
        "title slug thumbnail subject ageGroup difficultyLevel duration lessonsCount format price shortDescription",
      )
      .limit(20)
      .lean()
      .catch(() => []);

    res.status(200).json({ success: true, courses });
  } catch (e: any) {
    console.error("getPublicTeacherCourses error:", e);
    res.status(500).json({ success: false, message: e?.message || "Server Error" });
  }
};

