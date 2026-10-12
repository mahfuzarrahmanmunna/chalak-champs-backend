"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertHero = exports.getHero = void 0;
const Hero_1 = __importDefault(require("../models/Hero"));
const multer_1 = __importDefault(require("multer"));
// Setup Multer for memory storage
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
const getHero = async (req, res) => {
    try {
        const { lang } = req.params;
        const hero = await Hero_1.default.findOne({ lang });
        if (!hero)
            return res.status(200).json({ success: true, data: null });
        res.status(200).json({ success: true, data: hero });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
exports.getHero = getHero;
const upsertHero = (req, res, next) => {
    upload.single("kingImage")(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ success: false, message: "File upload error or invalid file type." });
        }
        try {
            // Destructure all fields, including new ones
            const { lang, title, subtitle, ctaButton, secondaryLink, cta2, cta2Btn, kingImageClass, videoId, } = req.body;
            if (!lang || !title || !subtitle) {
                return res.status(400).json({ success: false, message: "Language, Title, and Subtitle are required" });
            }
            let kingImage = req.body.kingImage; // Fallback to existing URL/base64 string
            if (req.file) {
                kingImage = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
            }
            const updatedHero = await Hero_1.default.findOneAndUpdate({ lang }, { title, subtitle, ctaButton, secondaryLink, cta2, cta2Btn, kingImage, kingImageClass, videoId }, { new: true, upsert: true, runValidators: true });
            res.status(200).json({ success: true, data: updatedHero });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message || "Server Error" });
        }
    });
};
exports.upsertHero = upsertHero;
