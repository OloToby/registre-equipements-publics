"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const DEMO_USERS = [
  { label: "Admin", email: "admin@registre.bj", role: "ADMIN" },
  { label: "Responsable communal", email: "responsable@commune-a.bj", role: "RESPONSABLE_COMMUNAL" },
  { label: "Technicien", email: "technicien@commune-a.bj", role: "TECHNICIEN" },
  { label: "Pôle Atlantique", email: "pole@atlantique.bj", role: "AGENCE_POLE" },
];

function LoginForm() {
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
        <h1 className="text-2xl font-bold" style={{ color: "var(--navy)" }}>Connexion</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Registre équipements publics</p>
      </div>

      <div className="rounded-xl p-4" style={{ background: "var(--warn-bg)", border: "1px solid #E0C570" }}>
        <p className="text-xs font-semibold mb-2" style={{ color: "var(--warn)" }}>Comptes de démonstration (mdp : demo1234)</p>
        <div className="space-y-1">
          {DEMO_USERS.map((u) => (
            <button
              key={u.email}
              onClick={() => { setEmail(u.email); setPassword("demo1234"); }}
              className="block w-full text-left text-xs hover:underline"
              style={{ color: "var(--warn)" }}
            >
              {u.label} — {u.email}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="rounded-2xl p-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink)" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--bg)" }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--ink)" }}>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--bg)" }}
          />
        </div>

        {error && (
          <div className="rounded-xl p-3 text-sm" style={{ background: "var(--bad-bg)", border: "1px solid #EBADA8", color: "var(--bad)" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full font-semibold py-3 rounded-xl transition-opacity hover:opacity-90 disabled:opacity-50 text-white"
          style={{ background: "var(--navy)" }}
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <div className="text-center">
        <Link href="/" className="text-sm hover:underline" style={{ color: "var(--muted)" }}>
          ← Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
