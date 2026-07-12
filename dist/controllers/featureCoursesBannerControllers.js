"use strict";
// backend/src/controllers/featureCoursesBannerControllers.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteBanner = exports.updateBanner = exports.createBanner = exports.getBannerById = exports.listBanners = exports.getActiveBanner = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const FeatureCoursesBanner_1 = __importDefault(require("../models/FeatureCoursesBanner"));
const r2_service_1 = require("../services/r2.service");
// ---------- Helpers ----------
function normalizeParamId(param) {
    if (!param)
        return undefined;
    return Array.isArray(param) ? param[0] : param;
}
function ok(res, data, status = 200) {
    const body = { success: true, data };
    res.status(status).json(body);
}
function fail(res, message, error, status = 400) {
    const body = { success: false, message };
    if (error)
        body.error = error;
    res.status(status).json(body);
}
/**
 * Safely attempts to delete an image from R2.
 * Logs errors instead of throwing to prevent DB operations from failing
 * if R2 is temporarily down.
 */
async function safeDeleteR2Image(key) {
    if (!key)
        return;
    try {
        await r2_service_1.R2Service.deleteImage(key);
    }
    catch (err) {
        console.error("[FeatureCoursesBanner] Failed to delete R2 image:", err instanceof Error ? err.message : err);
    }
}
// ---------- PUBLIC: Get active banner by language ----------
const getActiveBanner = async (req, res, next) => {
    try {
        const lang = req.query.lang || "en";
        if (!["en", "bn"].includes(lang)) {
            fail(res, "Invalid language. Use 'en' or 'bn'.", undefined, 400);
            return;
        }
        const banner = await FeatureCoursesBanner_1.default.findOne({
            lang,
            active: true,
        }).lean();
        if (!banner) {
            ok(res, null, 200);
            return;
        }
        ok(res, banner);
    }
    catch (err) {
        next(err);
    }
};
exports.getActiveBanner = getActiveBanner;
// ---------- ADMIN: List all banners ----------
const listBanners = async (req, res, next) => {
    try {
        const banners = await FeatureCoursesBanner_1.default.find().sort({ createdAt: -1 }).lean();
        ok(res, banners);
    }
    catch (err) {
        next(err);
    }
};
exports.listBanners = listBanners;
// ---------- ADMIN: Get single banner by ID ----------
const getBannerById = async (req, res, next) => {
    try {
        const id = normalizeParamId(req.params.id);
        if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            fail(res, "Invalid banner ID.", undefined, 400);
            return;
        }
        const banner = await FeatureCoursesBanner_1.default.findById(id).lean();
        if (!banner) {
            fail(res, "Banner not found.", undefined, 404);
            return;
        }
        ok(res, banner);
    }
    catch (err) {
        next(err);
    }
};
exports.getBannerById = getBannerById;
// ---------- ADMIN: Create banner (Expects multipart/form-data via middleware) ----------
const createBanner = async (req, res, next) => {
    try {
        // `req.imageUrl` and `req.imageKey` are attached by the `uploadToR2` middleware
        const image = req.imageUrl;
        const key = req.imageKey;
        // Fallback check: if middleware didn't run or failed, image won't exist
        if (!image || !key) {
            fail(res, "Image upload is required.");
            return;
        }
        const lang = req.body.lang;
        const link = req.body.link;
        const altText = req.body.altText;
        const active = req.body.active;
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
            await FeatureCoursesBanner_1.default.updateMany({ lang, active: true }, { active: false });
        }
        // --- Create ---
        const banner = await FeatureCoursesBanner_1.default.create({
            lang: lang,
            image,
            key,
            link: link.trim(),
            altText: altText?.trim() || "Featured courses banner",
            active: active !== "false",
        });
        const created = await FeatureCoursesBanner_1.default.findById(banner._id).lean();
        ok(res, created, 201);
    }
    catch (err) {
        // If DB creation fails, attempt to clean up the R2 image
        const uploadedKey = req.imageKey;
        await safeDeleteR2Image(uploadedKey);
        next(err);
    }
};
exports.createBanner = createBanner;
// ---------- ADMIN: Update banner (Expects multipart/form-data via middleware) ----------
const updateBanner = async (req, res, next) => {
    try {
        const id = normalizeParamId(req.params.id);
        if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            fail(res, "Invalid banner ID.", undefined, 400);
            return;
        }
        const existing = await FeatureCoursesBanner_1.default.findById(id);
        if (!existing) {
            fail(res, "Banner not found.", undefined, 404);
            return;
        }
        // Values attached by R2 middleware (if a new file was selected)
        const newImageUrl = req.imageUrl;
        const newImageKey = req.imageKey;
        // Build update object
        const update = {};
        if (req.body.lang !== undefined) {
            if (!["en", "bn"].includes(req.body.lang)) {
                fail(res, "Language must be 'en' or 'bn'.");
                return;
            }
            update.lang = req.body.lang;
        }
        // Handle Image Replacement
        if (newImageUrl && newImageKey) {
            // Delete old image from R2
            await safeDeleteR2Image(existing.key);
            update.image = newImageUrl;
            update.key = newImageKey;
        }
        if (req.body.link !== undefined) {
            const link = req.body.link;
            if (typeof link !== "string" || link.trim().length === 0) {
                fail(res, "Link cannot be empty.");
                return;
            }
            update.link = link.trim();
        }
        if (req.body.altText !== undefined) {
            update.altText = req.body.altText.trim();
        }
        if (req.body.active !== undefined) {
            update.active = req.body.active === "true" || req.body.active === true;
        }
        // If activating, deactivate others of the same language
        if (update.active === true) {
            const targetLang = update.lang || existing.lang;
            await FeatureCoursesBanner_1.default.updateMany({ lang: targetLang, active: true, _id: { $ne: id } }, { active: false });
        }
        const updated = await FeatureCoursesBanner_1.default.findByIdAndUpdate(id, update, {
            new: true,
        }).lean();
        ok(res, updated);
    }
    catch (err) {
        next(err);
    }
};
exports.updateBanner = updateBanner;
// ---------- ADMIN: Delete banner ----------
const deleteBanner = async (req, res, next) => {
    try {
        const id = normalizeParamId(req.params.id);
        if (!id || !mongoose_1.default.Types.ObjectId.isValid(id)) {
            fail(res, "Invalid banner ID.", undefined, 400);
            return;
        }
        const deleted = await FeatureCoursesBanner_1.default.findByIdAndDelete(id).lean();
        if (!deleted) {
            fail(res, "Banner not found.", undefined, 404);
            return;
        }
        // Delete image from R2 after successful DB deletion
        await safeDeleteR2Image(deleted.key);
        ok(res, deleted);
    }
    catch (err) {
        next(err);
    }
};
exports.deleteBanner = deleteBanner;
