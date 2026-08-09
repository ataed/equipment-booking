"use client";

// The root route decides where someone belongs and gets out of the way. Not a
// screen: there is no shared landing page in this app, only two role screens.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function RootPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    router.replace(role === "manager" ? "/manager" : "/trainer");
  }, [loading, user, role, router]);

  return <p className="p-6 text-sm text-gray-500">Chargement...</p>;
}