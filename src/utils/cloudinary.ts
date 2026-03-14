import cloudinary from "cloudinary";
import fs from "fs";

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Generic Upload Function
export const uploadToCloudinary = async (
  filePath: string,
  folder: string,
  resourceType: "image" | "video" | "auto",
): Promise<string> => {
  try {
    const result = await cloudinary.v2.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      chunk_size: 6000000, // Useful for large videos
    });

    return result.secure_url;
  } catch (error: any) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error(`Failed to upload ${resourceType} to Cloudinary`);
  }
};

// Delete local file helper
export const deleteLocalFile = (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error("Error deleting local file:", err);
  }
};
