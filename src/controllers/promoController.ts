// src/controllers/promoController.ts
import { Request, Response } from "express";

// Simple in-memory promo codes — replace with DB model if needed
const PROMO_CODES: Record<
  string,
  { discount: number; courseId?: string; maxUses?: number; used: number }
> = {
  DEMO200: { discount: 200, maxUses: 100, used: 0 },
  WELCOME100: { discount: 100, maxUses: 50, used: 0 },
};

export const validatePromo = async (
  req: Request,
  res: Response,
): Promise<void> => {
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
  } catch (error: any) {
    console.error("Promo Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to validate promo" });
  }
};
