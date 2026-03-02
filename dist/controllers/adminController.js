"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStats = exports.bulkDeleteUsers = exports.deleteUser = exports.updateUser = exports.createUserByAdmin = exports.getUserById = exports.getUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const mongoose_1 = __importDefault(require("mongoose"));
const emailService_1 = require("../utils/emailService");
const phoneService_1 = require("../utils/phoneService");
// Get all users with pagination and search
const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const role = req.query.role;
        const isEmailVerified = req.query.isEmailVerified;
        const isPhoneVerified = req.query.isPhoneVerified;
        const skip = (page - 1) * limit;
        // Build search query
        const query = {};
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
            User_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("-__v"),
            User_1.default.countDocuments(query),
        ]);
        const totalPages = Math.ceil(totalCount / limit);
        res.status(200).json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    limit,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch users",
        });
    }
};
exports.getUsers = getUsers;
// Get user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
            return;
        }
        const user = await User_1.default.findById(id).select("-__v");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: { user },
        });
    }
    catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch user",
        });
    }
};
exports.getUserById = getUserById;
// Create user by admin
const createUserByAdmin = async (req, res) => {
    try {
        const { email, firstName, lastName, phoneNumber, role = "student", } = req.body;
        // Check if user already exists
        const existingUser = await User_1.default.findOne({
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
        const user = new User_1.default({
            uid: new mongoose_1.default.Types.ObjectId().toString(), // Generate temporary UID
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
            await (0, emailService_1.sendVerificationEmail)(email);
        }
        if (phoneNumber) {
            await (0, phoneService_1.sendPhoneVerification)(phoneNumber);
        }
        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: { user },
        });
    }
    catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create user",
        });
    }
};
exports.createUserByAdmin = createUserByAdmin;
// Update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
            return;
        }
        // Convert string ID to ObjectId
        const objectId = new mongoose_1.default.Types.ObjectId(id);
        // Don't allow updating UID or email to existing one
        const { uid, email, ...allowedUpdates } = updates;
        if (email) {
            const existingUser = await User_1.default.findOne({
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
        const user = await User_1.default.findByIdAndUpdate(id, { $set: allowedUpdates }, { new: true, runValidators: true }).select("-__v");
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
            data: { user },
        });
    }
    catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update user",
        });
    }
};
exports.updateUser = updateUser;
// Delete user
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
            return;
        }
        const user = await User_1.default.findByIdAndDelete(id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
            });
            return;
        }
        // TODO: Also delete user from Firebase if needed
        // await auth.deleteUser(user.uid);
        res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete user",
        });
    }
};
exports.deleteUser = deleteUser;
// Bulk delete users
const bulkDeleteUsers = async (req, res) => {
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
        const validIds = userIds.filter((id) => mongoose_1.default.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            res.status(400).json({
                success: false,
                message: "No valid user IDs provided",
            });
            return;
        }
        // Convert string IDs to ObjectIds
        const objectIds = validIds.map((id) => new mongoose_1.default.Types.ObjectId(id));
        const result = await User_1.default.deleteMany({ _id: { $in: objectIds } });
        res.status(200).json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} users`,
            data: { deletedCount: result.deletedCount },
        });
    }
    catch (error) {
        console.error("Error bulk deleting users:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete users",
        });
    }
};
exports.bulkDeleteUsers = bulkDeleteUsers;
// Get user statistics
const getUserStats = async (req, res) => {
    try {
        const [totalUsers, adminUsers, studentUsers, verifiedEmailUsers, verifiedPhoneUsers, recentUsers,] = await Promise.all([
            User_1.default.countDocuments(),
            User_1.default.countDocuments({ role: "admin" }),
            User_1.default.countDocuments({ role: "student" }),
            User_1.default.countDocuments({ isEmailVerified: true }),
            User_1.default.countDocuments({ isPhoneVerified: true }),
            User_1.default.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select("firstName lastName email createdAt"),
        ]);
        const monthlyStats = await User_1.default.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1),
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
        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                adminUsers,
                studentUsers,
                verifiedEmailUsers,
                verifiedPhoneUsers,
                recentUsers,
                monthlyStats,
            },
        });
    }
    catch (error) {
        console.error("Error fetching user stats:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch user statistics",
        });
    }
};
exports.getUserStats = getUserStats;
