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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-6">
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white p-8 shadow-2xl"
        >
          <h1 className="text-3xl font-bold text-slate-900">
            Crear Nueva Encuesta
          </h1>
          <p className="mt-2 text-slate-600">
            Comienza por definir el título y descripción de tu encuesta
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-900">
                Título *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Ej: Encuesta de satisfacción del cliente"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900">
                Descripción (Opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe el propósito de tu encuesta..."
                rows={4}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <Alert
              type="info"
              title="Tip"
              message="Después de crear la encuesta, podrás agregar preguntas y configurar opciones de distribución."
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
