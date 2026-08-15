"use client";

import { useState } from "react";
import { attachDamagePhoto } from "@/lib/bookings/damage";

export function DamageReport({ booking, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (booking.damaged) {
    return (
      <p className="mt-2 text-sm text-danger">
        Signalé endommagé.{" "}
        <a
          href={booking.damagePhotoUrl}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Voir la photo
        </a>
      </p>
    );
  }

  if (process.env.NEXT_PUBLIC_USE_EMULATORS !== "true") {
    return (
      <p className="mt-2 text-sm text-muted">
        Signalement de dommage disponible en local uniquement.
      </p>
    );
  }

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      await attachDamagePhoto(booking.id, file);
      onDone?.();
    } catch (err) {
      setError(err.message ?? err.code ?? "envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <label className="text-sm underline">
        {busy ? "Envoi..." : "Signaler un dommage"}

        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          disabled={busy}
          className="hidden"
        />
      </label>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
