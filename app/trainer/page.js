"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RequireRole } from "@/components/RequireRole";
import { useAuth } from "@/lib/auth/AuthProvider";
import { registerPushNotifications } from "@/lib/notifications/register";

export default function TrainerPage() {
  return (
    <RequireRole role="trainer">
      <TrainerHome />
    </RequireRole>
  );
}

function NotificationBanner() {
  const [status, setStatus] = useState("idle");

  // Check the browser's memory when the page loads

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        // Browser has permission, but we MUST ensure the token is saved in the database!
        // We run this silently in the background.
        registerPushNotifications().then((success) => {
          if (success) setStatus("success");
        });
      } else if (Notification.permission === "denied") {
        setStatus("error");
      }
    }
  }, []);

  async function handleEnable() {
    setStatus("loading");
    const success = await registerPushNotifications();
    if (success) {
      setStatus("success");
    } else {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="my-6 max-w-sm rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
        ✓ Notifications activées.
      </div>
    );
  }

  return (
    <div className="my-6 flex max-w-sm flex-col gap-3 rounded border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm text-muted">
        Recevez une alerte sur cet appareil dès que le manager valide ou refuse
        votre réservation.
      </p>
      <button
        type="button"
        onClick={handleEnable}
        disabled={status === "loading"}
        className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
      >
        {status === "loading"
          ? "Activation en cours..."
          : "Activer les notifications"}
      </button>
      {status === "error" && (
        <p className="text-xs text-danger">
          Échec de l'activation. Vérifiez les permissions de votre navigateur.
        </p>
      )}
    </div>
  );
}

function TrainerHome() {
  const { user } = useAuth();

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Espace formateur</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

      <NotificationBanner />

      <nav className="flex flex-col gap-2">
        <Link href="/trainer/equipment" className="underline">
          Voir le matériel
        </Link>
        <Link href="/trainer/my-bookings" className="underline">
          Mes réservations
        </Link>
      </nav>
    </main>
  );
}
