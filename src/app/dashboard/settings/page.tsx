"use client";

import { useState, useEffect } from "react";
import { showToast } from "@/components/Alert";

interface SMTPFormData {
  host: string;
  port: string;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
  secure: boolean;
}

export default function SMTPSettingsPage() {
  const [form, setForm] = useState<SMTPFormData>({
    host: "",
    port: "587",
    user: "",
    password: "",
    fromName: "SDC Form",
    fromEmail: "",
    secure: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    fetch("/api/settings/smtp")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.host) {
          setForm({
            host: data.host || "",
            port: String(data.port || 587),
            user: data.user || "",
            password: "",
            fromName: data.fromName || "SDC Form",
            fromEmail: data.fromEmail || "",
            secure: data.secure || false,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!form.host || !form.user || !form.fromEmail) {
      showToast("Host, usuario y email remitente son requeridos", "error");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, any> = {
        host: form.host,
        port: parseInt(form.port) || 587,
        user: form.user,
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        secure: form.secure,
      };
      if (form.password) body.password = form.password;

      const res = await fetch("/api/settings/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      showToast("Configuracion SMTP guardada", "success");
    } catch {
      showToast("Error al guardar la configuracion", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!testEmail) {
      showToast("Ingresa un email para probar", "error");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast("Email de prueba enviado", "success");
    } catch {
      showToast("Error al enviar email de prueba", "error");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuracion de Correo</h1>
        <p className="mt-1 text-slate-500">
          Configura el servidor SMTP para el envio de correos de notificacion y reportes.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <h2 className="text-lg font-semibold text-slate-900">Servidor SMTP</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Host</label>
            <input
              type="text"
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder="smtp.gmail.com"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Puerto</label>
            <input
              type="number"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: e.target.value })}
              placeholder="587"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <input
              type="text"
              value={form.user}
              onChange={(e) => setForm({ ...form, user: e.target.value })}
              placeholder="tu-email@gmail.com"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contrasena de Aplicacion
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Contrasena de aplicacion (16 caracteres para Gmail)"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Remitente</label>
            <input
              type="text"
              value={form.fromName}
              onChange={(e) => setForm({ ...form, fromName: e.target.value })}
              placeholder="SDC Form"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Remitente</label>
            <input
              type="email"
              value={form.fromEmail}
              onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
              placeholder="notificaciones@empresa.com"
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="secure"
            checked={form.secure}
            onChange={(e) => setForm({ ...form, secure: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="secure" className="text-sm text-slate-700">
            Usar SSL/TLS (puerto 465)
          </label>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Configuracion"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Enviar Email de Prueba</h2>
        <p className="text-sm text-slate-500">
          Verifica que la configuracion SMTP funciona correctamente enviando un email de prueba.
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="destinatario@empresa.com"
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none"
          />
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition disabled:opacity-50"
          >
            {testing ? "Enviando..." : "Enviar Prueba"}
          </button>
        </div>
      </div>
    </div>
  );
}
