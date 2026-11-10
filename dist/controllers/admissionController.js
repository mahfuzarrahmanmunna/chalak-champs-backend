"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdmissions = exports.createAdmission = exports.getAdmissionDashboard = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Admission_1 = __importDefault(require("../models/Admission"));
const AdmissionSequence_1 = __importDefault(require("../models/AdmissionSequence"));
const Course_1 = __importDefault(require("../models/Course"));
const admissionStatuses = [
    "Submitted",
    "Under Review",
    "Additional Information Required",
    "Approved",
    "Rejected",
    "Enrolled",
];
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const getCourseTitle = (title) => {
    if (typeof title === "string")
        return title;
    if (title && typeof title === "object") {
        const bilingualTitle = title;
        if (typeof bilingualTitle.en === "string" && bilingualTitle.en) {
            return bilingualTitle.en;
        }
        if (typeof bilingualTitle.bn === "string" && bilingualTitle.bn) {
            return bilingualTitle.bn;
        }
    }
    return "Course";
};
const getAdmissionDashboard = async (_req, res) => {
    try {
        const [total, submitted, underReview, additionalInformation, approved, rejected, enrolled, recentApplications, courseStats,] = await Promise.all([
            Admission_1.default.countDocuments(),
            Admission_1.default.countDocuments({ status: "Submitted" }),
            Admission_1.default.countDocuments({ status: "Under Review" }),
            Admission_1.default.countDocuments({ status: "Additional Information Required" }),
            Admission_1.default.countDocuments({ status: "Approved" }),
            Admission_1.default.countDocuments({ status: "Rejected" }),
            Admission_1.default.countDocuments({ status: "Enrolled" }),
            Admission_1.default.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select("applicationNumber student.fullName courseTitle status createdAt")
                .lean(),
            Admission_1.default.aggregate([
                { $group: { _id: "$courseTitle", count: { $sum: 1 } } },
                { $sort: { count: -1, _id: 1 } },
                { $limit: 6 },
            ]),
        ]);
        res.status(200).json({
            success: true,
            stats: {
                total,
                submitted,
                underReview,
                additionalInformation,
                approved,
                rejected,
                enrolled,
            },
            recentApplications,
            courseStats,
        });
    }
    catch (error) {
        console.error("Failed to load admission dashboard:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load admission dashboard",
        });
    }
};
exports.getAdmissionDashboard = getAdmissionDashboard;
const createAdmission = async (req, res) => {
    try {
        const body = req.body || {};
        const { student, guardian, education, courseId, preferredBatch, motivation, previousExperience, } = body;
        if (!student ||
            !isNonEmptyString(student.fullName) ||
            !isNonEmptyString(student.email) ||
            !isNonEmptyString(student.phone) ||
            !guardian ||
            !isNonEmptyString(guardian.fullName) ||
            !isNonEmptyString(guardian.phone) ||
            !mongoose_1.default.Types.ObjectId.isValid(courseId)) {
            res.status(400).json({
                success: false,
                message: "Student name, email, phone, guardian name and phone, and a valid course are required.",
            });
            return;
        }
        const normalizedEmail = student.email.trim().toLowerCase();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(normalizedEmail) ||
            (guardian.email &&
                (typeof guardian.email !== "string" ||
                    !emailPattern.test(guardian.email.trim())))) {
            res.status(400).json({
                success: false,
                message: "Enter valid student and guardian email addresses.",
            });
            return;
        }
        const dateOfBirth = student.dateOfBirth === undefined || student.dateOfBirth === ""
            ? undefined
            : new Date(student.dateOfBirth);
        if (dateOfBirth &&
            (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date())) {
            res.status(400).json({
                success: false,
                message: "Enter a valid date of birth.",
            });
            return;
        }
        const passingYear = education?.passingYear === undefined || education?.passingYear === ""
            ? undefined
            : Number(education.passingYear);
        if (passingYear !== undefined &&
            (!Number.isInteger(passingYear) ||
                passingYear < 1900 ||
                passingYear > new Date().getFullYear() + 10)) {
            res.status(400).json({
                success: false,
                message: "Enter a valid passing year.",
            });
            return;
        }
        const course = await Course_1.default.findById(courseId).select("title");
        if (!course) {
            res.status(400).json({
                success: false,
                message: "The selected course does not exist.",
            });
            return;
        }
        if (!req.user?._id) {
            res.status(401).json({ success: false, message: "Authentication required." });
            return;
        }
        const year = new Date().getFullYear();
        const sequence = await AdmissionSequence_1.default.findOneAndUpdate({ year }, { $inc: { sequence: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
        if (!sequence) {
            throw new Error("Failed to allocate an admission application number.");
        }
        const applicationNumber = `CC-ADM-${year}-${String(sequence.sequence).padStart(5, "0")}`;
        const status = "Submitted";
        const normalizedGuardian = {
            ...guardian,
            fullName: guardian.fullName.trim(),
            phone: guardian.phone.trim(),
            email: isNonEmptyString(guardian.email)
                ? guardian.email.trim().toLowerCase()
                : undefined,
        };
        const admission = await Admission_1.default.create({
            applicationNumber,
            student: {
                ...student,
                fullName: student.fullName.trim(),
                email: normalizedEmail,
                phone: student.phone.trim(),
                dateOfBirth,
            },
            guardian: normalizedGuardian,
            education: { ...(education || {}), passingYear },
            course: course._id,
            courseTitle: getCourseTitle(course.title),
            preferredBatch,
            motivation,
            previousExperience,
            status,
            statusHistory: [
                { status, changedBy: req.user._id, changedAt: new Date() },
            ],
            createdBy: req.user._id,
        });
        res.status(201).json({
            success: true,
            message: "Admission application created.",
            application: {
                id: admission._id,
                applicationNumber: admission.applicationNumber,
                status: admission.status,
            },
        });
    }
    catch (error) {
        console.error("Failed to create admission application:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create admission application",
        });
    }
};
exports.createAdmission = createAdmission;
const getAdmissions = async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const status = req.query.status;
        const query = {};
        if (status) {
            if (!admissionStatuses.includes(status)) {
                res.status(400).json({ success: false, message: "Invalid application status." });
                return;
            }
            query.status = status;
        }
        const [applications, total] = await Promise.all([
            Admission_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Admission_1.default.countDocuments(query),
        ]);
        res.status(200).json({
            success: true,
            applications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error("Failed to load admission applications:", error);
        res.status(500).json({
            success: false,
            message: "Failed to load admission applications",
        });
    }
};
exports.getAdmissions = getAdmissions;
