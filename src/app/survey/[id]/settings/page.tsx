"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { LoadingSpinner } from "@/components/Loading";
import { Alert, showToast } from "@/components/Alert";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

interface Survey {
  id: string;
  title: string;
  isPublished: boolean;
}

export default function SurveySettingsPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [surveyUrl, setSurveyUrl] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
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

  useEffect(() => {
    setSurveyUrl(`${window.location.origin}/survey/${surveyId}`);
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

  return (
    <main className="min-h-screen bg-[#f5f5f5] py-8 px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Configuración de Encuesta</h1>
            <p className="mt-1 text-sm text-slate-500">
              {survey.title}
            </p>
          </div>
          <Button onClick={() => router.back()} variant="secondary" className="self-start">
            Volver
          </Button>
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

      </div>

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
