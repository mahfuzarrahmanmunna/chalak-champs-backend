// src/controllers/ProductController.ts

import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";
import {
  uploadToImgBB,
  deleteLocalFile,
  deleteFromImgBB,
} from "../utils/imgbb";
import Product, { IProduct } from "../models/Product";

// --- TYPES ---
type MulterFiles = {
  [fieldname: string]: {
    buffer?: Buffer;
    path?: string;
    originalname?: string;
  }[];
};

type RequestWithFiles = Omit<AuthRequest, "files"> & { files?: MulterFiles };

// --- HELPERS ---

// Safely convert any value to a JSON string for Mongoose String fields.
// Handles: plain string → pass through, object → stringify, JSON string → pass through.
const safeString = (value: any): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

// Parse JSON string to object/array. Returns fallback if parsing fails.
const parseJSON = (value: any) => {
  if (!value) return undefined;
  // If already parsed (e.g. by Express body parser), return as-is
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return value;
  }
};

// 1. CREATE PRODUCT
export const createProduct = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    const files = req.files as MulterFiles;

    let imageData: { url: string; deleteUrl: string } | undefined;

    try {
      // Handle Image Upload
      if (files && files.image && files.image[0]) {
        const file = files.image[0];
        const payload = file.buffer ? file.buffer : (file.path as string);
        imageData = await uploadToImgBB(payload as any);
        if (file.path) deleteLocalFile(file.path);
      }

      const productData: Partial<IProduct> = {
        // String fields stored as JSON — safeString ensures object → string
        title: safeString(req.body.title),
        subtitle: safeString(req.body.subtitle),
        author: safeString(req.body.author),
        publisher: safeString(req.body.publisher),
        edition: safeString(req.body.edition),
        country: safeString(req.body.country),
        language: safeString(req.body.language),
        badge: req.body.badge || undefined,
        pages: req.body.pages || undefined,

        // Object fields — construct manually
        description: {
          en: req.body.contentEn || "",
          bn: req.body.contentBn || "",
        },
        secondaryDescription: {
          en: req.body.secondaryDescEn || "",
          bn: req.body.secondaryDescBn || "",
        },

        // Number fields
        category: req.body.category,
        fee: parseFloat(req.body.fee),
        originalFee: req.body.originalFee
          ? parseFloat(req.body.originalFee)
          : undefined,
        sortOrder: req.body.sortOrder ? parseInt(req.body.sortOrder) : 0,

        // Array fields — parseJSON (now matches the updated schema)
        highlights: parseJSON(req.body.highlights) || [],
        features: parseJSON(req.body.features) || [],
        whyPoints: parseJSON(req.body.whyPoints) || [],
        specs: parseJSON(req.body.specs) || [],

        // File URLs
        image: imageData?.url,
        imageDeleteUrl: imageData?.deleteUrl,

        isPublished: true,
      };

      const product = await Product.create(productData);

      res.status(201).json({
        success: true,
        data: product,
        message: "Product created successfully",
      });
    } catch (error: any) {
      if (files?.image?.[0]?.path) deleteLocalFile(files.image[0].path);
      return next(
        new AppError(error.message || "Failed to create product", 500),
      );
    }
  },
);

// 2. GET ALL PRODUCTS (Public)
export const getAllProducts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { category, isPublished } = req.query;

    const filter: any = {};
    if (category && category !== "all") filter.category = category;
    if (typeof isPublished !== "undefined") filter.isPublished = isPublished;

    const products = await Product.find(filter).sort({
      sortOrder: 1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  },
);

// 3. GET SINGLE PRODUCT (Public)
export const getProductById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  },
);

// 4. UPDATE PRODUCT
export const updateProduct = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const files = req.files as MulterFiles;

    const product = await Product.findById(id);
    if (!product) return next(new AppError("Product not found", 404));

    if (req.user?.role !== "admin") {
      return next(new AppError("Not authorized to update this product", 403));
    }

    try {
      // Handle Image Update
      if (files && files.image && files.image[0]) {
        if (product.imageDeleteUrl)
          await deleteFromImgBB(product.imageDeleteUrl);
        const file = files.image[0];
        const payload = file.buffer ? file.buffer : (file.path as string);
        const newData = await uploadToImgBB(payload as any);
        product.image = newData.url;
        product.imageDeleteUrl = newData.deleteUrl;
        if (file.path) deleteLocalFile(file.path);
      }

      const {
        title,
        category,
        subtitle,
        fee,
        originalFee,
        badge,
        isPublished,
        sortOrder,
        pages,
      } = req.body;

      // String fields — safeString
      if (title !== undefined) product.title = safeString(title);
      if (subtitle !== undefined) product.subtitle = safeString(subtitle);
      if (badge) product.badge = badge;
      if (pages) product.pages = pages;
      if (category) product.category = category;
      if (fee) product.fee = parseFloat(fee);
      if (originalFee) product.originalFee = parseFloat(originalFee);
      if (typeof isPublished !== "undefined") product.isPublished = isPublished;
      if (sortOrder !== undefined) product.sortOrder = parseInt(sortOrder);

      // Object fields — direct assignment
      if (
        req.body.contentEn !== undefined ||
        req.body.contentBn !== undefined
      ) {
        product.description = {
          en:
            req.body.contentEn !== undefined
              ? req.body.contentEn
              : product.description?.en || "",
          bn:
            req.body.contentBn !== undefined
              ? req.body.contentBn
              : product.description?.bn || "",
        };
      }
      if (
        req.body.secondaryDescEn !== undefined ||
        req.body.secondaryDescBn !== undefined
      ) {
        product.secondaryDescription = {
          en:
            req.body.secondaryDescEn !== undefined
              ? req.body.secondaryDescEn
              : product.secondaryDescription?.en || "",
          bn:
            req.body.secondaryDescBn !== undefined
              ? req.body.secondaryDescBn
              : product.secondaryDescription?.bn || "",
        };
      }

      // Bilingual String fields — safeString
      if (req.body.author !== undefined)
        product.author = safeString(req.body.author);
      if (req.body.publisher !== undefined)
        product.publisher = safeString(req.body.publisher);
      if (req.body.edition !== undefined)
        product.edition = safeString(req.body.edition);
      if (req.body.country !== undefined)
        product.country = safeString(req.body.country);
      if (req.body.language !== undefined)
        product.language = safeString(req.body.language);

      // Array fields — parseJSON (now matches updated schema)
      if (req.body.highlights)
        product.highlights = parseJSON(req.body.highlights);
      if (req.body.features) product.features = parseJSON(req.body.features);
      if (req.body.whyPoints) product.whyPoints = parseJSON(req.body.whyPoints);
      if (req.body.specs) product.specs = parseJSON(req.body.specs);

      await product.save();

      res.status(200).json({
        success: true,
        data: product,
        message: "Product updated successfully",
      });
    } catch (error: any) {
      if (files?.image?.[0]?.path) deleteLocalFile(files.image[0].path);
      return next(
        new AppError(error.message || "Failed to update product", 500),
      );
    }
  },
);

// 5. DELETE PRODUCT
export const deleteProduct = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) return next(new AppError("Product not found", 404));

    if (req.user?.role !== "admin") {
      return next(new AppError("Not authorized to delete this product", 404));
    }

    try {
      if (product.imageDeleteUrl) await deleteFromImgBB(product.imageDeleteUrl);
      await product.deleteOne();

      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error: any) {
      return next(
        new AppError(error.message || "Failed to delete product", 500),
      );
    }
  },
);
