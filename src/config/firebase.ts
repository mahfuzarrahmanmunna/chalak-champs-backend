import path from "path";
import dotenv from "dotenv";
import admin from "firebase-admin";
import type { Auth } from "firebase-admin/auth";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function firebaseEnvReady(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
      (process.env.FIREBASE_PROJECT_ID?.trim() &&
        process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
        process.env.FIREBASE_PRIVATE_KEY?.trim()) ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );
}

function getFirebaseServiceAccount(): admin.ServiceAccount | null {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      return {
        projectId: parsed.project_id,
        privateKey: parsed.private_key,
        clientEmail: parsed.client_email,
        authUri: parsed.auth_uri,
        tokenUri: parsed.token_uri,
        authProviderX509CertUrl: parsed.auth_provider_x509_cert_url,
        clientX509CertUrl: parsed.client_x509_cert_url,
      };
    } catch (error) {
      console.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON:", error);
      return null;
    }
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      authUri: process.env.FIREBASE_AUTH_URI,
      tokenUri: process.env.FIREBASE_TOKEN_URI,
      authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      clientX509CertUrl: process.env.FIREBASE_CLIENT_CERT_URL,
    };
  }

  return null;
}

/** Lazy init — skipped when env vars are absent (Workers upload validation / local without .env). */
function ensureFirebaseApp(): typeof admin | null {
  if (!firebaseEnvReady()) {
    return null;
  }

  if (admin.apps.length > 0) {
    return admin;
  }

  const serviceAccount = getFirebaseServiceAccount();
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
  } else {
    admin.initializeApp();
  }

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
