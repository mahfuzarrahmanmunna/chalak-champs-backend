"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUser = exports.validateCourse = void 0;
const joi_1 = __importDefault(require("joi"));
const validateCourse = (req, res, next) => {
    const schema = joi_1.default.object({
        title: joi_1.default.string().min(3).required(),
        titleBn: joi_1.default.string().optional(),
        description: joi_1.default.string().min(10).required(),
        descriptionBn: joi_1.default.string().optional(),
        category: joi_1.default.string()
            .valid("competition-prep", "language", "school-subjects", "skill-development", "other")
            .required(),
        level: joi_1.default.string()
            .valid("beginner", "intermediate", "advanced")
            .required(),
        language: joi_1.default.string().valid("en", "bn").default("en"),
        price: joi_1.default.number().min(0).required(),
        duration: joi_1.default.number().min(0).optional(),
        tags: joi_1.default.array().items(joi_1.default.string()).default([]),
        objectives: joi_1.default.array().items(joi_1.default.string()).default([]),
        requirements: joi_1.default.array().items(joi_1.default.string()).default([]),
        isPublished: joi_1.default.boolean().default(false),
    });
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: "Validation error",
            details: error.details.map((detail) => ({
                field: detail.path[0],
                message: detail.message,
            })),
        });
    }
    next();
};
exports.validateCourse = validateCourse;
const validateUser = (req, res, next) => {
    const schema = joi_1.default.object({
        email: joi_1.default.string().email().required(),
        firstName: joi_1.default.string().min(1).required(),
        lastName: joi_1.default.string().min(1).required(),
        phoneNumber: joi_1.default.string().optional(),
        role: joi_1.default.string().valid("admin", "student").default("student"),
    });
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            message: "Validation error",
            details: error.details.map((detail) => ({
                field: detail.path[0],
                message: detail.message,
            })),
        });
    }
    next();
};
exports.validateUser = validateUser;
