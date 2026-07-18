import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";
import Purchase from "../models/Purchase";
import Course from "../models/Course";
import { PurchaseStatus, PaymentStatus, IPurchaseFilters } from "../types/purchase.types";

// --- HELPERS ---

const parseAmount = (value: any): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // Remove currency symbols and spaces
    const cleaned = value.replace(/[৳$\s,]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const buildFilters = (query: any): IPurchaseFilters => {
  const filters: IPurchaseFilters = {};
  
  if (query.status) filters.status = query.status;
  if (query.paymentStatus) filters.paymentStatus = query.paymentStatus;
  if (query.courseId) filters.courseId = query.courseId;
  if (query.studentPhone) filters.studentPhone = query.studentPhone;
  if (query.startDate || query.endDate) {
    filters.startDate = query.startDate;
    filters.endDate = query.endDate;
  }
  if (query.search) filters.search = query.search;
  
  return filters;
};

const applyFilters = (filters: IPurchaseFilters): any => {
  const match: any = {};
  
  if (filters.status) {
    match.status = filters.status;
  }
  
  if (filters.paymentStatus) {
    match.paymentStatus = filters.paymentStatus;
  }
  
  if (filters.courseId) {
    match.course = filters.courseId;
  }
  
  if (filters.studentPhone) {
    match.studentPhone = filters.studentPhone;
  }
  
  if (filters.startDate || filters.endDate) {
    match.createdAt = {};
    if (filters.startDate) {
      match.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      match.createdAt.$lte = endDate;
    }
  }
  
  if (filters.search) {
    match.$or = [
      { purchaseId: { $regex: filters.search, $options: "i" } },
      { studentName: { $regex: filters.search, $options: "i" } },
      { studentPhone: { $regex: filters.search, $options: "i" } },
      { courseTitle: { $regex: filters.search, $options: "i" } },
    ];
  }
  
  return match;
};

// --- CONTROLLERS ---

// 1. CREATE PURCHASE (Public - for student enrollment)
export const createPurchase = catchAsync(
  async (req: Request, res: Response) => {
    const { name, phone, courseId, courseTitle, amount, email, notes } = req.body;
    
    // Validate required fields
    if (!name || !phone || !courseId || !amount) {
      throw new AppError(
        "Name, phone, courseId, and amount are required",
        400
      );
    }
    
    // Validate phone format
    if (!/^01[3-9]\d{8}$/.test(phone.trim())) {
      throw new AppError(
        "Please enter a valid Bangladeshi phone number (01XXXXXXXXX)",
        400
      );
    }
    
    // Parse amount
    const parsedAmount = parseAmount(amount);
    if (parsedAmount <= 0) {
      throw new AppError("Invalid amount provided", 400);
    }
    
    // Find course
    const course = await Course.findOne({
      $or: [{ _id: courseId }, { slug: courseId }],
    });
    
    if (!course) {
      throw new AppError("Course not found", 404);
    }
    
    // Check for duplicate purchase (same phone, same course, within 24 hours)
    const duplicate = await Purchase.findDuplicate(phone.trim(), course._id.toString());
    if (duplicate) {
      throw new AppError(
        "You have already submitted an enrollment for this course. Please wait for confirmation or contact support.",
        409
      );
    }
    
    // Create purchase
    const purchase = await Purchase.create({
      studentName: name.trim(),
      studentPhone: phone.trim(),
      studentEmail: email?.trim() || undefined,
      course: course._id,
      courseTitle: courseTitle || course.title.en || course.title.bn || "Course",
      courseSlug: course.slug,
      instructor: course.instructor,
      instructorName: course.instructorName,
      items: [
        {
          courseId: course._id,
          courseTitle: courseTitle || course.title.en || "Course",
          courseSlug: course.slug,
          amount: parsedAmount,
          originalAmount: course.originalPrice || undefined,
        },
      ],
      totalAmount: parsedAmount,
      originalTotalAmount: course.originalPrice || undefined,
      notes: notes?.trim() || undefined,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get("User-Agent"),
    });
    
    res.status(201).json({
      success: true,
      data: {
        purchaseId: purchase.purchaseId,
        studentName: purchase.studentName,
        courseTitle: purchase.courseTitle,
        amount: purchase.totalAmount,
        status: purchase.status,
      },
      message: "Enrollment submitted successfully! We will contact you soon.",
    });
  }
);

// 2. GET ALL PURCHASES (Admin/Instructor)
export const getAllPurchases = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { page = "1", limit = "20", sort = "-createdAt" } = req.query;
    const filters = buildFilters(req.query);
    
    // Build query
    const match = applyFilters(filters);
    
    // Instructor can only see their own purchases
    if (req.user?.role === "instructor") {
      match.instructor = req.user._id;
    }
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;
    
    // Parse sort
    let sortObj: any = { createdAt: -1 };
    if (typeof sort === "string") {
      const [field, direction] = sort.split(",");
      sortObj = { [field]: direction === "asc" ? 1 : -1 };
    }
    
    const [purchases, total] = await Promise.all([
      Purchase.find(match)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .select("-statusHistory -userAgent -ipAddress"),
      Purchase.countDocuments(match),
    ]);
    
    res.status(200).json({
      success: true,
      count: purchases.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: purchases,
    });
  }
);

// 3. GET PURCHASE BY ID (Admin/Instructor/Student)
export const getPurchaseById = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    let purchase;
    
    // Try to find by MongoDB _id or purchaseId
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      purchase = await Purchase.findById(id);
    } else {
      purchase = await Purchase.findByPurchaseId(id);
    }
    
    if (!purchase) {
      throw new AppError("Purchase not found", 404);
    }
    
    // Authorization check
    if (req.user?.role === "instructor") {
      if (purchase.instructor?.toString() !== req.user._id?.toString()) {
        throw new AppError("Not authorized to view this purchase", 403);
      }
    }
    
    res.status(200).json({
      success: true,
      data: purchase,
    });
  }
);

// 4. GET PURCHASES BY PHONE (Public - for students to check their purchases)
export const getPurchasesByPhone = catchAsync(
  async (req: Request, res: Response) => {
    const { phone } = req.params;
    
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      throw new AppError(
        "Please enter a valid Bangladeshi phone number",
        400
      );
    }
    
    const purchases = await Purchase.findByPhone(phone, 20);
    
    // Return limited info for public access
    const publicPurchases = purchases.map((purchase) => ({
      purchaseId: purchase.purchaseId,
      courseTitle: purchase.courseTitle,
      courseSlug: purchase.courseSlug,
      amount: purchase.totalAmount,
      status: purchase.status,
      paymentStatus: purchase.paymentStatus,
      createdAt: purchase.createdAt,
      confirmedAt: purchase.confirmedAt,
    }));
    
    res.status(200).json({
      success: true,
      count: publicPurchases.length,
      data: publicPurchases,
    });
  }
);

// 5. GET PURCHASES BY COURSE (Admin/Instructor)
export const getPurchasesByCourse = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;
    const { page = "1", limit = "20", status } = req.query;
    
    const match: any = { course: courseId };
    
    if (req.user?.role === "instructor") {
      match.instructor = req.user._id;
    }
    
    if (status) {
      match.status = status;
    }
    
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    
    const [purchases, total] = await Promise.all([
      Purchase.find(match)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select("-statusHistory -userAgent -ipAddress"),
      Purchase.countDocuments(match),
    ]);
    
    res.status(200).json({
      success: true,
      count: purchases.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: purchases,
    });
  }
);

// 6. UPDATE PURCHASE STATUS (Admin/Instructor)
export const updatePurchaseStatus = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, paymentStatus, paymentInfo, note } = req.body;
    
    let purchase;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      purchase = await Purchase.findById(id);
    } else {
      purchase = await Purchase.findByPurchaseId(id);
    }
    
    if (!purchase) {
      throw new AppError("Purchase not found", 404);
    }
    
    // Authorization
    if (req.user?.role === "instructor") {
      if (purchase.instructor?.toString() !== req.user._id?.toString()) {
        throw new AppError("Not authorized to update this purchase", 403);
      }
      // Instructors can only update certain statuses
      const allowedStatuses: PurchaseStatus[] = ["pending", "confirmed", "cancelled"];
      if (status && !allowedStatuses.includes(status)) {
        throw new AppError("You can only set status to pending, confirmed, or cancelled", 403);
      }
    }
    
    // Update status
    if (status) {
      purchase.status = status;
    }
    
    // Update payment status
    if (paymentStatus) {
      purchase.paymentStatus = paymentStatus;
    }
    
    // Update payment info
    if (paymentInfo) {
      purchase.paymentInfo = {
        ...purchase.paymentInfo,
        ...paymentInfo,
        paidAt: paymentInfo.paidAt ? new Date(paymentInfo.paidAt) : purchase.paymentInfo?.paidAt,
      };
      
      // Auto-set payment status if paidAt is provided
      if (paymentInfo.paidAt && !paymentStatus) {
        purchase.paymentStatus = "paid";
      }
    }
    
    // Add note to status history
    if (note && status) {
      const lastHistory = purchase.statusHistory[purchase.statusHistory.length - 1];
      if (lastHistory) {
        lastHistory.note = note;
        lastHistory.changedBy = req.user?._id;
      }
    }
    
    await purchase.save();
    
    res.status(200).json({
      success: true,
      data: purchase,
      message: "Purchase updated successfully",
    });
  }
);

// 7. CANCEL PURCHASE (Student - with phone verification)
export const cancelPurchase = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { phone, reason } = req.body;
    
    if (!phone) {
      throw new AppError("Phone number is required for verification", 400);
    }
    
    let purchase;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      purchase = await Purchase.findById(id);
    } else {
      purchase = await Purchase.findByPurchaseId(id);
    }
    
    if (!purchase) {
      throw new AppError("Purchase not found", 404);
    }
    
    // Verify phone
    if (purchase.studentPhone !== phone.trim()) {
      throw new AppError("Phone number does not match the purchase", 403);
    }
    
    // Check if purchase can be cancelled
    if (purchase.status === "completed" || purchase.status === "cancelled") {
      throw new AppError(
        `Purchase cannot be cancelled as it is already ${purchase.status}`,
        400
      );
    }
    
    purchase.status = "cancelled";
    if (reason) {
      const lastHistory = purchase.statusHistory[purchase.statusHistory.length - 1];
      if (lastHistory) {
        lastHistory.note = `Student cancelled: ${reason}`;
      }
    }
    
    await purchase.save();
    
    res.status(200).json({
      success: true,
      data: {
        purchaseId: purchase.purchaseId,
        status: purchase.status,
      },
      message: "Purchase cancelled successfully",
    });
  }
);

// 8. GET PURCHASE STATS (Admin)
export const getPurchaseStats = catchAsync(
  async (req: AuthRequest, res: Response) => {
    let stats;
    
    if (req.user?.role === "instructor") {
      stats = await Purchase.getInstructorStats(req.user._id.toString());
    } else {
      stats = await Purchase.getAdminStats();
    }
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  }
);

// 9. GET RECENT PURCHASES (Admin/Instructor - for dashboard)
export const getRecentPurchases = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const { limit = "5" } = req.query;
    const limitNum = parseInt(limit as string) || 5;
    
    const match: any = {};
    if (req.user?.role === "instructor") {
      match.instructor = req.user._id;
    }
    
    const purchases = await Purchase.find(match)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .select("purchaseId studentName studentPhone courseTitle totalAmount status paymentStatus createdAt");
    
    res.status(200).json({
      success: true,
      count: purchases.length,
      data: purchases,
    });
  }
);

// 10. EXPORT PURCHASES (Admin/Instructor - CSV data)
export const exportPurchases = catchAsync(
  async (req: AuthRequest, res: Response) => {
    const filters = buildFilters(req.query);
    const match = applyFilters(filters);
    
    if (req.user?.role === "instructor") {
      match.instructor = req.user._id;
    }
    
    const purchases = await Purchase.find(match)
      .sort({ createdAt: -1 })
      .select("-statusHistory -userAgent -ipAddress -__v")
      .limit(1000); // Limit to 1000 for safety
    
    // Transform for CSV
    const csvData = purchases.map((purchase) => ({
      "Purchase ID": purchase.purchaseId,
      "Student Name": purchase.studentName,
      "Student Phone": purchase.studentPhone,
      "Student Email": purchase.studentEmail || "",
      "Course Title": purchase.courseTitle,
      "Course Slug": purchase.courseSlug,
      "Amount (৳)": purchase.totalAmount,
      "Original Amount (৳)": purchase.originalTotalAmount || "",
      "Status": purchase.status,
      "Payment Status": purchase.paymentStatus,
      "Payment Method": purchase.paymentInfo?.method || "",
      "Transaction ID": purchase.paymentInfo?.transactionId || "",
      "Instructor": purchase.instructorName || "",
      "Notes": purchase.notes || "",
      "Created At": purchase.createdAt.toISOString(),
    }));
    
    res.status(200).json({
      success: true,
      data: csvData,
      count: csvData.length,
    });
  }
);