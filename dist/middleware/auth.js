"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = exports.authorize = exports.protect = exports.authenticate = void 0;
const firebase_1 = require("../config/firebase");
const User_1 = __importDefault(require("../models/User"));
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Unauthorized: No token provided" });
            return;
        }
        const idToken = authHeader.split("Bearer ")[1];
        try {
            const decodedToken = await firebase_1.auth.verifyIdToken(idToken);
            const uid = decodedToken.uid;
            // Check if user exists in our database
            const user = await User_1.default.findOne({ uid });
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
                };
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
        }
        catch (error) {
            console.error("Firebase auth error:", error);
            res.status(401).json({ message: "Unauthorized: Invalid token" });
        }
    }
    catch (error) {
        console.error("Auth middleware error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.authenticate = authenticate;
/** Alias for authenticate - use as protect on protected routes */
exports.protect = exports.authenticate;
/** Restrict access to given roles. Use after protect/authenticate. */
const authorize = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({ message: "Forbidden: insufficient role" });
        return;
    }
    next();
};
exports.authorize = authorize;
// Backward-compatible alias for existing routes expecting authenticateToken
exports.authenticateToken = exports.authenticate;
