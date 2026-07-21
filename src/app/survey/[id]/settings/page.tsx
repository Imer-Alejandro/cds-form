"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { LoadingSpinner } from "@/components/Loading";
import { Alert, showToast } from "@/components/Alert";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

interface DepartmentConfig {
  id: string;
  department: string;
  responsible: { name: string; email: string };
  sendSummary: boolean;
  summaryFrequency: string;
  sendOnCompletion: boolean;
}

interface Survey {
  id: string;
  title: string;
  isPublished: boolean;
  departmentConfigs: DepartmentConfig[];
}

export default function SurveySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [newDepartment, setNewDepartment] = useState({
    department: "",
    responsibleEmail: "",
    sendSummary: true,
    summaryFrequency: "DAILY",
  });
  const qrRef = useRef<HTMLDivElement>(null);

  function downloadQR() {
    const container = qrRef.current;
    if (!container) return;
    const svg = container.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement("a");
      link.download = `qr-${survey?.title || "encuesta"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }

  useEffect(() => {
    fetchSurvey();
  }, [surveyId]);

  async function fetchSurvey() {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`);
      if (!response.ok) throw new Error("Survey not found");
      const data = await response.json();
      setSurvey(data);
    } catch (error) {
      showToast("Error al cargar la encuesta", "error");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDepartment() {
    if (!newDepartment.department || !newDepartment.responsibleEmail) {
      showToast("Por favor completa todos los campos", "error");
      return;
    }

    try {
      const response = await fetch(`/api/surveys/${surveyId}/department-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDepartment),
      });

      if (!response.ok) throw new Error("Failed to add department");

      showToast("Departamento configurado", "success");
      setNewDepartment({
        department: "",
        responsibleEmail: "",
        sendSummary: true,
        summaryFrequency: "DAILY",
      });
      setShowDepartmentModal(false);
      await fetchSurvey();
    } catch (error) {
      showToast("Error al configurar departamento", "error");
    }
  }

  async function handleSendInvitations(emails: string[]) {
    try {
      const response = await fetch("/api/email/send-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId,
          emails,
        }),
      });

      const data = await response.json();
      showToast(
        `✓ ${data.successCount} invitaciones enviadas, ${data.failureCount} errores`,
        "success"
      );
      setShowShareModal(false);
    } catch (error) {
      showToast("Error al enviar invitaciones", "error");
    }
  }

  if (loading) return <LoadingSpinner text="Cargando configuración..." />;
  if (!survey) return null;

  const surveyUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/survey/${surveyId}`;

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900">Configuración</h1>
          <p className="mt-2 text-slate-600">
            {survey.title}
          </p>
        </motion.div>

        {/* Share Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-lg border border-slate-200 bg-white p-6"
        >
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Compartir Encuesta
          </h2>
          
          {!survey.isPublished && (
            <Alert
              type="warning"
              title="Encuesta no publicada"
              message="Debes publicar la encuesta antes de compartirla"
            />
          )}

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Enlace directo
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={surveyUrl}
                  readOnly
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 bg-slate-50"
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(surveyUrl);
                    showToast("Enlace copiado", "success");
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Código QR
              </label>
              <div ref={qrRef} className="flex justify-center p-4 border border-slate-200 rounded-lg bg-white">
                <QRCodeSVG value={surveyUrl} size={200} />
              </div>
              <Button fullWidth variant="secondary" className="mt-2" onClick={downloadQR}>
                Descargar QR (PNG)
              </Button>
            </div>

            <Button
              fullWidth
              onClick={() => setShowShareModal(true)}
              disabled={!survey.isPublished}
            >
              Enviar Invitaciones por Email
            </Button>
          </div>
        </motion.div>

        {/* Department Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg border border-slate-200 bg-white p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Configuración de Departamentos
            </h2>
            <Button onClick={() => setShowDepartmentModal(true)} size="sm">
              + Agregar
            </Button>
          </div>

          <div className="space-y-4">
            {survey.departmentConfigs.length === 0 ? (
              <Alert
                type="info"
                title="Sin departamentos configurados"
                message="Agrega departamentos para enviar reportes automáticos"
              />
            ) : (
              survey.departmentConfigs.map((config) => (
                <motion.div
                  key={config.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border border-slate-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {config.department}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Responsable: {config.responsible.name} ({config.responsible.email})
                      </p>
                      <div className="mt-2 flex gap-4 text-sm text-slate-600">
                        {config.sendSummary && (
                          <span>📧 Reportes: {config.summaryFrequency}</span>
                        )}
                        {config.sendOnCompletion && (
                          <span>✓ Notificación al completar</span>
                        )}
                      </div>
                    </div>
                    <Button variant="danger" size="sm">
                      Eliminar
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Back Button */}
        <div className="mt-8">
          <Button onClick={() => router.back()} variant="secondary">
            Volver
          </Button>
        </div>
      </div>

      {/* Add Department Modal */}
      <Modal
        isOpen={showDepartmentModal}
        onClose={() => setShowDepartmentModal(false)}
        title="Configurar Departamento"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Nombre del Departamento
            </label>
            <input
              type="text"
              value={newDepartment.department}
              onChange={(e) =>
                setNewDepartment({ ...newDepartment, department: e.target.value })
              }
              placeholder="Ej: Recursos Humanos"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Email del Responsable
            </label>
            <input
              type="email"
              value={newDepartment.responsibleEmail}
              onChange={(e) =>
                setNewDepartment({
                  ...newDepartment,
                  responsibleEmail: e.target.value,
                })
              }
              placeholder="responsable@company.com"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendSummary"
              checked={newDepartment.sendSummary}
              onChange={(e) =>
                setNewDepartment({ ...newDepartment, sendSummary: e.target.checked })
              }
            />
            <label htmlFor="sendSummary" className="text-sm text-slate-900">
              Enviar resumen de respuestas
            </label>
          </div>

          {newDepartment.sendSummary && (
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Frecuencia
              </label>
              <select
                value={newDepartment.summaryFrequency}
                onChange={(e) =>
                  setNewDepartment({
                    ...newDepartment,
                    summaryFrequency: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
              >
                <option value="IMMEDIATELY">Inmediato</option>
                <option value="DAILY">Diario</option>
                <option value="WEEKLY">Semanal</option>
                <option value="MONTHLY">Mensual</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowDepartmentModal(false)}
            >
              Cancelar
            </Button>
            <Button fullWidth onClick={handleAddDepartment}>
              Agregar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Enviar Invitaciones"
      >
        <div className="space-y-4">
          <textarea
            placeholder="correo1@company.com&#10;correo2@company.com&#10;correo3@company.com"
            rows={6}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            id="emails-input"
          />
          <p className="text-sm text-slate-600">
            Ingresa los emails separados por saltos de línea
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowShareModal(false)}
            >
              Cancelar
            </Button>
            <Button
              fullWidth
              onClick={() => {
                const textarea = document.getElementById(
                  "emails-input"
                ) as HTMLTextAreaElement;
                const emails = textarea.value
                  .split("\n")
                  .map((e) => e.trim())
                  .filter((e) => e);
                handleSendInvitations(emails);
              }}
            >
              Enviar
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
