"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function decodeTokenEmail(token: string): string | null {
  try {
    const [header, body] = token.split(".");
    if (!body) return null;
    const normalized = body.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    let decoded: string;
    if (typeof Buffer !== "undefined") {
      decoded = Buffer.from(padded, "base64").toString("utf8");
    } else {
      const bin = atob(padded);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      decoded = new TextDecoder().decode(bytes);
    }
    const payload = JSON.parse(decoded);
    return payload.email || null;
  } catch {
    return null;
  }
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<null | "idle" | "sending" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setErrorMsg("El enlace es inválido o ha expirado. Solicita uno nuevo en la página de registro.");
      setStatus("error");
      return;
    }
    setEmail(decodeTokenEmail(token));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    if (password !== confirm) {
      setErrorMsg("Las contraseñas no coinciden.");
      setStatus("error");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      setStatus("error");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("done");
        router.push("/login?registered=1");
        router.refresh();
      } else {
        setErrorMsg(data.error || "No se pudo completar el registro.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("No se pudo completar el registro. Inténtalo de nuevo.");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="w-10 h-10 bg-[#0d7377]/10 text-[#0d7377] rounded-lg flex items-center justify-center mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Completa tu registro</h1>
        <p className="text-sm text-slate-500 mb-6">
          {email ? `Hola ${email.split("@")[0] || ""}. Crea tus credenciales para acceder con ${email}.` : "Crea tus credenciales de acceso."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Nombre</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre y apellido"
              className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-[#0d7377] focus:outline-none focus:ring-2 focus:ring-[#0d7377]/20 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-[#0d7377] focus:outline-none focus:ring-2 focus:ring-[#0d7377]/20 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Confirmar contraseña</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repite tu contraseña"
              className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-[#0d7377] focus:outline-none focus:ring-2 focus:ring-[#0d7377]/20 transition"
            />
          </div>

          <button
            type="submit"
            disabled={status === "sending" || status === "done" || !token}
            className="w-full bg-[#0d7377] hover:bg-[#0a5c5f] disabled:bg-slate-300 text-white font-medium rounded-md py-2.5 text-sm transition shadow-sm"
          >
            {status === "sending" ? "Creando cuenta..." : "Crear cuenta y entrar"}
          </button>
        </form>

        {status === "error" && (
          <p className="mt-4 text-sm text-red-600 font-medium">{errorMsg}</p>
        )}
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f5f5f5]" />}>
      <RegisterForm />
    </Suspense>
  );
}
