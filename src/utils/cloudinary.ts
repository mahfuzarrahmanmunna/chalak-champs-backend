// src/utils/cloudinary.ts
import cloudinary from "cloudinary";
import { AppError } from "../middleware/errorHandler";

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload file to Cloudinary
export const uploadToCloudinary = async (
  filePath: string,
  folder: string,
): Promise<cloudinary.UploadApiResponse> => {
  try {
    const result = await cloudinary.v2.uploader.upload(filePath, {
      folder,
      resource_type: "auto", // Automatically detect resource type
    });

    return result;
  } catch (error: any) {
    throw new AppError(`Failed to upload file: ${error.message}`, 500);
  }
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.v2.uploader.destroy(publicId);
  } catch (error: any) {
    throw new AppError(`Failed to delete file: ${error.message}`, 500);
  }
};
