"use client";

// Page de connexion — tous les rôles sauf habitant (sans compte)
// Conception auteur : formulaire email/mdp, cookie de session, redirection post-login

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const DEMO_USERS = [
  { label: "Admin", email: "admin@registre.bj", role: "ADMIN" },
  { label: "Responsable communal", email: "responsable@commune-a.bj", role: "RESPONSABLE_COMMUNAL" },
  { label: "Technicien", email: "technicien@commune-a.bj", role: "TECHNICIEN" },
  { label: "Pôle Atlantique", email: "pole@atlantique.bj", role: "AGENCE_POLE" },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push(redirectTo);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Identifiants incorrects");
      setLoading(false);
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-12 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
        <p className="text-sm text-gray-500 mt-1">Registre équipements publics</p>
      </div>

      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
        <p className="text-xs font-semibold text-amber-800 mb-2">Comptes de démonstration (mdp : demo1234)</p>
        <div className="space-y-1">
          {DEMO_USERS.map((u) => (
            <button
              key={u.email}
              onClick={() => { setEmail(u.email); setPassword("demo1234"); }}
              className="block w-full text-left text-xs text-amber-700 hover:text-amber-900 hover:underline"
            >
              {u.label} — {u.email}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <div className="text-center">
        <Link href="/" className="text-sm text-gray-500 hover:underline">
          ← Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}
