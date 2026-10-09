"use client";

// Simulateur SMS — interface de démonstration
// Source : programme p. 64 (SMS et relais digitaux), Deck 3 slide 8 (canaux)
// Conception auteur : interface console simulant l'envoi et la réception de SMS

import { useState, useEffect } from "react";

interface SmsMessage {
  from: string;
  body: string;
  receivedAt: string;
  signalementId?: string;
}

export default function SmsDemoPage() {
  const [from, setFrom] = useState("+229 97 00 00 00");
  const [text, setText] = useState("EAU-004 pas d'eau");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; numero?: string; message?: string } | null>(null);
  const [inbox, setInbox] = useState<SmsMessage[]>([]);

  async function loadInbox() {
    const res = await fetch("/api/sms");
    const data = await res.json();
    setInbox(data.smsBox ?? []);
  }

  useEffect(() => { loadInbox(); }, []);

  async function send() {
    setSending(true);
    setResult(null);
    const res = await fetch("/api/sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, text }),
    });
    const data = await res.json();
    setResult({ ok: data.ok, numero: data.numero, message: data.message });
    setSending(false);
    await loadInbox();
  }

  const quickMessages = [
    "EAU-004 pas d'eau",
    "EAU-004 débit faible depuis hier",
    "EAU-004 fuite visible tuyau",
    "ELC-001 lampe éteinte",
    "CODE_INCONNU problème",
  ];

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--navy)" }}>Simulateur SMS</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Simule la réception d'un SMS depuis un habitant. Format : <code className="px-1 rounded font-mono" style={{ background: "var(--soft)", color: "var(--ink)" }}>[CODE_OUVRAGE] [description]</code>
        </p>
        <p className="text-xs px-3 py-2 rounded-lg mt-2" style={{ background: "var(--warn-bg)", border: "1px solid #E0C570", color: "var(--warn)" }}>
          Conception auteur — les SMS ne sont pas réellement envoyés, ils sont loggés en console et créent un vrai signalement en BDD.
        </p>
      </div>

      {/* Composer */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Composer un SMS</h2>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Numéro expéditeur</label>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--bg)" }}
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Message</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="EAU-004 pas d'eau"
            className="w-full rounded-lg px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--bg)" }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {quickMessages.map((msg) => (
            <button
              key={msg}
              onClick={() => setText(msg)}
              className="text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: "var(--soft)", color: "var(--ink)", border: "1px solid var(--line)" }}
            >
              {msg}
            </button>
          ))}
        </div>

        <button
          onClick={send}
          disabled={sending || !text}
          className="w-full font-semibold py-3 rounded-xl text-sm transition-opacity hover:opacity-90 disabled:opacity-50 text-white"
          style={{ background: "var(--ok)" }}
        >
          {sending ? "Envoi…" : "📱 Envoyer le SMS simulé"}
        </button>

        {result && (
          <div className="rounded-xl p-4 text-sm" style={result.ok
            ? { background: "var(--ok-bg)", border: "1px solid #A3D9BC", color: "var(--ok)" }
            : { background: "var(--bad-bg)", border: "1px solid #EBADA8", color: "var(--bad)" }}>
            {result.ok ? (
              <p>✅ Signalement <strong className="font-mono">{result.numero}</strong> créé avec succès</p>
            ) : (
              <p>❌ {result.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Boîte de réception */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Boîte de réception simulée ({inbox.length})</h2>
          <button onClick={loadInbox} className="text-xs hover:underline" style={{ color: "var(--navy)" }}>Actualiser</button>
        </div>

        {inbox.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>Aucun SMS reçu pour l'instant</p>
        ) : (
          <div className="space-y-3">
            {[...inbox].reverse().map((sms, i) => (
              <div key={i} className="flex gap-3 rounded-xl p-3" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
                <div className="text-lg">📱</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono" style={{ color: "var(--ink)" }}>{sms.from}</span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(sms.receivedAt).toLocaleTimeString("fr-FR")}
                    </span>
                    {sms.signalementId && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>
                        Signalement créé
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono mt-0.5" style={{ color: "var(--ink)" }}>{sms.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
