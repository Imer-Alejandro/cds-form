"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Alert, showToast } from "@/components/Alert";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function NewSurveyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  async function handleCreate() {
    if (!formData.title.trim()) {
      showToast("El título es requerido", "error");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
        }),
      });

      if (!response.ok) throw new Error("Failed to create survey");

      const survey = await response.json();
      showToast("Encuesta creada exitosamente", "success");
      router.push(`/survey/${survey.id}/edit`);
    } catch (error) {
      showToast("Error al crear la encuesta", "error");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f5f5] py-12 px-6">
      <div className="mx-auto max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-white p-8 border border-slate-200 shadow-sm"
        >
          <h1 className="text-2xl font-bold text-slate-900">
            Crear Nueva Encuesta
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Comienza por definir el título y la descripción de la encuesta
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Título de la encuesta *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Ej: Evaluación de clima laboral Q3"
                className="w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0d7377] focus:outline-none focus:ring-2 focus:ring-[#0d7377]/20 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Descripción (Opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe brevemente el propósito de esta encuesta..."
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#0d7377] focus:outline-none focus:ring-2 focus:ring-[#0d7377]/20 transition resize-none"
              />
            </div>

            <Alert
              type="info"
              title="Información"
              message="Luego de crear la encuesta podrás estructurar las preguntas y asignar los responsables por departamento."
            />
          </div>

          <div className="mt-8 flex gap-3">
            <Button
              onClick={() => router.back()}
              variant="secondary"
              fullWidth
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              loading={loading}
              variant="primary"
              fullWidth
            >
              Crear Encuesta
            </Button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
