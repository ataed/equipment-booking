"use client";

import Link from "next/link";
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
  const { user, signOut } = useAuth();

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Espace formateur</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

      <nav className="mt-6 flex flex-col gap-2">
        <Link href="/trainer/equipment" className="underline">
          Voir le matériel
        </Link>
        <Link href="/trainer/my-bookings" className="underline">
          Mes réservations
        </Link>
      </nav>

      <button onClick={signOut} className="mt-8 text-sm underline">
        Se déconnecter
      </button>
    </main>
  );
}
