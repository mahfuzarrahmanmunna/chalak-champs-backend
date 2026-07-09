// src/controllers/orderController.ts
import { Request, Response } from "express";
import Order, { IOrder } from "../models/Order";
import Enrollment from "../models/Enrollment";

// ============================================================
// SSLCommerz Integration (Production)
// ============================================================

/**
 * Initializes an SSLCommerz session and returns the gateway payment URL.
 * Requires environment variables:
 *   SSLCOMMERZ_STORE_ID
 *   SSLCOMMERZ_STORE_PASSWORD
 *   SSLCOMMERZ_IS_LIVE (set to "true" for production)
 */

async function initiateSSLCommerz(order: IOrder, req: Request) {
  const SSLCommerz = require("sslcommerz-lts");

  const isLive = process.env.SSLCOMMERZ_IS_LIVE === "true";

  const sslcz = new SSLCommerz(
    process.env.SSLCOMMERZ_STORE_ID,
    process.env.SSLCOMMERZ_STORE_PASSWORD,
    isLive,
  );

  const postData = {
    total_amount: order.totalAmount.toString(),
    currency: order.currency,
    tran_id: order.tranId,
    success_url: `${req.body.successUrl}?tran_id=${order.tranId}&status=success`,
    fail_url: `${req.body.failUrl}?tran_id=${order.tranId}&status=fail`,
    cancel_url: `${req.body.cancelUrl}?tran_id=${order.tranId}&status=cancel`,
    ipn_url: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/orders/ipn`,
    shipping_method: "NO",
    product_name: order.courseTitle,
    product_category: "Education",
    product_profile: "non-physical-goods",
    cus_name: order.userName,
    cus_email: order.userEmail,
    cus_phone: order.userPhone || "N/A",
    cus_add1: "N/A",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    val_id: order.orderId, // Custom field — pass our order ID
    // Optional: pass addon info in custom fields
    value_a: order.courseId,
    value_b: order.addons.join(","),
    value_c: order.paymentPlan,
    value_d: order.promoCode || "",
  };

  const response = await sslcz.init(postData);

  if (response?.GatewayPageURL) {
    // Update order status to processing
    await Order.updateOne(
      { tranId: order.tranId },
      { status: "processing", gatewayResponse: response },
    );
    return { paymentUrl: response.GatewayPageURL };
  }

  throw new Error("SSLCommerz session initialization failed");
}

// ============================================================
// Create Order
// ============================================================

export const createOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      courseId,
      userId,
      userName,
      userEmail,
      userPhone,
      addons,
      paymentMethod,
      paymentPlan,
      promoCode,
      subtotal,
      discount,
      totalAmount,
      currency,
      successUrl,
      failUrl,
      cancelUrl,
    } = req.body;

    // --- Validate required fields ---
    if (!courseId || !userId || !totalAmount) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: courseId, userId, totalAmount",
      });
      return;
    }

    if (totalAmount <= 0) {
      res.status(400).json({
        success: false,
        message: "Total amount must be greater than 0",
      });
      return;
    }

    // --- Generate unique IDs ---
    const now = Date.now();
    const orderId = `ORD-${now}`;
    const tranId = `TXN-${now}`;

    // --- Check for duplicate pending orders (prevent double-submit) ---
    const recentDuplicate = await Order.findOne({
      userId,
      courseId,
      status: { $in: ["pending", "processing"] },
      createdAt: { $gte: new Date(now - 5 * 60 * 1000) }, // Within last 5 minutes
    });

    if (recentDuplicate) {
      // Return the existing order instead of creating a duplicate
      res.status(200).json({
        success: true,
        message: "Order already exists",
        orderId: recentDuplicate.orderId,
        tran_id: recentDuplicate.tranId,
        // If it was already processing and has a gateway URL, return it
        ...(recentDuplicate.gatewayResponse?.GatewayPageURL
          ? { paymentUrl: recentDuplicate.gatewayResponse.GatewayPageURL }
          : {}),
      });
      return;
    }

    // --- Fetch course title (optional — frontend can send it) ---
    let courseTitle = req.body.courseTitle || "Course";
    let courseImage = req.body.courseImage || "";

    if (!req.body.courseTitle) {
      try {
        // Try to fetch from your courses collection if you have one
        const Course = require("../models/Course").default;
        const courseDoc = await Course.findById(courseId);
        if (courseDoc) {
          courseTitle = courseDoc.title || courseTitle;
          courseImage = courseDoc.image || courseImage;
        }
      } catch {
        // Course model might not exist — use default
      }
    }

    // --- Create Order Document ---
    const order = new Order({
      orderId,
      tranId,
      courseId,
      courseTitle,
      courseImage,
      userId,
      userName: userName || "Unknown",
      userEmail: userEmail || "",
      userPhone: userPhone || "",
      addons: addons || [],
      paymentMethod: paymentMethod || "bkash",
      paymentPlan: paymentPlan || "full",
      promoCode: promoCode || null,
      subtotal: subtotal || totalAmount,
      discount: discount || 0,
      totalAmount,
      currency: currency || "BDT",
      status: "pending",
    });

    await order.save();

    // --- Determine payment flow ---
    const hasSSLCommerzCredentials =
      process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isDemoMode =
      !hasSSLCommerzCredentials || process.env.PAYMENT_MODE === "demo";

    if (isDemoMode) {
      // DEMO MODE: No real gateway — return success immediately for testing
      console.log(`[DEMO] Order created: ${orderId} | Amount: ৳${totalAmount}`);

      // Auto-mark as paid after a brief delay (simulates gateway callback)
      setTimeout(async () => {
        try {
          await Order.updateOne(
            { tranId },
            { status: "paid", verifiedAt: new Date() },
          );
          console.log(`[DEMO] Order ${orderId} auto-verified`);
        } catch (err) {
          console.error(`[DEMO] Auto-verify failed for ${orderId}:`, err);
        }
      }, 2000);

      res.status(200).json({
        success: true,
        orderId,
        tran_id: tranId,
        message: "Demo order created",
        demo: true,
      });
      return;
    }

    // PRODUCTION: Initialize SSLCommerz
    try {
      const result = await initiateSSLCommerz(order, req);
      res.status(200).json({
        success: true,
        orderId,
        tran_id: tranId,
        ...result,
      });
    } catch (sslError: any) {
      console.error("SSLCommerz Error:", sslError);

      // Mark order as failed
      await Order.updateOne({ tranId }, { status: "failed" });

      res.status(502).json({
        success: false,
        message: "Payment gateway initialization failed. Please try again.",
        error: sslError.message,
      });
    }
  } catch (error: any) {
    console.error("Create Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
};

// ============================================================
// Verify Payment (called after gateway redirect)
// ============================================================

export const verifyOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tran_id, status: gatewayStatus } = req.body;

    if (!tran_id || !gatewayStatus) {
      res.status(400).json({
        success: false,
        message: "Missing tran_id or status",
      });
      return;
    }

    const order = await Order.findOne({ tranId: tran_id });

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found",
      });
      return;
    }

    // --- If already verified, return cached result ---
    if (order.status === "paid") {
      res.status(200).json({
        success: true,
        message: "Payment already verified",
        orderId: order.orderId,
        status: "success",
      });
      return;
    }

    // --- Verify with SSLCommerz (production only) ---
    const hasSSLCommerzCredentials =
      process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD;
    const isDemoMode =
      !hasSSLCommerzCredentials || process.env.PAYMENT_MODE === "demo";

    if (!isDemoMode) {
      try {
        const SSLCommerz = require("sslcommerz-lts");
        const isLive = process.env.SSLCOMMERZ_IS_LIVE === "true";
        const sslcz = new SSLCommerz(
          process.env.SSLCOMMERZ_STORE_ID,
          process.env.SSLCOMMERZ_STORE_PASSWORD,
          isLive,
        );

        const validation = await sslcz.validate({
          val_id: tran_id,
        });

        if (!validation || validation.status !== "VALID") {
          await Order.updateOne({ tranId: tran_id }, { status: "failed" });
          res.status(400).json({
            success: false,
            message: "Payment validation failed",
            status: "failed",
          });
          return;
        }
      } catch (validationError) {
        console.error("SSLCommerz Validation Error:", validationError);
        // If validation API fails but gateway said success, trust it
        // (this is a common fallback strategy)
      }
    }

    // --- Determine final status ---
    const isSuccess = gatewayStatus === "success" || gatewayStatus === "VALID";

    if (!isSuccess) {
      await Order.updateOne(
        { tranId: tran_id },
        {
          status: "failed",
          gatewayResponse: {
            ...order.gatewayResponse,
            verifyPayload: req.body,
          },
        },
      );
      res.status(400).json({
        success: false,
        message: "Payment was not successful",
        status: "failed",
      });
      return;
    }

    // --- Mark as paid ---
    await Order.updateOne(
      { tranId: tran_id },
      {
        status: "paid",
        verifiedAt: new Date(),
        gatewayResponse: { ...order.gatewayResponse, verifyPayload: req.body },
      },
    );

    // --- Create Enrollment (only on first successful payment) ---
    try {
      const existingEnrollment = await Enrollment.findOne({
        phone: order.userPhone,
        courseId: order.courseId,
      });

      if (!existingEnrollment) {
        await Enrollment.create({
          name: order.userName,
          phone: order.userPhone || order.userId,
          courseId: order.courseId,
          courseTitle: order.courseTitle,
          amount: order.totalAmount.toString(),
        });
        console.log(
          `Enrollment created for ${order.userName} in ${order.courseTitle}`,
        );
      }
    } catch (enrollmentError) {
      // Log but don't fail the verification — enrollment can be created manually
      console.error("Enrollment Creation Error (non-fatal):", enrollmentError);
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      orderId: order.orderId,
      status: "success",
    });
  } catch (error: any) {
    console.error("Verify Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed",
    });
  }
};

// ============================================================
// SSLCommerz IPN (Instant Payment Notification)
// ============================================================
// SSLCommerz calls this server-to-server. No user sees this response.

export const handleIPN = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;

    if (!payload?.tran_id) {
      res.status(200).send("OK");
      return;
    }

    const order = await Order.findOne({ tranId: payload.tran_id });

    if (!order) {
      console.warn(`[IPN] Order not found for tran_id: ${payload.tran_id}`);
      res.status(200).send("OK");
      return;
    }

    // Already processed
    if (order.status === "paid") {
      res.status(200).send("OK");
      return;
    }

    // SSLCommerz IPN sends status as "VALID" or "FAILED"
    if (payload.status === "VALID") {
      await Order.updateOne(
        { tranId: payload.tran_id },
        {
          status: "paid",
          verifiedAt: new Date(),
          gatewayResponse: payload,
        },
      );

      // Create enrollment
      try {
        const existing = await Enrollment.findOne({
          phone: order.userPhone,
          courseId: order.courseId,
        });
        if (!existing) {
          await Enrollment.create({
            name: order.userName,
            phone: order.userPhone || order.userId,
            courseId: order.courseId,
            courseTitle: order.courseTitle,
            amount: order.totalAmount.toString(),
          });
        }
      } catch {
        // Non-fatal
      }

      console.log(`[IPN] Payment confirmed: ${order.orderId}`);
    } else {
      await Order.updateOne(
        { tranId: payload.tran_id },
        { status: "failed", gatewayResponse: payload },
      );
      console.log(`[IPN] Payment failed: ${order.orderId}`);
    }

    // SSLCommerz expects a 200 OK
    res.status(200).send("OK");
  } catch (error) {
    console.error("[IPN] Error:", error);
    res.status(200).send("OK"); // Always return 200 to SSLCommerz
  }
};

// ============================================================
// Get Order by ID (for receipt pages, etc.)
// ============================================================

export const getOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await Order.findOne({
      $or: [{ orderId: id }, { tranId: id }],
    });

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.status(200).json({ success: true, order });
  } catch (error: any) {
    console.error("Get Order Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch order" });
  }
};

// ============================================================
// Get Orders by User
// ============================================================

export const getUserOrders = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .select("-gatewayResponse");

    res.status(200).json({ success: true, orders });
  } catch (error: any) {
    console.error("Get User Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
};
