"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePromo = void 0;
// Simple in-memory promo codes — replace with DB model if needed
const PROMO_CODES = {
    DEMO200: { discount: 200, maxUses: 100, used: 0 },
    WELCOME100: { discount: 100, maxUses: 50, used: 0 },
};
const validatePromo = async (req, res) => {
    try {
        const { code, courseId } = req.body;
        if (!code) {
            res.status(400).json({ success: false, message: "Promo code required" });
            return;
        }
        const promo = PROMO_CODES[code.toUpperCase()];
        if (!promo) {
            res.status(404).json({ success: false, message: "Invalid promo code" });
            return;
        }
        // Course-specific check
        if (promo.courseId && promo.courseId !== courseId) {
            res
                .status(400)
                .json({ success: false, message: "Promo not valid for this course" });
            return;
        }
        // Usage limit check
        if (promo.maxUses && promo.used >= promo.maxUses) {
            res
                .status(400)
                .json({ success: false, message: "Promo code usage limit reached" });
            return;
        }
        // Increment usage
        promo.used++;
        res.status(200).json({
            success: true,
            discount: promo.discount,
            message: `৳${promo.discount} discount applied!`,
        });
    }
    catch (error) {
        console.error("Promo Error:", error);
        res
            .status(500)
            .json({ success: false, message: "Failed to validate promo" });
    }
};
exports.validatePromo = validatePromo;
