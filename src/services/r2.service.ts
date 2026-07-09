import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { r2BucketName, r2Client, r2PublicUrl } from "../config/r2";

export interface UploadImageResult {
  url: string;
  key: string;
}

export class R2Service {
  static async uploadImage(
    fileBuffer: Buffer,
    mimeType: string,
    folder: string,
  ): Promise<UploadImageResult> {
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

  static async deleteImage(key: string): Promise<void> {
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

  static generateUniqueKey(folder: string, extension: string): string {
    const safeFolder = folder.replace(/^\/+|\/+$/g, "");
    return `${safeFolder}/${randomUUID()}.${extension}`;
  }

  private static getExtensionFromMimeType(mimeType: string): string {
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

  private static buildPublicUrl(key: string): string {
    const baseUrl = r2PublicUrl.replace(/\/$/, "");
    return `${baseUrl}/${key}`;
  }
}
