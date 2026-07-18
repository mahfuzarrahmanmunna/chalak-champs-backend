// backend/src/controllers/featureCoursesBannerControllers.ts

import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import FeatureCoursesBannerModel, {
  IFeatureCoursesBanner,
} from "../models/FeatureCoursesBanner";
import { R2Service } from "../services/r2.service";

// ---------- Helpers ----------

function normalizeParamId(
  param: string | string[] | undefined,
): string | undefined {
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

// ---------- Types ----------

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  message: string;
  error?: string;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

function ok<T>(res: Response, data: T, status = 200): void {
  const body: ApiSuccess<T> = { success: true, data };
  res.status(status).json(body);
}

function fail(
  res: Response,
  message: string,
  error?: string,
  status = 400,
): void {
  const body: ApiError = { success: false, message };
  if (error) body.error = error;
  res.status(status).json(body);
}

/**
 * Safely attempts to delete an image from R2.
 * Logs errors instead of throwing to prevent DB operations from failing
 * if R2 is temporarily down.
 */
async function safeDeleteR2Image(key: string | undefined): Promise<void> {
  if (!key) return;
  try {
    await R2Service.deleteImage(key);
  } catch (err) {
    console.error(
      "[FeatureCoursesBanner] Failed to delete R2 image:",
      err instanceof Error ? err.message : err,
    );
  }
}

// ---------- PUBLIC: Get active banner by language ----------

export const getActiveBanner = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // FIX: Explicitly cast to "en" | "bn" to satisfy Mongoose strict types
    const lang = ((req.query.lang as string) || "en") as "en" | "bn";

    if (!["en", "bn"].includes(lang)) {
      fail(res, "Invalid language. Use 'en' or 'bn'.", undefined, 400);
      return;
    }

    const banner: IFeatureCoursesBanner | null =
      await FeatureCoursesBannerModel.findOne({
        lang,
        active: true,
      }).lean();

    if (!banner) {
      ok<null>(res, null, 200);
      return;
    }

    ok(res, banner);
  } catch (err) {
    next(err);
  }
};

// ---------- ADMIN: List all banners ----------

export const listBanners = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const banners: IFeatureCoursesBanner[] =
      await FeatureCoursesBannerModel.find().sort({ createdAt: -1 }).lean();

    ok(res, banners);
  } catch (err) {
    next(err);
  }
};

// ---------- ADMIN: Get single banner by ID ----------

export const getBannerById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = normalizeParamId(req.params.id);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      fail(res, "Invalid banner ID.", undefined, 400);
      return;
    }

    const banner: IFeatureCoursesBanner | null =
      await FeatureCoursesBannerModel.findById(id).lean();

    if (!banner) {
      fail(res, "Banner not found.", undefined, 404);
      return;
    }

    ok(res, banner);
  } catch (err) {
    next(err);
  }
};

// ---------- ADMIN: Create banner (Expects multipart/form-data via middleware) ----------

export const createBanner = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // `req.imageUrl` and `req.imageKey` are attached by the `uploadToR2` middleware
    const image = (req as any).imageUrl as string | undefined;
    const key = (req as any).imageKey as string | undefined;

    // Fallback check: if middleware didn't run or failed, image won't exist
    if (!image || !key) {
      fail(res, "Image upload is required.");
      return;
    }

    // FIX: Explicitly cast to "en" | "bn"
    const lang = req.body.lang as "en" | "bn";
    const link = req.body.link as string;
    const altText = req.body.altText as string | undefined;
    const active = req.body.active as string | undefined;

    // --- Validation ---
    if (!lang || !["en", "bn"].includes(lang)) {
      // Cleanup uploaded R2 image since validation failed
      await safeDeleteR2Image(key);
      fail(res, "Language must be 'en' or 'bn'.");
      return;
    }

    if (!link || typeof link !== "string" || link.trim().length === 0) {
      await safeDeleteR2Image(key);
      fail(res, "Link is required.");
      return;
    }

    // --- Optional: Deactivate other banners of the same language ---
    if (active !== "false") {
      await FeatureCoursesBannerModel.updateMany(
        { lang, active: true },
        { active: false },
      );
    }

    // --- Create ---
    const banner = await FeatureCoursesBannerModel.create({
      lang: lang as "en" | "bn",
      image,
      key,
      link: link.trim(),
      altText: altText?.trim() || "Featured courses banner",
      active: active !== "false",
    });

    const created: IFeatureCoursesBanner | null =
      await FeatureCoursesBannerModel.findById(banner._id).lean();

    ok(res, created, 201);
  } catch (err) {
    // If DB creation fails, attempt to clean up the R2 image
    const uploadedKey = (req as any).imageKey as string | undefined;
    await safeDeleteR2Image(uploadedKey);
    next(err);
  }
};

// ---------- ADMIN: Update banner (Expects multipart/form-data via middleware) ----------

export const updateBanner = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = normalizeParamId(req.params.id);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      fail(res, "Invalid banner ID.", undefined, 400);
      return;
    }

    const existing = await FeatureCoursesBannerModel.findById(id);
    if (!existing) {
      fail(res, "Banner not found.", undefined, 404);
      return;
    }

    // Values attached by R2 middleware (if a new file was selected)
    const newImageUrl = (req as any).imageUrl as string | undefined;
    const newImageKey = (req as any).imageKey as string | undefined;

    // Build update object
    const update: Partial<IFeatureCoursesBanner> = {};

    if (req.body.lang !== undefined) {
      if (!["en", "bn"].includes(req.body.lang)) {
        fail(res, "Language must be 'en' or 'bn'.");
        return;
      }
      // FIX: Explicitly cast to "en" | "bn"
      update.lang = req.body.lang as "en" | "bn";
    }

    // Handle Image Replacement
    if (newImageUrl && newImageKey) {
      // Delete old image from R2
      await safeDeleteR2Image(existing.key);

      update.image = newImageUrl;
      update.key = newImageKey;
    }

    if (req.body.link !== undefined) {
      const link = req.body.link as string;
      if (typeof link !== "string" || link.trim().length === 0) {
        fail(res, "Link cannot be empty.");
        return;
      }
      update.link = link.trim();
    }

    if (req.body.altText !== undefined) {
      update.altText = (req.body.altText as string).trim();
    }

    if (req.body.active !== undefined) {
      update.active = req.body.active === "true" || req.body.active === true;
    }

    // If activating, deactivate others of the same language
    if (update.active === true) {
      // FIX: Ensure targetLang is typed as "en" | "bn"
      const targetLang = (update.lang || existing.lang) as "en" | "bn";
      await FeatureCoursesBannerModel.updateMany(
        { lang: targetLang, active: true, _id: { $ne: id } },
        { active: false },
      );
    }

    const updated: IFeatureCoursesBanner | null =
      await FeatureCoursesBannerModel.findByIdAndUpdate(id, update, {
        new: true,
      }).lean();

    ok(res, updated);
  } catch (err) {
    next(err);
  }
};

// ---------- ADMIN: Delete banner ----------

export const deleteBanner = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = normalizeParamId(req.params.id);

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      fail(res, "Invalid banner ID.", undefined, 400);
      return;
    }

    const deleted =
      await FeatureCoursesBannerModel.findByIdAndDelete(id).lean();

    if (!deleted) {
      fail(res, "Banner not found.", undefined, 404);
      return;
    }

    // Delete image from R2 after successful DB deletion
    await safeDeleteR2Image(deleted.key);

    ok(res, deleted);
  } catch (err) {
    next(err);
  }
};