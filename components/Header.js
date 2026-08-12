"use client";

import { useAuth } from "@/lib/auth/AuthProvider";

// Sign-out on every page, not only the role landing pages. The end to end test found
// that gap: a trainer on the bookings screen had no way out, because each lane only
// ever clicked its own screen and started from the landing page.
export function Header() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <header className="flex items-baseline justify-between border-b border-border px-6 py-3">
      <span className="text-sm text-muted">
        {user.displayName ?? user.email}
      </span>
      <button onClick={signOut} className="text-sm underline">
        Se déconnecter
      </button>
    </header>
  );
}
