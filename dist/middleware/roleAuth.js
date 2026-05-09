"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireStudentOrAdmin = exports.requireAdmin = exports.requireRole = exports.authorize = void 0;
// Renamed to 'authorize' to match your import in admin.ts
// It now accepts either a string ("admin") or an array (["admin", "editor"])
const authorize = (allowedRoles) => {
    return (req, res, next) => {
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
exports.authorize = authorize;
// Aliasing 'authorize' to 'requireRole' in case other files use the old name
exports.requireRole = exports.authorize;
exports.requireAdmin = (0, exports.authorize)("admin");
exports.requireStudentOrAdmin = (0, exports.authorize)(["student", "admin"]);
