"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const modules = [
  { title: "Crear encuestas", description: "Diseña formularios con preguntas, escalas y bloques visuales de forma intuitiva." },
  { title: "Compartir por URL o QR", description: "Distribuye encuestas internas rápidamente para colaboradores o clientes internos." },
  { title: "Dashboard de resultados", description: "Visualiza respuestas, tendencias y métricas clave en tiempo real." },
  { title: "Configuración corporativa", description: "Gestiona remitentes, plantillas y ajustes generales del proceso de encuestas." },
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
    <main className="min-h-screen bg-[#f5f5f5] py-12 px-6 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          {/* Hero Section */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10 lg:p-12 mb-10"
          >
            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div className="space-y-6">
                <span className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-[#0d7377] uppercase tracking-wider">
                  Herramienta interna corporativa
                </span>
                <div className="space-y-4">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    Encuestas de satisfacción para toda la organización
                  </h1>
                  <p className="max-w-2xl text-base leading-relaxed text-slate-600">
                    Diseña encuestas interactivas, compártelas por URL o QR y visualiza resultados en un dashboard claro para la toma de decisiones internas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/dashboard"
                    className="rounded-md bg-[#0d7377] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a5c5f] shadow-sm"
                  >
                    Ir al Dashboard
                  </Link>
                  <Link
                    href="/survey/new"
                    className="rounded-md bg-[#e8722a] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c95d1b] shadow-sm"
                  >
                    + Nueva Encuesta
                  </Link>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="rounded-xl border border-slate-200 bg-[#0d7377] p-6 text-white shadow-md"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-teal-100/70">Flujo de trabajo</p>
                <div className="mt-4 space-y-3">
                  {features.map((step, i) => (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.08 }}
                      className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-2.5 border border-white/10"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8722a] text-xs font-bold text-white">
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
            transition={{ delay: 0.3 }}
            id="modules"
            className="grid gap-4 md:grid-cols-2 mb-10"
          >
            {modules.map((module, i) => (
              <motion.article
                key={module.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.08 }}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-teal-200 transition"
              >
                <h2 className="text-lg font-bold text-slate-900">{module.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{module.description}</p>
              </motion.article>
            ))}
          </motion.section>

          {/* Enterprise Section */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            id="setup"
            className="rounded-2xl border border-slate-200 bg-[#0a5c5f] p-8 text-white shadow-md"
          >
            <h2 className="text-xl font-bold">Preparada para uso corporativo</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-teal-50/80">
              Esta plataforma está enfocada en ser una herramienta interna completa con módulos claros para creación, distribución, análisis y configuración administrativa. Soporta integración con bases de datos CockroachDB y notificaciones por email.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {["Multi-tipo preguntas", "Análisis en tiempo real", "Exportación de datos", "Notificaciones por email", "Integración QR", "Dashboard personalizado"].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <span className="text-[#e8722a] font-bold">✓</span>
                  <span className="text-sm text-slate-100">{feature}</span>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      </main>
  );
}

