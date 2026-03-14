// src/controllers/adminController.ts
import { Request, Response } from "express";
import User from "../models/User";
import Course from "../models/Course";
import mongoose from "mongoose";
import { sendVerificationEmail } from "../utils/emailService";
import { sendPhoneVerification } from "../utils/phoneService";

// ==========================================
// USER MANAGEMENT CONTROLLERS
// ==========================================

// Get all users with pagination and search
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const role = req.query.role as string;
    const isEmailVerified = req.query.isEmailVerified;
    const isPhoneVerified = req.query.isPhoneVerified;

    const skip = (page - 1) * limit;

    // Build search query
    const query: any = {};

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isEmailVerified !== undefined) {
      query.isEmailVerified = isEmailVerified === "true";
    }

    if (isPhoneVerified !== undefined) {
      query.isPhoneVerified = isPhoneVerified === "true";
    }

    // Get users and total count
    const [users, totalCount] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-__v"),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      users: users,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch users",
    });
  }
};

// Get user by ID
export const getUserById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const user = await User.findById(id).select("-__v");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: user,
    });
  } catch (error: any) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user",
    });
  }
};

// Create user by admin
export const createUserByAdmin = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      email,
      firstName,
      lastName,
      phoneNumber,
      role = "student",
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, ...(phoneNumber ? [{ phoneNumber }] : [])],
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "User with this email or phone number already exists",
      });
      return;
    }

    // Create new user
    const user = new User({
      uid: new mongoose.Types.ObjectId().toString(), // Generate temporary UID
      email,
      firstName,
      lastName,
      phoneNumber,
      role,
      isEmailVerified: false,
      isPhoneVerified: !!phoneNumber ? false : undefined,
    });

    await user.save();

    // Send verification emails/SMS if needed
    if (email) {
      await sendVerificationEmail(email);
    }

    if (phoneNumber) {
      await sendPhoneVerification(phoneNumber);
    }

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: user,
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create user",
    });
  }
};

// Update user
export const updateUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    // Convert string ID to ObjectId
    const objectId = new mongoose.Types.ObjectId(id);

    // Don't allow updating UID or email to existing one
    const { uid, email, ...allowedUpdates } = updates;

    if (email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: objectId },
      });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: "Email already exists",
        });
        return;
      }
      allowedUpdates.email = email;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: allowedUpdates },
      { new: true, runValidators: true },
    ).select("-__v");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: user,
    });
  } catch (error: any) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update user",
    });
  }
};

// Delete user
export const deleteUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
      return;
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete user",
    });
  }
};

// Bulk delete users
export const bulkDeleteUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "User IDs array is required",
      });
      return;
    }

    // Validate all IDs
    const validIds = userIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    if (validIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid user IDs provided",
      });
      return;
    }

    // Convert string IDs to ObjectIds
    const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));

    const result = await User.deleteMany({ _id: { $in: objectIds } });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} users`,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error("Error bulk deleting users:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete users",
    });
  }
};

// ==========================================
// DASHBOARD STATISTICS & COURSES
// ==========================================

// Get user statistics (Updated to include Courses)
export const getUserStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // 1. Fetch User Stats
    const [
      totalUsers,
      adminUsers,
      studentUsers,
      verifiedEmailUsers,
      verifiedPhoneUsers,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ isEmailVerified: true }),
      User.countDocuments({ isPhoneVerified: true }),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("firstName lastName email createdAt"),
    ]);

    const monthlyStats = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 11,
              1,
            ),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // 2. Fetch Course Stats
    let totalCourses = 0;
    let activeCourses = 0;
    let totalLessons = 0;

    try {
      totalCourses = await Course.countDocuments();
      activeCourses = await Course.countDocuments({ status: "active" });

      // FIX: Cast 'course' to 'any' to avoid TypeScript error if 'lessons' is missing from ICourse interface
      const coursesWithLessons = await Course.find({
        lessons: { $exists: true, $ne: [] },
      });

      totalLessons = coursesWithLessons.reduce((acc, course: any) => {
        return acc + (course.lessons ? course.lessons.length : 0);
      }, 0);
    } catch (err) {
      console.warn("Course model not found or error fetching courses:", err);
    }

    // 3. Calculate new users this month
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalCourses,
        totalRevenue: 0, // TODO: Implement Payment logic
        totalLessons,
        newUsersThisMonth,
        activeCourses,
        // Extras
        adminUsers,
        studentUsers,
        recentUsers,
        monthlyStats,
      },
    });
  } catch (error: any) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user statistics",
    });
  }
};

// Get Recent Courses for Dashboard
export const getRecentCourses = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    // Fetch recent courses
    const courses = await Course.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("title instructor thumbnail status createdAt");

    res.status(200).json({
      success: true,
      courses: courses,
    });
  } catch (error: any) {
    console.error("Error fetching courses:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch courses",
    });
  }
};
