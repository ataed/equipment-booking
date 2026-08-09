"use client";

import { RequireRole } from "@/components/RequireRole";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function TrainerPage() {
  return (
    <RequireRole role="trainer">
      <TrainerHome />
    </RequireRole>
  );
}

function TrainerHome() {
  const { user, role, signOut } = useAuth();

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Espace formateur</h1>
      <p className="mt-2 text-sm text-gray-600">
        {user.email} — {role}
      </p>
      <button onClick={signOut} className="mt-6 text-sm underline">
        Se déconnecter
      </button>
    </main>
  );
}