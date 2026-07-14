// src/services/r2.service.ts
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { r2BucketName, r2Client, r2PublicUrl } from "../config/r2";

export interface UploadResult {
  url: string;
  key: string;
}

export class R2Service {
  static async uploadFile(
    fileBuffer: Buffer,
    mimeType: string,
    folder: string,
  ): Promise<UploadResult> {
    if (!fileBuffer?.length) {
      throw new Error("No file buffer provided");
    }

    const extension = this.getExtensionFromMimeType(mimeType);
    const key = this.generateUniqueKey(folder, extension);

    await r2Client.send(
      new PutObjectCommand({
        Bucket: r2BucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: "public-read",
      }),
    );

    const url = this.buildPublicUrl(key);

    return { url, key };
  }

  // Keep old name as alias for backwards compatibility
  static async uploadImage(
    fileBuffer: Buffer,
    mimeType: string,
    folder: string,
  ): Promise<UploadResult> {
    return this.uploadFile(fileBuffer, mimeType, folder);
  }

  static async deleteFile(key: string): Promise<void> {
    if (!key) {
      return;
    }

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: r2BucketName,
        Key: key,
      }),
    );
  }

  // Keep old name as alias
  static async deleteImage(key: string): Promise<void> {
    return this.deleteFile(key);
  }

  static generateUniqueKey(folder: string, extension: string): string {
    const safeFolder = folder.replace(/^\/+|\/+$/g, "");
    return `${safeFolder}/${randomUUID()}.${extension}`;
  }

  static getExtensionFromMimeType(mimeType: string): string {
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

  static buildPublicUrl(key: string): string {
    const baseUrl = r2PublicUrl.replace(/\/$/, "");
    return `${baseUrl}/${key}`;
  }

  static extractKeyFromUrl(url: string): string {
    if (!url) return "";
    try {
      const baseUrl = r2PublicUrl.replace(/\/$/, "");
      if (url.startsWith(baseUrl)) {
        return url.slice(baseUrl.length + 1); // +1 for the slash
      }
      // Try parsing as full URL
      const urlObj = new URL(url);
      return urlObj.pathname.slice(1); // Remove leading slash
    } catch {
      // Fallback: just return the URL as-is
      return url;
    }
  }
}