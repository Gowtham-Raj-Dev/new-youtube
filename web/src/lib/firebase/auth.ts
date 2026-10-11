import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, runTransaction, serverTimestamp, updateDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { COLLECTIONS, DEFAULT_SETTINGS, DEFAULT_TIMEZONE } from "@shortflow/shared";
import { firebase } from "./client";

/**
 * Creates users/{uid} and settings/{uid} on first sign-in, and stamps
 * lastLoginAt on every explicit sign-in. Field set must match firestore.rules.
 *
 * Runs in a transaction because the sign-in call and the auth-state listener
 * can both fire for the same new user; the loser retries and sees the docs.
 */
export async function syncUserProfile(user: User, { touchLogin }: { touchLogin: boolean }) {
  const { db } = firebase();
  const userRef = doc(db, COLLECTIONS.users, user.uid);
  const settingsRef = doc(db, COLLECTIONS.settings, user.uid);

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    const settingsSnap = await tx.get(settingsRef);

    if (!userSnap.exists()) {
      tx.set(userRef, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        timezone: DEFAULT_TIMEZONE,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        plan: "free",
        youtubeConnected: false,
      });
    } else if (touchLogin) {
      // The Auth profile is the source of truth for name/photo (sign-up sets the
      // name after the listener may already have created the doc).
      tx.update(userRef, { displayName: user.displayName, photoURL: user.photoURL, lastLoginAt: serverTimestamp() });
    }

    if (!settingsSnap.exists()) {
      tx.set(settingsRef, { ...DEFAULT_SETTINGS, userId: user.uid, updatedAt: serverTimestamp() });
    }
  });
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const { user } = await signInWithPopup(firebase().auth, provider);
  await syncUserProfile(user, { touchLogin: true });
  return user;
}

export async function signInWithEmail(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(firebase().auth, email, password);
  await syncUserProfile(user, { touchLogin: true });
  return user;
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { user } = await createUserWithEmailAndPassword(firebase().auth, email, password);
  await updateProfile(user, { displayName });
  await syncUserProfile(user, { touchLogin: true });
  return user;
}

/** Saves the name and timezone picked in Settings. The Auth profile gets the name too, because sign-in copies it from there. */
export async function saveProfile(user: User, displayName: string, timezone: string) {
  if (displayName !== (user.displayName ?? "")) await updateProfile(user, { displayName });
  await updateDoc(doc(firebase().db, COLLECTIONS.users, user.uid), { displayName, timezone });
}

export function signOut() {
  return firebaseSignOut(firebase().auth);
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "That email and password don't match. Try again.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
  "auth/weak-password": "Use at least 8 characters for your password.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/network-request-failed": "Can't reach the server. Check your connection and retry.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups and retry.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/operation-not-allowed": "This sign-in method isn't enabled yet.",
  "auth/unauthorized-domain": "This domain isn't authorised for sign-in yet.",
};

/** Maps Firebase errors to messages safe to show users. Never surfaces raw stack traces. */
export function friendlyAuthError(error: unknown): string {
  if (error instanceof FirebaseError && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }
  return "Something went wrong while signing in. Please try again.";
}
