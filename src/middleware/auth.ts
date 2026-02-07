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

      // Check if user exists in our database
      const user = await User.findOne({ uid });

      // For registration endpoint, we allow the request to proceed even if user doesn't exist
      // The registration controller will handle creating the user
      if (req.path === "/api/auth/register") {
        // Create a temporary user object for the registration process
        req.user = {
          uid,
          firstName: "",
          lastName: "",
          email: decodedToken.email || "",
          phoneNumber: decodedToken.phoneNumber || "",
          role: "student",
        } as IUser;
        next();
        return;
      }

      // For other endpoints, user must exist
      if (!user) {
        res.status(401).json({ message: "Unauthorized: User not found" });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Firebase auth error:", error);
      res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
