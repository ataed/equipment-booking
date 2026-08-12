"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RequireRole } from "@/components/RequireRole";
import { createBooking } from "@/lib/bookings/create";
import {
  OPENING_HOUR,
  CLOSING_HOUR,
  ALLOWED_DURATIONS_HOURS,
} from "@/lib/contract";

export default function BookingPage() {
  return (
    <RequireRole role="trainer">
      <BookingForm />
    </RequireRole>
  );
}

function BookingForm() {
  const router = useRouter();

  const typeId = useSearchParams().get("type");

  const [date, setDate] = useState("");
  const [hour, setHour] = useState(String(OPENING_HOUR));
  const [duration, setDuration] = useState("1");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Only hours where a booking of the chosen duration still ends before closing.
  const hours = [];
  for (let h = OPENING_HOUR; h + Number(duration) <= CLOSING_HOUR; h++) {
    hours.push(h);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    // Built from the date input's parts rather than new Date(string), which
    // parses "2026-08-20" as UTC midnight and would shift the local hour.
    const [y, m, d] = date.split("-").map(Number);
    const startTime = new Date(y, m - 1, d, Number(hour), 0, 0, 0);

    try {
      await createBooking({
        typeId,
        startTime,
        durationHours: Number(duration),
      });
      router.replace("/trainer/my-bookings");
    } catch (err) {
      setError(err.reason ?? err.code ?? "réservation impossible");
    } finally {
      setBusy(false);
    }
  }

  if (!typeId) {
    return (
      <p className="p-6 text-sm text-danger">Aucun type de matériel choisi.</p>
    );
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-1 text-xl font-semibold">Réserver</h1>
      <p className="mb-6 text-sm text-muted">{typeId}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="field"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Durée</span>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="field"
          >
            {ALLOWED_DURATIONS_HOURS.map((d) => (
              <option key={d} value={d}>
                {d}h
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">Heure de début</span>
          <select
            value={hour}
            onChange={(e) => setHour(e.target.value)}
            className="field"
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={busy} className="btn">
          {busy ? "Envoi..." : "Demander la réservation"}
        </button>
      </form>
    </main>
  );
}
