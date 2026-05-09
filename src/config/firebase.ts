import dotenv from "dotenv";
import admin from "firebase-admin";
import type { Auth } from "firebase-admin/auth";

dotenv.config();

function firebaseEnvReady(): boolean {
  const pid = process.env.FIREBASE_PROJECT_ID?.trim();
  const email = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const pk = process.env.FIREBASE_PRIVATE_KEY?.trim();
  return Boolean(pid && email && pk);
}

/** Lazy init — skipped when env vars are absent (Workers upload validation / local without .env). */
function ensureFirebaseApp(): typeof admin | null {
  if (!firebaseEnvReady()) {
    return null;
  }

  if (admin.apps.length > 0) {
    return admin;
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    clientId: process.env.FIREBASE_CLIENT_ID,
    authUri: process.env.FIREBASE_AUTH_URI,
    tokenUri: process.env.FIREBASE_TOKEN_URI,
    authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    clientX509CertUrl: process.env.FIREBASE_CLIENT_CERT_URL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });

  return admin;
}

/**
 * Deferred binding so importing this module never throws when Firebase secrets are absent.
 */
export const auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    const fb = ensureFirebaseApp();
    if (!fb) {
      throw new Error(
        "Firebase Admin is not configured (set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).",
      );
    }
    const real = fb.auth();
    const value = Reflect.get(real as object, prop, real);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(real);
    }
    return value;
  },
});
