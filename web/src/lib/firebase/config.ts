import type { FirebaseOptions } from "firebase/app";

// Each variable is referenced literally so Next.js can inline it at build time.
const env = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function required(name: keyof typeof env): string {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy web/.env.example to web/.env.local and fill in the Firebase web config.`);
  }
  return value;
}

export function getFirebaseOptions(): FirebaseOptions {
  return {
    apiKey: required("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: required("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: required("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: required("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: required("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: required("NEXT_PUBLIC_FIREBASE_APP_ID"),
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
  };
}

export const FUNCTIONS_REGION = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "asia-south1";

export const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
