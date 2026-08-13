"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireRole } from "@/components/RequireRole";
import { listTypesWithAvailability } from "@/lib/equipment/list";

export default function EquipmentPage() {
  return (
    <RequireRole role="trainer">
      <EquipmentList />
    </RequireRole>
  );
}

function EquipmentList() {
  const [types, setTypes] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listTypesWithAvailability()
      .then(setTypes)
      // A permission-denied here means the rule is not in place yet.
      .catch((err) => setError(err.code ?? "erreur"));
  }, []);

  if (error) return <p className="p-6 text-sm text-danger">Erreur: {error}</p>;
  if (!types) return <p className="p-6 text-sm text-muted">Chargement...</p>;
  if (types.length === 0)
    return <p className="p-6 text-sm text-muted">Aucun matériel enregistré.</p>;

  return (
    <main className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Matériel</h1>

      <ul className="flex flex-col gap-3">
        {types.map((t) => (
          <li key={t.id} className="rounded border border-border p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{t.name}</span>
              <span className="text-sm text-muted">
                {t.available ? "Disponible" : "Indisponible"}
              </span>
            </div>

            {t.available ? (
              // Query param rather than opening the booking form here. Opening it
              // inside this page would mean dev B editing dev A's file, which is
              // the collision the split exists to avoid.
              <Link
                href={`/trainer/booking?type=${t.id}`}
                className="mt-3 inline-block text-sm underline"
              >
                Réserver
              </Link>
            ) : (
              <span className="mt-3 inline-block text-sm text-muted">
                Aucun appareil disponible
              </span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
