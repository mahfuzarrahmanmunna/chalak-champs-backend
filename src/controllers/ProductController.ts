import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";
import { R2Service } from "../services/r2.service";
import Product, { IProduct } from "../models/Product";

// --- TYPES ---
type RequestWithFile = AuthRequest & { file?: Express.Multer.File };

// --- HELPERS ---

const getParam = (
  params: Record<string, string | string[]>,
  name: string,
): string => {
  const value = params[name];
  return Array.isArray(value) ? value[0] : value || "";
};

const parseJSON = <T = any>(value: any): T | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
};

const parseBilingual = (value: any): { en: string; bn: string } => {
  const parsed = parseJSON<{ en: string; bn: string }>(value);
  if (
    parsed &&
    typeof parsed === "object" &&
    "en" in parsed &&
    "bn" in parsed
  ) {
    return parsed;
  }
  return { en: "", bn: "" };
};

const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const CATEGORY_FIELDS: (keyof IProduct)[] = [
  "author",
  "pages",
  "publisher",
  "edition",
  "country",
  "language",
  "bagMaterial",
  "bagCapacity",
  "bagDimensions",
  "bagCompartments",
  "apparelMaterial",
  "apparelFit",
  "apparelSizes",
  "apparelColors",
  "stationaryType",
  "stationaryColor",
  "stationaryPackSize",
  "stationaryMaterial",
];

const buildCategoryFields = (
  category: string,
  body: Record<string, any>,
): Partial<IProduct> => {
  const fields: Partial<IProduct> = {};
  for (const field of CATEGORY_FIELDS) {
    (fields as any)[field] = undefined;
  }
  if (category === "book") {
    fields.author = parseBilingual(body.author);
    fields.pages = body.pages || "";
    fields.publisher = parseBilingual(body.publisher);
    fields.edition = parseBilingual(body.edition);
    fields.country = parseBilingual(body.country);
    fields.language = parseBilingual(body.language);
  } else if (category === "bags") {
    fields.bagMaterial = parseBilingual(body.bagMaterial);
    fields.bagCapacity = body.bagCapacity || "";
    fields.bagDimensions = body.bagDimensions || "";
    fields.bagCompartments = body.bagCompartments
      ? parseInt(body.bagCompartments) || undefined
      : undefined;
  } else if (category === "apparel") {
    fields.apparelMaterial = parseBilingual(body.apparelMaterial);
    fields.apparelFit = parseBilingual(body.apparelFit);
    fields.apparelSizes = body.apparelSizes || "";
    fields.apparelColors = body.apparelColors || "";
  } else if (category === "stationary") {
    fields.stationaryType = parseBilingual(body.stationaryType);
    fields.stationaryColor = body.stationaryColor || "";
    fields.stationaryPackSize = body.stationaryPackSize || "";
    fields.stationaryMaterial = parseBilingual(body.stationaryMaterial);
  }
  return fields;
};

const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// ====================================================================
// SLUG HELPER — centralized, no hook dependency
// ====================================================================

async function makeUniqueSlug(base: string, excludeId?: any): Promise<string> {
  let slug = generateSlug(base);
  if (!slug) {
    slug = "product-" + Date.now().toString(36);
  }

  // Check for collision
  const query: any = { slug };
  if (excludeId) query._id = { $ne: excludeId };

  const existing = await Product.findOne(query);
  if (existing) {
    const suffix =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    slug = `${slug}-${suffix}`;
    console.log(`⚠️ Slug collision, made unique: ${slug}`);
  }

  return slug;
}

// ============================================
// 1. CREATE PRODUCT
// ============================================
export const createProduct = catchAsync(
  async (req: RequestWithFile, res: Response, next: NextFunction) => {
    console.log("=== CREATE PRODUCT ===");
    console.log("Body keys:", Object.keys(req.body));
    console.log("slug raw from frontend:", req.body.slug);
    console.log("title raw from frontend:", req.body.title);

    try {
      // --- Image upload ---
      let imageUrl: string | undefined;
      let imageKey: string | undefined;

      if (req.file) {
        const result = await R2Service.uploadImage(
          req.file.buffer,
          req.file.mimetype,
          "products",
        );
        imageUrl = result.url;
        imageKey = result.key;
      }

      // --- Validate category ---
      const category = req.body.category as IProduct["category"];
      const validCategories = ["book", "apparel", "bags", "stationary"];
      if (!category || !validCategories.includes(category)) {
        return next(
          new AppError(
            `Invalid category: "${category}". Must be: ${validCategories.join(", ")}`,
            400,
          ),
        );
      }

      // --- Build slug ---
      const titleObj = parseBilingual(req.body.title);
      let slug = "";

      if (req.body.slug && req.body.slug.toString().trim() !== "") {
        slug = generateSlug(req.body.slug.toString());
      }

      if (!slug) {
        slug = generateSlug(titleObj.en);
      }

      if (!slug) {
        slug = "product-" + Date.now().toString(36);
      }

      // Check uniqueness
      const existing = await Product.findOne({ slug });
      if (existing) {
        const suffix =
          Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        slug = `${slug}-${suffix}`;
      }

      console.log("📌 Computed slug:", slug);

      // --- Build & save product ---
      const product = new Product({
        slug,
        title: titleObj,
        subtitle: parseBilingual(req.body.subtitle),
        description: {
          en: req.body.contentEn || "",
          bn: req.body.contentBn || "",
        },
        secondaryDescription: {
          en: req.body.secondaryDescEn || "",
          bn: req.body.secondaryDescBn || "",
        },
        category,
        fee: parseFloat(req.body.fee) || 0,
        originalFee: req.body.originalFee
          ? parseFloat(req.body.originalFee) || undefined
          : undefined,
        sortOrder: req.body.sortOrder ? parseInt(req.body.sortOrder) : 0,
        badge: req.body.badge || undefined,
        highlights: parseJSON(req.body.highlights) || [],
        features: parseJSON(req.body.features) || [],
        whyPoints: parseJSON(req.body.whyPoints) || [],
        specs: parseJSON(req.body.specs) || [],
        ...buildCategoryFields(category, req.body),
        image: imageUrl,
        imageKey,
        isPublished: true,
      });

      console.log("Before save slug:", product.slug);
      console.log("Before save object:", product.toObject());

      const saved = await product.save();

      console.log("After save slug:", saved.slug);
      console.log("After save object:", saved.toObject());
      // ============================================================
      // 🔥 NUCLEAR FALLBACK: If Mongoose dropped the slug,
      //    force-write it directly via raw MongoDB $set
      // ============================================================
      if (!saved.slug) {
        console.log("🔥 SLUG WAS DROPPED! Forcing via raw $set...");
        await Product.updateOne({ _id: saved._id }, { $set: { slug } });
        const fixed = await Product.findById(saved._id);
        console.log("✅ Force-fixed slug:", fixed?.slug);

        return res.status(201).json({
          success: true,
          data: fixed,
          message: "Product created successfully",
        });
      }

      console.log("✅ Product created, slug:", saved.slug);

      res.status(201).json({
        success: true,
        data: saved,
        message: "Product created successfully",
      });
    } catch (error: any) {
      console.error("❌ Create product error:", error);

      if (error.code === 11000) {
        return next(
          new AppError(
            error.message.includes("slug")
              ? "Duplicate slug. Please use a different one."
              : `Duplicate key error.`,
            400,
          ),
        );
      }

      return next(
        new AppError(error.message || "Failed to create product", 500),
      );
    }
  },
);

// ============================================
// 2. GET ALL PRODUCTS
// ============================================
export const getAllProducts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, isPublished } = req.query;
      const filter: any = {};

      if (category && category !== "all") filter.category = category;
      if (isPublished === "true") filter.isPublished = true;
      else if (isPublished === "false") filter.isPublished = false;

      const products = await Product.find(filter).sort({
        sortOrder: 1,
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        count: products.length,
        data: products,
      });
    } catch (error: any) {
      console.error("❌ Get all products error:", error);
      return next(
        new AppError(error.message || "Failed to fetch products", 500),
      );
    }
  },
);

// ============================================
// 3. GET SINGLE PRODUCT BY ID
// ============================================
export const getProductById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req.params, "id");
      if (!id || !isValidObjectId(id)) {
        return next(new AppError("Invalid product ID format", 400));
      }
      const product = await Product.findById(id);
      if (!product) return next(new AppError("Product not found", 404));
      res.status(200).json({ success: true, data: product });
    } catch (error: any) {
      console.error("❌ Get product error:", error);
      return next(
        new AppError(error.message || "Failed to fetch product", 500),
      );
    }
  },
);

// ============================================
// 4. GET SINGLE PRODUCT BY SLUG
// ============================================
export const getProductBySlug = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = getParam(req.params, "slug");
      if (!slug) return next(new AppError("Product slug is required", 400));
      const product = await Product.findOne({ slug });
      if (!product) return next(new AppError("Product not found", 404));
      res.status(200).json({ success: true, data: product });
    } catch (error: any) {
      console.error("❌ Get product by slug error:", error);
      return next(
        new AppError(error.message || "Failed to fetch product", 500),
      );
    }
  },
);

// ============================================
// 5. UPDATE PRODUCT
// ============================================
export const updateProduct = catchAsync(
  async (req: RequestWithFile, res: Response, next: NextFunction) => {
    const id = getParam(req.params, "id");

    console.log("=== UPDATE PRODUCT ===");
    console.log("Product ID:", id);
    console.log("Body keys:", Object.keys(req.body));
    console.log("slug from frontend:", req.body.slug);

    if (!id || !isValidObjectId(id)) {
      return next(new AppError("Invalid product ID format", 400));
    }

    const product = await Product.findById(id);
    if (!product) return next(new AppError("Product not found", 404));
    if (req.user?.role !== "admin")
      return next(new AppError("Not authorized", 403));

    try {
      const body = req.body;
      const updatesMade: string[] = [];

      // --- Image ---
      if (req.file) {
        if (product.imageKey) {
          await R2Service.deleteFile(product.imageKey).catch((err) => {
            console.warn("⚠️ Failed to delete old image:", err.message);
          });
        }
        const result = await R2Service.uploadImage(
          req.file.buffer,
          req.file.mimetype,
          "products",
        );
        product.image = result.url;
        product.imageKey = result.key;
        updatesMade.push("image");
      }

      // --- Bilingual fields ---
      if (body.title !== undefined) {
        product.title = parseBilingual(body.title);
        updatesMade.push("title");
      }
      if (body.subtitle !== undefined) {
        product.subtitle = parseBilingual(body.subtitle);
        updatesMade.push("subtitle");
      }

      // --- Description ---
      if (body.contentEn !== undefined || body.contentBn !== undefined) {
        product.description = {
          en:
            body.contentEn !== undefined
              ? body.contentEn
              : product.description?.en || "",
          bn:
            body.contentBn !== undefined
              ? body.contentBn
              : product.description?.bn || "",
        };
        updatesMade.push("description");
      }
      if (
        body.secondaryDescEn !== undefined ||
        body.secondaryDescBn !== undefined
      ) {
        product.secondaryDescription = {
          en:
            body.secondaryDescEn !== undefined
              ? body.secondaryDescEn
              : product.secondaryDescription?.en || "",
          bn:
            body.secondaryDescBn !== undefined
              ? body.secondaryDescBn
              : product.secondaryDescription?.bn || "",
        };
        updatesMade.push("secondaryDescription");
      }

      // --- Category ---
      const validCategories = ["book", "apparel", "bags", "stationary"];
      if (body.category !== undefined) {
        if (!validCategories.includes(body.category)) {
          return next(
            new AppError(
              `Invalid category: "${body.category}". Must be: ${validCategories.join(", ")}`,
              400,
            ),
          );
        }
        if (body.category !== product.category) {
          for (const field of CATEGORY_FIELDS) {
            (product as any)[field] = undefined;
          }
        }
        product.category = body.category;
        updatesMade.push("category");
      }

      // --- Slug ---
      if (body.slug !== undefined || updatesMade.includes("title")) {
        let newSlug = "";

        if (body.slug && body.slug.toString().trim() !== "") {
          newSlug = body.slug.toString();
        } else {
          const titleForSlug = body.title
            ? parseBilingual(body.title).en
            : product.title?.en || "";
          newSlug = titleForSlug;
        }

        if (newSlug) {
          product.slug = await makeUniqueSlug(newSlug, product._id);
          updatesMade.push("slug");
          console.log("📌 Updated slug:", product.slug);
        }
      }

      // --- Numeric ---
      if (body.fee !== undefined) {
        product.fee = parseFloat(body.fee) || 0;
        updatesMade.push("fee");
      }
      if (body.originalFee !== undefined) {
        product.originalFee = body.originalFee
          ? parseFloat(body.originalFee) || undefined
          : undefined;
        updatesMade.push("originalFee");
      }
      if (body.sortOrder !== undefined) {
        product.sortOrder = parseInt(body.sortOrder) || 0;
        updatesMade.push("sortOrder");
      }

      // --- String ---
      if (body.badge !== undefined) {
        product.badge = body.badge || undefined;
        updatesMade.push("badge");
      }

      // --- Boolean ---
      if (body.isPublished !== undefined) {
        product.isPublished =
          typeof body.isPublished === "string"
            ? body.isPublished === "true"
            : Boolean(body.isPublished);
        updatesMade.push("isPublished");
      }

      // --- Arrays ---
      if (body.highlights !== undefined) {
        product.highlights = parseJSON(body.highlights) || [];
        updatesMade.push("highlights");
      }
      if (body.features !== undefined) {
        product.features = parseJSON(body.features) || [];
        updatesMade.push("features");
      }
      if (body.whyPoints !== undefined) {
        product.whyPoints = parseJSON(body.whyPoints) || [];
        updatesMade.push("whyPoints");
      }
      if (body.specs !== undefined) {
        product.specs = parseJSON(body.specs) || [];
        updatesMade.push("specs");
      }

      // --- Category-specific ---
      const hasCategoryFields = CATEGORY_FIELDS.some(
        (f) => body[f] !== undefined,
      );
      if (hasCategoryFields) {
        const catFields = buildCategoryFields(product.category, body);
        for (const [key, value] of Object.entries(catFields)) {
          if (body[key] !== undefined) {
            (product as any)[key] = value;
            if (!updatesMade.includes("categoryFields"))
              updatesMade.push("categoryFields");
          }
        }
      }

      if (updatesMade.length === 0) {
        return res.status(200).json({
          success: true,
          data: product,
          message: "No changes to update",
        });
      }

      console.log("💾 Saving updates:", updatesMade.join(", "));
      const saved = await product.save();
      console.log("✅ Updated! slug:", saved.slug);

      res.status(200).json({
        success: true,
        data: saved,
        message: "Product updated successfully",
        updatedFields: updatesMade,
      });
    } catch (error: any) {
      console.error("❌ Update product error:", error);

      if (error.code === 11000) {
        return next(
          new AppError(
            error.message.includes("slug")
              ? "Duplicate slug. Please use a different one."
              : `Duplicate key error.`,
            400,
          ),
        );
      }
      if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map(
          (err: any) => err.message,
        );
        return next(new AppError(`Validation: ${messages.join(", ")}`, 400));
      }

      return next(
        new AppError(error.message || "Failed to update product", 500),
      );
    }
  },
);

// ============================================
// 6. DELETE PRODUCT
// ============================================
export const deleteProduct = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const id = getParam(req.params, "id");
    if (!id || !isValidObjectId(id)) {
      return next(new AppError("Invalid product ID format", 400));
    }

    const product = await Product.findById(id);
    if (!product) return next(new AppError("Product not found", 404));
    if (req.user?.role !== "admin")
      return next(new AppError("Not authorized", 403));

    try {
      if (product.imageKey) {
        await R2Service.deleteFile(product.imageKey).catch((err) => {
          console.warn("⚠️ Failed to delete image:", err.message);
        });
      }
      await product.deleteOne();
      res
        .status(200)
        .json({ success: true, message: "Product deleted successfully" });
    } catch (error: any) {
      console.error("❌ Delete product error:", error);
      return next(
        new AppError(error.message || "Failed to delete product", 500),
      );
    }
  },
);
