"use client";

import { useState } from "react";
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
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateTrainer = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // Fetch fresh Firebase ID token from current manager user
      const token = await user.getIdToken();

      const res = await fetch("/api/trainers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create trainer account");
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Espace responsable</h1>
      <p className="mt-1 text-sm text-muted">{user?.email}</p>

      <nav className="mt-6 flex flex-col gap-2">
        <Link href="/manager/bookings" className="underline text-blue-600">
          Demandes en attente
        </Link>
      </nav>

      <hr className="my-8 border-gray-200" />

      {/* Trainer Creation Form (Story 0) */}
      <section className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Create Trainer Account</h2>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-md">
            Trainer account created successfully!
          </div>
        )}

        <form onSubmit={handleCreateTrainer} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="trainer-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Trainer Name
            </label>
            <input
              id="trainer-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. John Doe"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label
              htmlFor="trainer-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="trainer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="trainer@example.com"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label
              htmlFor="trainer-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="trainer-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-black text-white py-2 px-4 rounded-md font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
      </section>
    </main>
  );
}
