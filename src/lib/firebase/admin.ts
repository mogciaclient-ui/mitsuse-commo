import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | null = null;

export function getAdminFirestore(): Firestore | null {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) return null;
  if (!adminApp) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    adminApp = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore(adminApp);
}
