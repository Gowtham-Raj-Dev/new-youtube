import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, initializeFirestore, type Firestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import { FUNCTIONS_REGION, USE_EMULATORS, getFirebaseOptions } from "./config";

// The app is a static export, so modules are also evaluated at build time in
// Node. Services are created lazily and only in the browser.

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
}

let services: FirebaseServices | null = null;

export function firebase(): FirebaseServices {
  if (typeof window === "undefined") {
    throw new Error("Firebase client services are only available in the browser.");
  }
  if (services) return services;

  const app = getApps().length ? getApp() : initializeApp(getFirebaseOptions());
  const auth = getAuth(app);
  // Memory cache (the default): no IndexedDB multi-tab leases that can stall
  // listeners. The dashboard is online-only; uploads need the network anyway.
  const db = initializeFirestore(app, {});
  const storage = getStorage(app);
  const functions = getFunctions(app, FUNCTIONS_REGION);

  if (USE_EMULATORS) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  } else if (process.env.NODE_ENV === "production") {
    void analyticsSupported().then((ok) => ok && getAnalytics(app));
  }

  services = { app, auth, db, storage, functions };
  return services;
}
