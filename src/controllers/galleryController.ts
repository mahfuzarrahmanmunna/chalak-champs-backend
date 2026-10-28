import { Request, Response, RequestHandler } from "express";
import multer from "multer";
import Gallery from "../models/Gallery";
import { R2Service } from "../services/r2.service";

// ─────────────────────────────────────────────────────────────
//  Multer config — accepts all common image types
// ─────────────────────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB per file
    fieldSize: 25 * 1024 * 1024, // 25 MB for text fields (JSON arrays)
    files: 50,
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/svg+xml",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`) as any, false);
    }
  },
});

// ─────────────────────────────────────────────────────────────
//  URL match helper — handles normalized vs raw URLs
//  e.g. "/images/x.jpg" vs "https://cdn.example.com/images/x.jpg"
// ─────────────────────────────────────────────────────────────
function urlMatches(storedUrl: string, inputUrl: string): boolean {
  if (!storedUrl || !inputUrl) return false;
  if (storedUrl === inputUrl) return true;
  // Normalize trailing slashes for comparison
  const s = storedUrl.replace(/\/+$/, "");
  const i = inputUrl.replace(/\/+$/, "");
  if (s === i) return true;
  // One may be a suffix of the other (after CDN prefix normalization)
  return i.endsWith(s) || s.endsWith(i);
}

// ═════════════════════════════════════════════════════════════
//  GET /api/gallery  —  fetch gallery
// ═════════════════════════════════════════════════════════════
export const getGallery = async (req: Request, res: Response) => {
  try {
    let gallery = await Gallery.findOne();
    if (!gallery) {
      gallery = new Gallery({ rowOneImages: [], rowTwoImages: [] });
      await gallery.save();
    }
    res.status(200).json({ success: true, data: gallery });
  } catch (error) {
    console.error("getGallery error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ═════════════════════════════════════════════════════════════
//  DELETE /api/gallery/image  —  delete a single image immediately
//  Body: { url: string, row: 1 | 2 }
// ═════════════════════════════════════════════════════════════
export const deleteGalleryImage: RequestHandler = async (req, res) => {
  try {
    const { url, row } = req.body ?? {};

    if (!url || !row) {
      return res
        .status(400)
        .json({ success: false, message: "`url` and `row` are required" });
    }

    const gallery = await Gallery.findOne();
    if (!gallery) {
      return res
        .status(404)
        .json({ success: false, message: "Gallery not found" });
    }

    const beforeRowOne = gallery.rowOneImages.length;
    const beforeRowTwo = gallery.rowTwoImages.length;

    if (row === 1) {
      gallery.rowOneImages = gallery.rowOneImages.filter(
        (img) => !urlMatches(img.url, url),
      );
      gallery.markModified("rowOneImages");
    } else if (row === 2) {
      gallery.rowTwoImages = gallery.rowTwoImages.filter(
        (img) => !urlMatches(img.url, url),
      );
      gallery.markModified("rowTwoImages");
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid `row` value (must be 1 or 2)" });
    }

    await gallery.save();

    console.log(
      `[deleteGalleryImage] row=${row} url=${url} | before=${row === 1 ? beforeRowOne : beforeRowTwo} after=${row === 1 ? gallery.rowOneImages.length : gallery.rowTwoImages.length}`,
    );

    res.status(200).json({ success: true, data: gallery });
  } catch (error: any) {
    console.error("deleteGalleryImage error:", error);
    res
      .status(500)
      .json({ success: false, message: error?.message || "Server Error" });
  }
};

// ═════════════════════════════════════════════════════════════
//  POST /api/gallery  —  upload new files + keep existing
//  Uses findOne + markModified + save() (reliable for array mutations)
// ═════════════════════════════════════════════════════════════
export const upsertGallery: RequestHandler = (req, res, next) => {
  upload.fields([
    { name: "rowOneImages", maxCount: 20 },
    { name: "rowTwoImages", maxCount: 20 },
  ])(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      // Parse existing kept URLs from form data
      let existingRowOne: { url: string; alt: string }[] = [];
      let existingRowTwo: { url: string; alt: string }[] = [];
      try {
        existingRowOne = req.body.existingRowOne
          ? JSON.parse(req.body.existingRowOne)
          : [];
        existingRowTwo = req.body.existingRowTwo
          ? JSON.parse(req.body.existingRowTwo)
          : [];
      } catch (parseErr) {
        console.error("JSON parse error for existing rows:", parseErr);
        return res
          .status(400)
          .json({ success: false, message: "Malformed existing image data." });
      }

      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      const newRowOneImages: { url: string; alt: string }[] = [];
      if (files?.rowOneImages) {
        for (const file of files.rowOneImages) {
          const result = await R2Service.uploadImage(
            file.buffer,
            file.mimetype,
            "gallery",
          );
          newRowOneImages.push({ url: result.url, alt: "Gallery Image" });
        }
      }

      const newRowTwoImages: { url: string; alt: string }[] = [];
      if (files?.rowTwoImages) {
        for (const file of files.rowTwoImages) {
          const result = await R2Service.uploadImage(
            file.buffer,
            file.mimetype,
            "gallery",
          );
          newRowTwoImages.push({ url: result.url, alt: "Gallery Image" });
        }
      }

      const finalRowOne = [...existingRowOne, ...newRowOneImages];
      const finalRowTwo = [...existingRowTwo, ...newRowTwoImages];

      // ── Reliable array mutation path ──
      let gallery = await Gallery.findOne();
      if (!gallery) {
        gallery = new Gallery({
          rowOneImages: finalRowOne,
          rowTwoImages: finalRowTwo,
        });
      } else {
        gallery.rowOneImages = finalRowOne;
        gallery.rowTwoImages = finalRowTwo;
        gallery.markModified("rowOneImages");
        gallery.markModified("rowTwoImages");
      }
      await gallery.save();

      console.log(
        `[upsertGallery] saved rowOne=${gallery.rowOneImages.length} rowTwo=${gallery.rowTwoImages.length}`,
      );

      res.status(200).json({ success: true, data: gallery });
    } catch (error: any) {
      console.error("upsertGallery error:", error);
      res
        .status(500)
        .json({ success: false, message: error?.message || "Server Error" });
    }
  });
};