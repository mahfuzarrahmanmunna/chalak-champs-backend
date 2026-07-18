"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.R2Service = void 0;
// src/services/r2.service.ts
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const r2_1 = require("../config/r2");
class R2Service {
    static async uploadFile(fileBuffer, mimeType, folder) {
        if (!fileBuffer?.length) {
            throw new Error("No file buffer provided");
        }
        const extension = this.getExtensionFromMimeType(mimeType);
        const key = this.generateUniqueKey(folder, extension);
        await r2_1.r2Client.send(new client_s3_1.PutObjectCommand({
            Bucket: r2_1.r2BucketName,
            Key: key,
            Body: fileBuffer,
            ContentType: mimeType,
            ACL: "public-read",
        }));
        const url = this.buildPublicUrl(key);
        return { url, key };
    }
    // Keep old name as alias for backwards compatibility
    static async uploadImage(fileBuffer, mimeType, folder) {
        return this.uploadFile(fileBuffer, mimeType, folder);
    }
    static async deleteFile(key) {
        if (!key) {
            return;
        }
        await r2_1.r2Client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: r2_1.r2BucketName,
            Key: key,
        }));
    }
    // Keep old name as alias
    static async deleteImage(key) {
        return this.deleteFile(key);
    }
    static generateUniqueKey(folder, extension) {
        const safeFolder = folder.replace(/^\/+|\/+$/g, "");
        return `${safeFolder}/${(0, crypto_1.randomUUID)()}.${extension}`;
    }
    static getExtensionFromMimeType(mimeType) {
        switch (mimeType) {
            // Images
            case "image/jpeg":
                return "jpg";
            case "image/png":
                return "png";
            case "image/webp":
                return "webp";
            case "image/gif":
                return "gif";
            // Videos
            case "video/mp4":
                return "mp4";
            case "video/webm":
                return "webm";
            case "video/quicktime":
                return "mov";
            default:
                // Fallback: extract from mimetype
                const ext = mimeType.split("/")[1]?.split(";")[0];
                return ext || "bin";
        }
    }
    static buildPublicUrl(key) {
        const baseUrl = r2_1.r2PublicUrl.replace(/\/$/, "");
        return `${baseUrl}/${key}`;
    }
    static extractKeyFromUrl(url) {
        if (!url)
            return "";
        try {
            const baseUrl = r2_1.r2PublicUrl.replace(/\/$/, "");
            if (url.startsWith(baseUrl)) {
                return url.slice(baseUrl.length + 1); // +1 for the slash
            }
            // Try parsing as full URL
            const urlObj = new URL(url);
            return urlObj.pathname.slice(1); // Remove leading slash
        }
        catch {
            // Fallback: just return the URL as-is
            return url;
        }
    }
}
exports.R2Service = R2Service;
