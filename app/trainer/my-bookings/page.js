"use client";

import { useEffect, useState } from "react";
import { RequireRole } from "@/components/RequireRole";
import { listMyBookings } from "@/lib/bookings/mine";
import { BOOKING_STATUS } from "@/lib/contract";

const LABEL = {
  [BOOKING_STATUS.PENDING]: "En attente",
  [BOOKING_STATUS.APPROVED]: "Acceptée",
  [BOOKING_STATUS.REFUSED]: "Refusée",
  [BOOKING_STATUS.RETURNED]: "Rendue",
  [BOOKING_STATUS.CANCELED]: "Annulée",
};

export default function MyBookingsPage() {
  return (
    <RequireRole role="trainer">
      <MyBookings />
    </RequireRole>
  );
}

function MyBookings() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listMyBookings()
      .then(setBookings)
      .catch((err) => setError(err.code ?? "erreur"));
  }, []);

  if (error) return <p className="p-6 text-sm text-danger">Erreur: {error}</p>;
  if (!bookings) return <p className="p-6 text-sm text-muted">Chargement...</p>;

  if (bookings.length === 0) {
    return (
      <main className="p-6">
        <h1 className="mb-4 text-xl font-semibold">Mes réservations</h1>
        <p className="text-sm text-muted">Aucune réservation.</p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Mes réservations</h1>

      <ul className="flex flex-col gap-3">
        {bookings.map((b) => (
          <li key={b.id} className="rounded border border-border p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{b.equipmentId}</span>
              {/* The status field is what delivers the outcome. This is why push
                  notification is Sprint 2 and not part of the core loop: the
                  trainer already knows the result from here. */}
              <span className="text-sm text-muted">
                {LABEL[b.status] ?? b.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {b.startTime.toDate().toLocaleString("fr-FR")} — {b.durationHours}
              h
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
