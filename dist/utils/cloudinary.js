"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLocalFile = exports.uploadToCloudinary = void 0;
const cloudinary_1 = __importDefault(require("cloudinary"));
const fs_1 = __importDefault(require("fs"));
// Configure Cloudinary
cloudinary_1.default.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Generic Upload Function
const uploadToCloudinary = async (filePath, folder, resourceType) => {
    try {
        const result = await cloudinary_1.default.v2.uploader.upload(filePath, {
            folder,
            resource_type: resourceType,
            chunk_size: 6000000, // Useful for large videos
        });
        return result.secure_url;
    }
    catch (error) {
        console.error("Cloudinary Upload Error:", error);
        throw new Error(`Failed to upload ${resourceType} to Cloudinary`);
    }
};
exports.uploadToCloudinary = uploadToCloudinary;
// Delete local file helper
const deleteLocalFile = (filePath) => {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    catch (err) {
        console.error("Error deleting local file:", err);
    }
};
exports.deleteLocalFile = deleteLocalFile;
