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
        <h1 className="text-xl font-bold text-gray-900">Simulateur SMS</h1>
        <p className="text-sm text-gray-500 mt-1">
          Simule la réception d'un SMS depuis un habitant. Format : <code className="bg-gray-100 px-1 rounded">[CODE_OUVRAGE] [description]</code>
        </p>
        <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mt-2 border border-amber-100">
          Conception auteur — les SMS ne sont pas réellement envoyés, ils sont loggés en console et créent un vrai signalement en BDD.
        </p>
      </div>

      {/* Composer */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Composer un SMS</h2>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Numéro expéditeur</label>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Message</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="EAU-004 pas d'eau"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {quickMessages.map((msg) => (
            <button
              key={msg}
              onClick={() => setText(msg)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-lg transition-colors"
            >
              {msg}
            </button>
          ))}
        </div>

        <button
          onClick={send}
          disabled={sending || !text}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          {sending ? "Envoi…" : "📱 Envoyer le SMS simulé"}
        </button>

        {result && (
          <div className={`rounded-xl p-4 text-sm ${result.ok ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
            {result.ok ? (
              <p>✅ Signalement <strong className="font-mono">{result.numero}</strong> créé avec succès</p>
            ) : (
              <p>❌ {result.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Boîte de réception */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Boîte de réception simulée ({inbox.length})</h2>
          <button onClick={loadInbox} className="text-xs text-blue-600 hover:underline">Actualiser</button>
        </div>

        {inbox.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Aucun SMS reçu pour l'instant</p>
        ) : (
          <div className="space-y-3">
            {[...inbox].reverse().map((sms, i) => (
              <div key={i} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                <div className="text-lg">📱</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-600">{sms.from}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(sms.receivedAt).toLocaleTimeString("fr-FR")}
                    </span>
                    {sms.signalementId && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        Signalement créé
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono text-gray-800 mt-0.5">{sms.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
