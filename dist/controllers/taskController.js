"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskStats = exports.reviewSubmission = exports.submitTask = exports.deleteTask = exports.updateTask = exports.getTasks = exports.createTask = void 0;
const Task_1 = __importDefault(require("../models/Task"));
// Helper to check overdue tasks
const checkOverdue = async () => {
    await Task_1.default.updateMany({
        status: { $in: ["assigned", "in_progress"] },
        deadline: { $lt: new Date() },
    }, { $set: { status: "overdue" } });
};
const createTask = async (req, res) => {
    try {
        if (req.user?.role !== "admin") {
            res
                .status(403)
                .json({ success: false, message: "Admin access required" });
            return;
        }
        const { title, description, assignedTo, priority, deadline, attachments } = req.body;
        const task = await Task_1.default.create({
            title,
            description,
            assignedTo,
            assignedBy: req.user._id,
            priority,
            deadline,
            attachments,
        });
        // Optional: Send notification here
        res.status(201).json({ success: true, task });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createTask = createTask;
const getTasks = async (req, res) => {
    try {
        await checkOverdue();
        const { status, priority, search, assignedTo } = req.query;
        const query = {};
        if (req.user?.role !== "admin") {
            query.assignedTo = req.user?._id; // Students only see their tasks
        }
        else {
            if (assignedTo)
                query.assignedTo = assignedTo;
        }
        if (status)
            query.status = status;
        if (priority)
            query.priority = priority;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }
        const tasks = await Task_1.default.find(query)
            .populate("assignedTo", "firstName lastName email")
            .populate("assignedBy", "firstName lastName")
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, tasks });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTasks = getTasks;
const updateTask = async (req, res) => {
    try {
        if (req.user?.role !== "admin") {
            res
                .status(403)
                .json({ success: false, message: "Admin access required" });
            return;
        }
        const { id } = req.params;
        const updates = req.body;
        const task = await Task_1.default.findByIdAndUpdate(id, updates, { new: true });
        if (!task) {
            res.status(404).json({ success: false, message: "Task not found" });
            return;
        }
        res.status(200).json({ success: true, task });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateTask = updateTask;
const deleteTask = async (req, res) => {
    try {
        if (req.user?.role !== "admin") {
            res
                .status(403)
                .json({ success: false, message: "Admin access required" });
            return;
        }
        const { id } = req.params;
        await Task_1.default.findByIdAndDelete(id);
        res
            .status(200)
            .json({ success: true, message: "Task deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteTask = deleteTask;
// Student submits task
const submitTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { note, files } = req.body;
        const task = await Task_1.default.findById(id);
        if (!task) {
            res.status(404).json({ success: false, message: "Task not found" });
            return;
        }
        if (task.assignedTo.toString() !== req.user?._id.toString()) {
            res.status(403).json({ success: false, message: "Not authorized" });
            return;
        }
        task.submission = { note, files, submittedAt: new Date() };
        task.status = "submitted";
        await task.save();
        res.status(200).json({ success: true, task });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.submitTask = submitTask;
// Admin reviews submission
const reviewSubmission = async (req, res) => {
    try {
        if (req.user?.role !== "admin") {
            res
                .status(403)
                .json({ success: false, message: "Admin access required" });
            return;
        }
        const { id } = req.params;
        const { action, adminFeedback } = req.body; // action: 'complete' or 'reject'
        const task = await Task_1.default.findById(id);
        if (!task || task.status !== "submitted") {
            res
                .status(400)
                .json({ success: false, message: "Task not found or not submitted" });
            return;
        }
        task.adminFeedback = adminFeedback;
        if (action === "complete") {
            task.status = "completed";
            task.completedAt = new Date();
        }
        else {
            task.status = "in_progress"; // Send back to student
        }
        await task.save();
        res.status(200).json({ success: true, task });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.reviewSubmission = reviewSubmission;
// Get Dashboard Stats
const getTaskStats = async (req, res) => {
    try {
        const matchStage = req.user?.role === "admin" ? {} : { assignedTo: req.user?._id };
        const stats = await Task_1.default.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
        ]);
        const formattedStats = {
            total: 0,
            assigned: 0,
            in_progress: 0,
            submitted: 0,
            completed: 0,
            overdue: 0,
        };
        stats.forEach((s) => (formattedStats[s._id] = s.count));
        formattedStats.total =
            Object.values(formattedStats).reduce((a, b) => a + b, 0) -
                (formattedStats.total || 0);
        res.status(200).json({ success: true, stats: formattedStats });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTaskStats = getTaskStats;
