"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.uploadToCloudinary = void 0;
// src/utils/cloudinary.ts
const cloudinary_1 = __importDefault(require("cloudinary"));
const errorHandler_1 = require("../middleware/errorHandler");
// Configure Cloudinary
cloudinary_1.default.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Upload file to Cloudinary
const uploadToCloudinary = async (filePath, folder) => {
    try {
        const result = await cloudinary_1.default.v2.uploader.upload(filePath, {
            folder,
            resource_type: "auto", // Automatically detect resource type
        });
        return result;
    }
    catch (error) {
        throw new errorHandler_1.AppError(`Failed to upload file: ${error.message}`, 500);
    }
};
exports.uploadToCloudinary = uploadToCloudinary;
// Delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary_1.default.v2.uploader.destroy(publicId);
    }
    catch (error) {
        throw new errorHandler_1.AppError(`Failed to delete file: ${error.message}`, 500);
    }
};
exports.deleteFromCloudinary = deleteFromCloudinary;
