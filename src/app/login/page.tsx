"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<null | "idle" | "sending" | "sent" | "error">("idle");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setStatus("sent");
      else setStatus("error");
    } catch (err) {
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow">
        <h1 className="text-2xl font-bold mb-2">Iniciar sesión</h1>
        <p className="text-sm text-slate-500 mb-6">Recibirás un enlace mágico al correo para iniciar sesión.</p>
        <form onSubmit={sendLink} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full rounded-lg border border-slate-200 px-4 py-3"
          />
          <button type="submit" className="w-full bg-slate-900 text-white rounded-lg py-3">
            {status === "sending" ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>
        {status === "sent" && <p className="mt-4 text-sm text-green-600">Enlace enviado. Revisa tu correo.</p>}
        {status === "error" && <p className="mt-4 text-sm text-red-600">Error al enviar. Intenta de nuevo.</p>}
      </div>
    </main>
  );
}
