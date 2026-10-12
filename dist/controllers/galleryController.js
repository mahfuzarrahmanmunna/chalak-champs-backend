"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertGallery = exports.getGallery = void 0;
const multer_1 = __importDefault(require("multer"));
const Gallery_1 = __importDefault(require("../models/Gallery"));
const r2_service_1 = require("../services/r2.service");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// GET gallery data
const getGallery = async (req, res) => {
    try {
        let gallery = await Gallery_1.default.findOne();
        if (!gallery) {
            gallery = new Gallery_1.default({ rowOneImages: [], rowTwoImages: [] });
            await gallery.save();
        }
        res.status(200).json({ success: true, data: gallery });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
exports.getGallery = getGallery;
// UPSERT gallery data (Upload files & Save URLs)
const upsertGallery = (req, res, next) => {
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
            const files = req.files;
            const newRowOneImages = [];
            if (files.rowOneImages) {
                for (const file of files.rowOneImages) {
                    const result = await r2_service_1.R2Service.uploadImage(file.buffer, file.mimetype, "gallery");
                    newRowOneImages.push({ url: result.url, alt: "Gallery Image" });
                }
            }
            const newRowTwoImages = [];
            if (files.rowTwoImages) {
                for (const file of files.rowTwoImages) {
                    const result = await r2_service_1.R2Service.uploadImage(file.buffer, file.mimetype, "gallery");
                    newRowTwoImages.push({ url: result.url, alt: "Gallery Image" });
                }
            }
            const finalRowOne = [...existingRowOne, ...newRowOneImages];
            const finalRowTwo = [...existingRowTwo, ...newRowTwoImages];
            const updatedGallery = await Gallery_1.default.findOneAndUpdate({}, { rowOneImages: finalRowOne, rowTwoImages: finalRowTwo }, { new: true, upsert: true });
            res.status(200).json({ success: true, data: updatedGallery });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || "Server Error" });
        }
    });
};
exports.upsertGallery = upsertGallery;
