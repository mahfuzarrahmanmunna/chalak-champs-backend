"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.R2Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const r2_1 = require("../config/r2");
class R2Service {
    static async uploadImage(fileBuffer, mimeType, folder) {
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
    static async deleteImage(key) {
        if (!key) {
            return;
        }
        await r2_1.r2Client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: r2_1.r2BucketName,
            Key: key,
        }));
    }
    static generateUniqueKey(folder, extension) {
        const safeFolder = folder.replace(/^\/+|\/+$/g, "");
        return `${safeFolder}/${(0, crypto_1.randomUUID)()}.${extension}`;
    }
    static getExtensionFromMimeType(mimeType) {
        switch (mimeType) {
            case "image/jpeg":
                return "jpg";
            case "image/png":
                return "png";
            case "image/webp":
                return "webp";
            case "image/gif":
                return "gif";
            default:
                throw new Error("Unsupported image type");
        }
    }
    static buildPublicUrl(key) {
        const baseUrl = r2_1.r2PublicUrl.replace(/\/$/, "");
        return `${baseUrl}/${key}`;
    }
}
exports.R2Service = R2Service;
