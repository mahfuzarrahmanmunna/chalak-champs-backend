import type { Response } from "express";
import User from "../models/User";

export const uploadProfileImage = async (
  req: any,
  res: Response,
): Promise<void> => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!req.imageUrl) {
      res.status(400).json({ success: false, message: "Image upload failed" });
      return;
    }

    const user = await User.findOne({ uid });

    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    user.profileImageUrl = req.imageUrl;
    user.profileImageKey = req.imageKey || "";
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile image uploaded successfully",
      imageUrl: user.profileImageUrl,
      imageKey: user.profileImageKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save profile image";
    res.status(500).json({ success: false, message });
  }
};
