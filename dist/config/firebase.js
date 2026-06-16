"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const firebase_admin_1 = __importDefault(require("firebase-admin"));
dotenv_1.default.config();
function firebaseEnvReady() {
    const pid = process.env.FIREBASE_PROJECT_ID?.trim();
    const email = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const pk = process.env.FIREBASE_PRIVATE_KEY?.trim();
    return Boolean(pid && email && pk);
}
/** Lazy init — skipped when env vars are absent (Workers upload validation / local without .env). */
function ensureFirebaseApp() {
    if (!firebaseEnvReady()) {
        return null;
    }
    if (firebase_admin_1.default.apps.length > 0) {
        return firebase_admin_1.default;
    }
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
        authUri: process.env.FIREBASE_AUTH_URI,
        tokenUri: process.env.FIREBASE_TOKEN_URI,
        authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
        clientX509CertUrl: process.env.FIREBASE_CLIENT_CERT_URL,
    };
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount),
    });
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
