// src/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebase";
import User, { IUser } from "../models/User";

export interface AuthRequest extends Request {
  user?: IUser;
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

      let user = await User.findOne({ uid }).lean<IUser>();

      const isRegisterRoute = req.originalUrl.includes("/register");

      if (!user && !isRegisterRoute) {
        console.log(`[AUTH] Auto-provisioning user for UID: ${uid}`);

        // ✅ FIXED: .trim() and .filter(Boolean) prevent empty strings from trailing spaces
        const fullName = (decodedToken.name || "").trim();
        const nameParts = fullName.split(/\s+/).filter(Boolean);

        const firstName = nameParts[0] || "User";
        // ✅ FIXED: Safely assigns undefined if no last name exists (Schema will use default "")
        const lastName =
          nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

        const createdUser = await User.create({
          uid: uid,
          email: decodedToken.email || undefined, // ✅ Safer fallback
          firstName: firstName,
          lastName: lastName,
          phoneNumber: decodedToken.phoneNumber || undefined, // ✅ Safer fallback
          role: "student",
        });

        user = createdUser.toObject() as IUser;
      }

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
