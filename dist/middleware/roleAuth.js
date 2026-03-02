"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStudentOrAdmin = exports.requireAdmin = exports.requireRole = void 0;
const requireRole = (roles) => {
    return (req, res, next) => {
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
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)(["admin"]);
exports.requireStudentOrAdmin = (0, exports.requireRole)(["student", "admin"]);
