"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<null | "idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (window.location.search.includes("registered=1")) {
      setRegistered(true);
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    if (mode === "login") {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (res.ok) {
          setStatus("idle");
          router.push("/dashboard");
          router.refresh();
        } else {
          setErrorMsg(data.error || "No se pudo iniciar sesión.");
          setStatus("error");
        }
      } catch {
        setErrorMsg("No se pudo iniciar sesión. Inténtalo de nuevo.");
        setStatus("error");
      }
      return;
    }

    try {
      const res = await fetch("/api/auth/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, mode: "register" }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("sent");
      } else {
        setErrorMsg(data.error || "No se pudo enviar el enlace.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("No se pudo enviar el enlace. Inténtalo de nuevo.");
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
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          {mode === "login" ? "Iniciar sesión" : "Registrarme"}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {mode === "login"
            ? "Ingresa tus credenciales corporativas para acceder a tus encuestas."
            : "Ingresa tu correo corporativo y te enviaremos un enlace para crear tus credenciales."}
        </p>

        <div className="mb-4 flex rounded-lg border border-slate-200 p-1">
          <button
            type="button"
            onClick={() => { setMode("login"); setStatus("idle"); setErrorMsg(""); }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${mode === "login" ? "bg-[#0d7377] text-white" : "text-slate-600"}`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setStatus("idle"); setErrorMsg(""); }}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${mode === "register" ? "bg-[#0d7377] text-white" : "text-slate-600"}`}
          >
            Registrarme
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Correo electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@sanchezbusinesscorp.com"
              className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-[#0d7377] focus:outline-none focus:ring-2 focus:ring-[#0d7377]/20 transition"
            />
          </div>

          {mode === "login" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Contraseña</label>
                <button
                  type="button"
                  onClick={() => {
                    if (!email) {
                      setErrorMsg("Escribe tu correo para enviarte el enlace de acceso.");
                      setStatus("error");
                      return;
                    }
                    setStatus("sending");
                    setErrorMsg("");
                    fetch("/api/auth/send-link", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email, mode: "login" }),
                    })
                      .then((r) => r.json())
                      .then((data) => {
                        if (data.success) {
                          setStatus("sent");
                          setErrorMsg("");
                        } else {
                          setErrorMsg(data.error || "No se pudo enviar el enlace.");
                          setStatus("error");
                        }
                      })
                      .catch(() => {
                        setErrorMsg("No se pudo enviar el enlace.");
                        setStatus("error");
                      });
                  }}
                  className="text-xs font-medium text-[#0d7377] hover:text-[#0a5c5f]"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm focus:border-[#0d7377] focus:outline-none focus:ring-2 focus:ring-[#0d7377]/20 transition"
              />
            </div>
          )}

          <button type="submit" className="w-full bg-[#0d7377] hover:bg-[#0a5c5f] text-white font-medium rounded-md py-2.5 text-sm transition shadow-sm">
            {status === "sending"
              ? "Enviando..."
              : mode === "login"
                ? "Iniciar sesión"
                : "Enviar enlace de registro"}
          </button>
        </form>

        {registered && (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Cuenta creada correctamente. Inicia sesión con tu correo y contraseña.
          </div>
        )}

        {status === "sent" && (
          <p className="mt-4 text-sm text-emerald-600 font-medium">
            {mode === "login"
              ? "Enlace de acceso enviado. Revisa tu correo corporativo."
              : "Enlace de registro enviado. Revisa tu correo corporativo para crear tus credenciales."}
          </p>
        )}

        {status === "error" && (
          <p className="mt-4 text-sm text-red-600 font-medium">{errorMsg}</p>
        )}
      </div>
    </main>
  );
}
