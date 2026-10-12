import { Request, Response, RequestHandler } from "express";
import multer from "multer";
import Gallery from "../models/Gallery";
import { R2Service } from "../services/r2.service";

const upload = multer({ storage: multer.memoryStorage() });

// GET gallery data
export const getGallery = async (req: Request, res: Response) => {
  try {
    let gallery = await Gallery.findOne();
    if (!gallery) {
      gallery = new Gallery({ rowOneImages: [], rowTwoImages: [] });
      await gallery.save();
    }
    res.status(200).json({ success: true, data: gallery });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// UPSERT gallery data (Upload files & Save URLs)
export const upsertGallery: RequestHandler = (req, res, next) => {
  upload.fields([
    { name: "rowOneImages", maxCount: 20 },
    { name: "rowTwoImages", maxCount: 20 },
  ])(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      // Parse existing kept URLs from form data
      const existingRowOne = req.body.existingRowOne ? JSON.parse(req.body.existingRowOne) : [];
      const existingRowTwo = req.body.existingRowTwo ? JSON.parse(req.body.existingRowTwo) : [];

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      const newRowOneImages = [];
      if (files.rowOneImages) {
        for (const file of files.rowOneImages) {
          const result = await R2Service.uploadImage(file.buffer, file.mimetype, "gallery");
          newRowOneImages.push({ url: result.url, alt: "Gallery Image" });
        }
      }

      const newRowTwoImages = [];
      if (files.rowTwoImages) {
        for (const file of files.rowTwoImages) {
          const result = await R2Service.uploadImage(file.buffer, file.mimetype, "gallery");
          newRowTwoImages.push({ url: result.url, alt: "Gallery Image" });
        }
      }

      const finalRowOne = [...existingRowOne, ...newRowOneImages];
      const finalRowTwo = [...existingRowTwo, ...newRowTwoImages];

      const updatedGallery = await Gallery.findOneAndUpdate(
        {},
        { rowOneImages: finalRowOne, rowTwoImages: finalRowTwo },
        { new: true, upsert: true }
      );

      res.status(200).json({ success: true, data: updatedGallery });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
  });
};