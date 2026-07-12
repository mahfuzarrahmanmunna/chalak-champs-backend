"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), ".env") });
function firebaseEnvReady() {
    return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
        (process.env.FIREBASE_PROJECT_ID?.trim() &&
            process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
            process.env.FIREBASE_PRIVATE_KEY?.trim()) ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS);
}
function getFirebaseServiceAccount() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
            const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            return {
                projectId: parsed.project_id,
                privateKey: parsed.private_key,
                clientEmail: parsed.client_email,
            };
        }
        catch (error) {
            console.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON:", error);
            return null;
        }
    }
    if (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY) {
        return {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };
    }
    return null;
}
/** Lazy init — skipped when env vars are absent (Workers upload validation / local without .env). */
function ensureFirebaseApp() {
    if (!firebaseEnvReady()) {
        return null;
    }
    if (firebase_admin_1.default.apps.length > 0) {
        return firebase_admin_1.default;
    }
    const serviceAccount = getFirebaseServiceAccount();
    if (serviceAccount) {
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(serviceAccount),
        });
    }
    else {
        firebase_admin_1.default.initializeApp();
    }
    return firebase_admin_1.default;
}
/**
 * Deferred binding so importing this module never throws when Firebase secrets are absent.
 */
exports.auth = new Proxy({}, {
    get(_target, prop, receiver) {
        const fb = ensureFirebaseApp();
        if (!fb) {
            throw new Error("Firebase Admin is not configured (set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).");
        }
        const real = fb.auth();
        const value = Reflect.get(real, prop, real);
        if (typeof value === "function") {
            return value.bind(real);
        }
        return value;
    },
});
