"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateForRegistration = void 0;
const firebase_1 = require("../config/firebase");
const User_1 = __importDefault(require("../models/User"));
const authenticateForRegistration = async (req, res, next) => {
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
            // Create a user object (existing or temporary)
            req.user =
                user ||
                    {
                        uid,
                        firstName: "",
                        lastName: "",
                        email: decodedToken.email || "",
                        phoneNumber: decodedToken.phoneNumber || "",
                        role: "student",
                    };
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
exports.authenticateForRegistration = authenticateForRegistration;
