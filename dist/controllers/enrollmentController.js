"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEnrollmentStatus = exports.deleteEnrollment = exports.getAllEnrollments = exports.checkMultipleEnrollments = exports.getUserEnrollments = exports.checkEnrollment = void 0;
const Enrollment_1 = __importDefault(require("../models/Enrollment"));
const ManualPayment_1 = __importDefault(require("../models/ManualPayment"));
const mongoose_1 = __importDefault(require("mongoose"));
// Check if user is enrolled in a specific course
const checkEnrollment = async (req, res) => {
    try {
        const { courseId } = req.body;
        const user = req.user;
        if (!courseId) {
            res.status(400).json({ success: false, message: "Course ID is required" });
            return;
        }
        if (!user) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const enrollment = await Enrollment_1.default.findOne({
            user: user._id,
            course: courseId,
            status: "active",
        });
        const pendingPayment = await ManualPayment_1.default.findOne({
            user: user._id,
            course: courseId,
            status: "pending",
        });
        res.status(200).json({
            success: true,
            isEnrolled: !!enrollment,
            hasPendingPayment: !!pendingPayment,
        });
    }
    catch (error) {
        console.error("Check Enrollment Error:", error);
        res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
};
exports.checkEnrollment = checkEnrollment;
// Get all enrollments for a user
const getUserEnrollments = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }
        const enrollments = await Enrollment_1.default.find({ user: user._id })
            .populate("course", "title thumbnail originalPrice offerPrice slug")
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: enrollments });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getUserEnrollments = getUserEnrollments;
// Check multiple enrollments at once
const checkMultipleEnrollments = async (req, res) => {
    try {
        const { courseIds } = req.body;
        const user = req.user;
        if (!courseIds || !Array.isArray(courseIds)) {
            res.status(400).json({ success: false, message: "courseIds array is required" });
            return;
        }
        if (!user) {
            res.status(200).json({ success: true, enrolledCourseIds: [] });
            return;
        }
        const enrollments = await Enrollment_1.default.find({
            user: user._id,
            course: { $in: courseIds },
            status: "active",
        }).select("course");
        const enrolledCourseIds = enrollments.map((e) => e.course.toString());
        res.status(200).json({ success: true, enrolledCourseIds });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.checkMultipleEnrollments = checkMultipleEnrollments;
// =============================================
// ADMIN: Get all enrollments with populated data
// =============================================
const getAllEnrollments = async (req, res) => {
    try {
        const enrollments = await Enrollment_1.default.find()
            .populate("user", "firstName lastName phoneNumber email")
            .populate("course", "title offerPrice originalPrice")
            .sort({ createdAt: -1 })
            .lean();
        const formattedEnrollments = enrollments.map((en) => {
            const firstName = en.user?.firstName || "";
            const lastName = en.user?.lastName || "";
            return {
                _id: en._id.toString(),
                name: `${firstName} ${lastName}`.trim() || "Unknown User",
                phone: en.user?.phoneNumber || "N/A",
                email: en.user?.email || "",
                courseId: en.course?._id?.toString() || "",
                courseTitle: en.course?.title || "Unknown Course",
                amount: en.course?.offerPrice?.toString() || "0",
                status: en.status,
                createdAt: en.createdAt ? new Date(en.createdAt).toISOString() : new Date().toISOString(),
            };
        });
        res.status(200).json({
            success: true,
            enrollments: formattedEnrollments,
        });
    }
    catch (error) {
        console.error("Get All Enrollments Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAllEnrollments = getAllEnrollments;
// =============================================
// ADMIN: Delete an enrollment
// =============================================
const deleteEnrollment = async (req, res) => {
    try {
        const { id } = req.params;
        if (typeof id !== "string" || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: "Invalid ID format" });
            return;
        }
        const deleted = await Enrollment_1.default.findByIdAndDelete(id);
        if (!deleted) {
            res.status(404).json({ success: false, message: "Enrollment not found" });
            return;
        }
        res.status(200).json({ success: true, message: "Enrollment deleted successfully" });
    }
    catch (error) {
        console.error("Delete Enrollment Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteEnrollment = deleteEnrollment;
// =============================================
// ADMIN: Update enrollment status (Manage)
// =============================================
const updateEnrollmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!["active", "expired", "revoked"].includes(status)) {
            res.status(400).json({ success: false, message: "Invalid status provided" });
            return;
        }
        if (typeof id !== "string" || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: "Invalid ID format" });
            return;
        }
        const updated = await Enrollment_1.default.findByIdAndUpdate(id, { status }, { new: true });
        if (!updated) {
            res.status(404).json({ success: false, message: "Enrollment not found" });
            return;
        }
        res.status(200).json({ success: true, data: updated });
    }
    catch (error) {
        console.error("Update Enrollment Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateEnrollmentStatus = updateEnrollmentStatus;
