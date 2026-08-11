"use client";

import { useEffect, useState } from "react";
import { RequireRole } from "@/components/RequireRole";
import { listPending } from "@/lib/bookings/pending";
import { decide } from "@/lib/bookings/decide";
import { BOOKING_STATUS } from "@/lib/contract";

export default function ManagerBookingsPage() {
  return (
    <RequireRole role="manager">
      <PendingList />
    </RequireRole>
  );
}

function PendingList() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      setRows(await listPending());
    } catch (err) {
      setError(err.code ?? "erreur");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handle(booking, next) {
    setBusyId(booking.id);
    setError(null);
    try {
      await decide(booking, next);
      // Reload rather than removing the row locally. Slower, and it means the
      // screen always shows what the database actually holds, which matters while
      // the rules are still being written.
      await load();
    } catch (err) {
      setError(err.message ?? err.code ?? "erreur");
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="p-6 text-sm text-danger">Erreur: {error}</p>;
  if (!rows) return <p className="p-6 text-sm text-muted">Chargement...</p>;

  // Criterion 6.
  if (rows.length === 0) {
    return (
      <main className="p-6">
        <h1 className="mb-4 text-xl font-semibold">Demandes en attente</h1>
        <p className="text-sm text-muted">Aucune demande en attente.</p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Demandes en attente</h1>

      <ul className="flex flex-col gap-3">
        {rows.map((b) => (
          <li key={b.id} className="rounded border border-border p-4">
            <p className="font-medium">{b.trainer.name}</p>

            <p className="text-sm text-muted">{b.trainer.email}</p>

            <p className="mt-2 text-sm">
              {b.equipmentId} — {b.startTime.toDate().toLocaleString("fr-FR")} —{" "}
              {b.durationHours}h
            </p>

            <div className="mt-3 flex gap-3">
              <button
                onClick={() => handle(b, BOOKING_STATUS.APPROVED)}
                disabled={busyId === b.id}
                className="rounded bg-foreground px-3 py-2 text-sm text-background disabled:opacity-50"
              >
                Accepter
              </button>
              <button
                onClick={() => handle(b, BOOKING_STATUS.REFUSED)}
                disabled={busyId === b.id}
                className="rounded border border-border px-3 py-2 text-sm disabled:opacity-50"
              >
                Refuser
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
