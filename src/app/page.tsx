"use client";

import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";

const modules = [
  { title: "📝 Crear encuestas", description: "Diseña formularios con preguntas, escalas y bloques visuales de forma intuitiva." },
  { title: "🔗 Compartir por URL o QR", description: "Distribuye encuestas internas rápidamente para colaboradores o clientes internos." },
  { title: "📊 Dashboard de resultados", description: "Visualiza respuestas, tendencias y métricas clave en tiempo real." },
  { title: "⚙️ Configuración corporativa", description: "Gestiona remitentes, plantillas y ajustes generales del proceso de encuestas." },
];

const features = [
  "Crear encuesta",
  "Compartir por enlace o QR",
  "Registrar respuestas",
  "Enviar resumen por correo",
  "Analizar dashboard",
];

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_28%),linear-gradient(135deg,_#f8fafc_0%,_#eef2ff_100%)]">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12">
          {/* Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-xl shadow-slate-200/70 backdrop-blur sm:p-10 lg:p-14 mb-12"
          >
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-6">
                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  Herramienta interna corporativa
                </span>
                <div className="space-y-4">
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                    Encuestas de satisfacción para toda la organización
                  </h1>
                  <p className="max-w-2xl text-lg leading-8 text-slate-600">
                    Diseña encuestas interactivas, compártelas por URL o QR y visualiza resultados en un dashboard claro para la toma de decisiones internas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/dashboard"
                    className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    → Ir al Dashboard
                  </Link>
                  <Link
                    href="/survey/new"
                    className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    + Nueva Encuesta
                  </Link>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white shadow-lg"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">Flujo previsto</p>
                <div className="mt-5 space-y-4">
                  {features.map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold">
                        ✓
                      </div>
                      <span className="text-sm font-medium">{step}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.section>

          {/* Modules Grid */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            id="modules"
            className="grid gap-4 md:grid-cols-2 mb-12"
          >
            {modules.map((module, i) => (
              <motion.article
                key={module.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
              >
                <h2 className="text-xl font-semibold text-slate-900">{module.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{module.description}</p>
              </motion.article>
            ))}
          </motion.section>

          {/* Enterprise Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            id="setup"
            className="rounded-3xl border border-slate-200 bg-slate-900 p-8 text-white shadow-xl"
          >
            <h2 className="text-2xl font-semibold">Preparada para uso corporativo</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Esta plataforma está enfocada en ser una herramienta interna completa con módulos claros para creación, distribución, análisis y configuración administrativa. Soporta integración con bases de datos CockroachDB y notificaciones por email.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {["Multi-tipo preguntas", "Análisis en tiempo real", "Exportación de datos", "Notificaciones por email", "Integración QR", "Dashboard personalizado"].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      </main>
    </>
  );
}
