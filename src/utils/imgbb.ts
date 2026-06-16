import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const IMGBB_API_KEY = "aafb3b7e39b68db2804792cda8f69cae";

interface ImgBBResponse {
  data: {
    url: string;
    delete_url: string;
  };
  success: boolean;
  status: number;
}

export const uploadToImgBB = async (
  fileOrBuffer: string | Buffer,
): Promise<{ url: string; deleteUrl: string }> => {
  try {
    // Accept either a file path or a Buffer
    let base64Image: string;
    if (Buffer.isBuffer(fileOrBuffer)) {
      base64Image = fileOrBuffer.toString("base64");
    } else {
      base64Image = fs.readFileSync(fileOrBuffer, { encoding: "base64" });
    }

    // Prepare form data
    const form = new FormData();
    form.append("image", base64Image);

    const response = await axios.post<ImgBBResponse>(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
      },
    );

    if (response.data.success && response.data.data) {
      return {
        url: response.data.data.url,
        deleteUrl: response.data.data.delete_url,
      };
    } else {
      throw new Error("Failed to upload to ImgBB");
    }
  } catch (error: any) {
    console.error("ImgBB Upload Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || "Upload failed");
  }
};

export const deleteFromImgBB = async (deleteUrl: string) => {
  if (!deleteUrl) return;
  try {
    // ImgBB provides a direct delete_url. We just need to visit it (GET).
    await axios.get(deleteUrl);
    console.log("File deleted from ImgBB");
  } catch (error) {
    console.error("Failed to delete from ImgBB:", error);
  }
};

export const deleteLocalFile = (localFilePath: string) => {
  try {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  } catch (error) {
    console.error("Error deleting local file:", error);
  }
};
