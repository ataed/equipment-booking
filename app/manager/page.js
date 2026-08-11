"use client";

import Link from "next/link";
import { RequireRole } from "@/components/RequireRole";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function ManagerPage() {
  return (
    <RequireRole role="manager">
      <ManagerHome />
    </RequireRole>
  );
}

function ManagerHome() {
  const { user, signOut } = useAuth();

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Espace responsable</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

      <nav className="mt-6 flex flex-col gap-2">
        <Link href="/manager/bookings" className="underline">
          Demandes en attente
        </Link>
      </nav>

      <button onClick={signOut} className="mt-8 text-sm underline">
        Se déconnecter
      </button>
    </main>
  );
}
