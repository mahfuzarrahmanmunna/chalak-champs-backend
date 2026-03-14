// src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebase";
import User, { IUser } from "../models/User";

export interface AuthRequest extends Request {
  user?: IUser; // Expects IUser or undefined
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized: No token provided" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // FIX 1: Use .lean() to return a plain JavaScript object instead of a Mongoose Document
      // This fixes the "Type Document is not assignable to IUser" error
      let user = await User.findOne({ uid }).lean<IUser>();

      const isRegisterRoute = req.originalUrl.includes("/register");

      if (!user && !isRegisterRoute) {
        console.log(`[AUTH] Auto-provisioning user for UID: ${uid}`);

        const fullName = decodedToken.name || "User";
        const nameParts = fullName.split(" ");
        const firstName = nameParts[0] || "User";
        const lastName =
          nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";

        // Use .toObject() on the result if creating, or just assign since we are creating fresh
        const createdUser = await User.create({
          uid: uid,
          email: decodedToken.email || "",
          firstName: firstName,
          lastName: lastName,
          phoneNumber: decodedToken.phoneNumber || "",
          role: "student",
        });

        user = createdUser.toObject() as IUser; // Convert to plain object
      }

      // FIX 2: Convert null to undefined.
      // Mongoose returns null if not found, but the interface expects undefined.
      req.user = user || undefined;

      next();
    } catch (firebaseError) {
      console.error("Firebase auth error:", firebaseError);
      res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const authenticateToken = authenticate;
export const protect = authenticate;

export const authorize =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res
        .status(403)
        .json({ message: `Forbidden: Role '${req.user.role}' is not allowed` });
      return;
    }
    next();
  };
