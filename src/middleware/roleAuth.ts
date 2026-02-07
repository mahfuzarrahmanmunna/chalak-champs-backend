// middleware/roleAuth.ts
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied. Required roles: " + roles.join(", "),
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(["admin"]);
export const requireStudentOrAdmin = requireRole(["student", "admin"]);
