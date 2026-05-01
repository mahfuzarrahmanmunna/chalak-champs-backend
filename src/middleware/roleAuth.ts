// src/middleware/roleAuth.ts
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

// Renamed to 'authorize' to match your import in admin.ts
// It now accepts either a string ("admin") or an array (["admin", "editor"])
export const authorize = (allowedRoles: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

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

// Aliasing 'authorize' to 'requireRole' in case other files use the old name
export const requireRole = authorize;

export const requireAdmin = authorize("admin");
export const requireStudentOrAdmin = authorize(["student", "admin"]);
