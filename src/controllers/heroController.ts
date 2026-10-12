import { Request, Response, NextFunction, RequestHandler } from "express";
import Hero from "../models/Hero";
import multer from "multer";

// Setup Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

export const getHero = async (req: Request, res: Response) => {
  try {
    const { lang } = req.params;
    const hero = await Hero.findOne({ lang });
    if (!hero) return res.status(200).json({ success: true, data: null });
    res.status(200).json({ success: true, data: hero });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const upsertHero: RequestHandler = (req, res, next) => {
  upload.single("kingImage")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: "File upload error or invalid file type." });
    }

    try {
      // Destructure all fields, including new ones
      const {
        lang,
        title,
        subtitle,
        ctaButton,
        secondaryLink,
        cta2,
        cta2Btn,
        kingImageClass,
        videoId,
      } = req.body;

      if (!lang || !title || !subtitle) {
        return res.status(400).json({ success: false, message: "Language, Title, and Subtitle are required" });
      }

      let kingImage = req.body.kingImage; // Fallback to existing URL/base64 string

      if (req.file) {
        kingImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      }

      const updatedHero = await Hero.findOneAndUpdate(
        { lang },
        { title, subtitle, ctaButton, secondaryLink, cta2, cta2Btn, kingImage, kingImageClass, videoId },
        { new: true, upsert: true, runValidators: true }
      );

      res.status(200).json({ success: true, data: updatedHero });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
  });
};