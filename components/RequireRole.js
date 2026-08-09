"use client";

// Client-side route protection. Wraps a screen and sends the wrong person away.
//
// IMPORTANT, and it is why story 1 has two separate criteria for this: this is a
// convenience, not a security boundary. Anyone can open the browser console and
// talk to Firestore directly, skipping every screen in the app. Security Rules are
// what actually stop them. This component only stops an honest user from landing
// somewhere useless.
//
// Criterion 3 in sprint-1-ac.md is this component. Criterion 4 is the rule. Both
// are needed and they are not the same test.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export function RequireRole({ role: requiredRole, children }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Decide nothing until Firebase has answered, or a refresh bounces a
    // signed-in user to the sign-in page.
    if (loading) return;

    if (!user) {
      router.replace("/sign-in");
      return;
    }

    if (requiredRole && role !== requiredRole) {
      // Signed in, wrong role. Send them to their own screen rather than to
      // sign-in, which would be confusing.
      router.replace(role === "manager" ? "/manager" : "/trainer");
    }
  }, [loading, user, role, requiredRole, router]);

  if (loading) {
    return <p className="p-6 text-sm text-gray-500">Chargement...</p>;
  }

  // Render nothing while the redirect in the effect is in flight, so the wrong
  // screen never flashes on screen.
  if (!user || (requiredRole && role !== requiredRole)) {
    return null;
  }

  return children;
}