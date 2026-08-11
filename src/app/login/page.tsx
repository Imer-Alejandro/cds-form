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
    <main className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-10 h-10 bg-[#0d7377]/10 text-[#0d7377] rounded-lg flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Iniciar sesión</h1>
        <p className="text-sm text-slate-500 mb-6">Recibirás un enlace mágico al correo corporativo para acceder.</p>
        <form onSubmit={sendLink} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@sanchezbusiness.com"
              className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-[#0d7377] focus:outline-none focus:ring-2 focus:ring-[#0d7377]/20 transition"
            />
          </div>
          <button type="submit" className="w-full bg-[#0d7377] hover:bg-[#0a5c5f] text-white font-medium rounded-md py-2.5 text-sm transition shadow-sm">
            {status === "sending" ? "Enviando..." : "Enviar enlace de acceso"}
          </button>
        </form>
        {status === "sent" && <p className="mt-4 text-sm text-emerald-600 font-medium">Enlace enviado. Revisa tu bandeja de entrada.</p>}
        {status === "error" && <p className="mt-4 text-sm text-red-600 font-medium">Error al enviar. Intenta de nuevo.</p>}
      </div>
    </main>
  );
}
