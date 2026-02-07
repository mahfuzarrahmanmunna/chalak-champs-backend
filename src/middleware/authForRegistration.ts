// src/middleware/authForRegistration.ts
import type { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebase";
import User, { IUser } from "../models/User";

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticateForRegistration = async (
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

      // Create a user object (existing or temporary)
      req.user =
        user ||
        ({
          uid,
          firstName: "",
          lastName: "",
          email: decodedToken.email || "",
          phoneNumber: decodedToken.phoneNumber || "",
          role: "student",
        } as IUser);

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
