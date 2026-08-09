"use client";

// Holds who is signed in and what their role is, so every screen reads it from
// one place instead of each one asking Firebase and handling the loading moment
// itself.
//
// The loading moment is the reason this exists. Firebase restores the session
// asynchronously on page load, so for a few hundred milliseconds auth.currentUser
// is null even when someone is signed in. A component that redirects on null
// would bounce a signed-in user to the sign-in page on every refresh.

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      // The role is a custom claim, so it lives inside the ID token, not on the
      // user object. getIdTokenResult decodes the token and hands back its
      // claims. This is free: no network call, no Firestore read.
      const token = await u.getIdTokenResult();
      setUser(u);
      setRole(token.claims.role ?? null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = () => fbSignOut(auth);

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}