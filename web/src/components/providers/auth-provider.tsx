"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebase } from "@/lib/firebase/client";
import { syncUserProfile } from "@/lib/firebase/auth";

interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    return onAuthStateChanged(firebase().auth, (user) => {
      setState({ user, loading: false });
      // Restored sessions: make sure the profile exists without bumping lastLoginAt.
      if (user) void syncUserProfile(user, { touchLogin: false }).catch(() => {});
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
