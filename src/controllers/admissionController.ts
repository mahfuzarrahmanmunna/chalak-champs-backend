import { Request, Response } from "express";
import mongoose from "mongoose";
import Admission, { AdmissionStatus } from "../models/Admission";
import AdmissionSequence from "../models/AdmissionSequence";
import Course from "../models/Course";
import { AuthRequest } from "../middleware/auth";

const admissionStatuses: AdmissionStatus[] = [
  "Submitted",
  "Under Review",
  "Additional Information Required",
  "Approved",
  "Rejected",
  "Enrolled",
];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const getCourseTitle = (title: unknown): string => {
  if (typeof title === "string") return title;
  if (title && typeof title === "object") {
    const bilingualTitle = title as { en?: unknown; bn?: unknown };
    if (typeof bilingualTitle.en === "string" && bilingualTitle.en) {
      return bilingualTitle.en;
    }
    if (typeof bilingualTitle.bn === "string" && bilingualTitle.bn) {
      return bilingualTitle.bn;
    }
  }
  return "Course";
};

export const getAdmissionDashboard = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  try {
    const [
      total,
      submitted,
      underReview,
      additionalInformation,
      approved,
      rejected,
      enrolled,
      recentApplications,
      courseStats,
    ] = await Promise.all([
      Admission.countDocuments(),
      Admission.countDocuments({ status: "Submitted" }),
      Admission.countDocuments({ status: "Under Review" }),
      Admission.countDocuments({ status: "Additional Information Required" }),
      Admission.countDocuments({ status: "Approved" }),
      Admission.countDocuments({ status: "Rejected" }),
      Admission.countDocuments({ status: "Enrolled" }),
      Admission.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("applicationNumber student.fullName courseTitle status createdAt")
        .lean(),
      Admission.aggregate([
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
  } catch (error) {
    console.error("Failed to load admission dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load admission dashboard",
    });
  }
};

export const createAdmission = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const body = req.body || {};
    const {
      student,
      guardian,
      education,
      courseId,
      preferredBatch,
      motivation,
      previousExperience,
    } = body;

    if (
      !student ||
      !isNonEmptyString(student.fullName) ||
      !isNonEmptyString(student.email) ||
      !isNonEmptyString(student.phone) ||
      !guardian ||
      !isNonEmptyString(guardian.fullName) ||
      !isNonEmptyString(guardian.phone) ||
      !mongoose.Types.ObjectId.isValid(courseId)
    ) {
      res.status(400).json({
        success: false,
        message:
          "Student name, email, phone, guardian name and phone, and a valid course are required.",
      });
      return;
    }

    const normalizedEmail = student.email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !emailPattern.test(normalizedEmail) ||
      (guardian.email &&
        (typeof guardian.email !== "string" ||
          !emailPattern.test(guardian.email.trim())))
    ) {
      res.status(400).json({
        success: false,
        message: "Enter valid student and guardian email addresses.",
      });
      return;
    }

    const dateOfBirth =
      student.dateOfBirth === undefined || student.dateOfBirth === ""
        ? undefined
        : new Date(student.dateOfBirth);
    if (
      dateOfBirth &&
      (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date())
    ) {
      res.status(400).json({
        success: false,
        message: "Enter a valid date of birth.",
      });
      return;
    }
    const passingYear =
      education?.passingYear === undefined || education?.passingYear === ""
        ? undefined
        : Number(education.passingYear);
    if (
      passingYear !== undefined &&
      (!Number.isInteger(passingYear) ||
        passingYear < 1900 ||
        passingYear > new Date().getFullYear() + 10)
    ) {
      res.status(400).json({
        success: false,
        message: "Enter a valid passing year.",
      });
      return;
    }

    const course = await Course.findById(courseId).select("title");
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
    const sequence = await AdmissionSequence.findOneAndUpdate(
      { year },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (!sequence) {
      throw new Error("Failed to allocate an admission application number.");
    }
    const applicationNumber = `CC-ADM-${year}-${String(sequence.sequence).padStart(5, "0")}`;
    const status: AdmissionStatus = "Submitted";
    const normalizedGuardian = {
      ...guardian,
      fullName: guardian.fullName.trim(),
      phone: guardian.phone.trim(),
      email: isNonEmptyString(guardian.email)
        ? guardian.email.trim().toLowerCase()
        : undefined,
    };

    const admission = await Admission.create({
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
  } catch (error) {
    console.error("Failed to create admission application:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create admission application",
    });
  }
};

export const getAdmissions = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string | undefined;
    const query: Record<string, unknown> = {};

    if (status) {
      if (!admissionStatuses.includes(status as AdmissionStatus)) {
        res.status(400).json({ success: false, message: "Invalid application status." });
        return;
      }
      query.status = status;
    }

    const [applications, total] = await Promise.all([
      Admission.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Admission.countDocuments(query),
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
  } catch (error) {
    console.error("Failed to load admission applications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load admission applications",
    });
  }
};
