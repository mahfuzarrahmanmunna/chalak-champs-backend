"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLocalFile = exports.deleteFromImgBB = exports.uploadToImgBB = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
const IMGBB_API_KEY = "aafb3b7e39b68db2804792cda8f69cae";
const uploadToImgBB = async (fileOrBuffer) => {
    try {
        // Accept either a file path or a Buffer
        let base64Image;
        if (Buffer.isBuffer(fileOrBuffer)) {
            base64Image = fileOrBuffer.toString("base64");
        }
        else {
            base64Image = fs_1.default.readFileSync(fileOrBuffer, { encoding: "base64" });
        }
        // Prepare form data
        const form = new form_data_1.default();
        form.append("image", base64Image);
        const response = await axios_1.default.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, form, {
            headers: {
                ...form.getHeaders(),
            },
        });
        if (response.data.success && response.data.data) {
            return {
                url: response.data.data.url,
                deleteUrl: response.data.data.delete_url,
            };
        }
        else {
            throw new Error("Failed to upload to ImgBB");
        }
    }
    catch (error) {
        console.error("ImgBB Upload Error:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error?.message || "Upload failed");
    }
};
exports.uploadToImgBB = uploadToImgBB;
const deleteFromImgBB = async (deleteUrl) => {
    if (!deleteUrl)
        return;
    try {
        // ImgBB provides a direct delete_url. We just need to visit it (GET).
        await axios_1.default.get(deleteUrl);
        console.log("File deleted from ImgBB");
    }
    catch (error) {
        console.error("Failed to delete from ImgBB:", error);
    }
};
exports.deleteFromImgBB = deleteFromImgBB;
const deleteLocalFile = (localFilePath) => {
    try {
        if (fs_1.default.existsSync(localFilePath)) {
            fs_1.default.unlinkSync(localFilePath);
        }
    }
    catch (error) {
        console.error("Error deleting local file:", error);
    }
};
exports.deleteLocalFile = deleteLocalFile;
