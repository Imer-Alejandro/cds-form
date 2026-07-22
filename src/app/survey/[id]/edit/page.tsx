"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import { LoadingSpinner } from "@/components/Loading";
import { Modal } from "@/components/Modal";
import { Alert, showToast } from "@/components/Alert";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Question {
  id: string;
  title: string;
  description?: string;
  type: string;
  required: boolean;
  order: number;
  options?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  minLabel?: string | null;
  maxLabel?: string | null;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  status: string;
  isPublished: boolean;
  questions: Question[];
}

const questionTypes = [
  { value: "SHORT_TEXT", label: "Texto Corto", icon: "📝", hasOptions: false },
  { value: "LONG_TEXT", label: "Texto Largo", icon: "📄", hasOptions: false },
  { value: "MULTIPLE_CHOICE", label: "Opción Múltiple", icon: "⭕", hasOptions: true },
  { value: "CHECKBOX", label: "Casillas", icon: "☑️", hasOptions: true },
  { value: "RATING", label: "Calificación", icon: "⭐", hasOptions: false },
  { value: "SCALE", label: "Escala", icon: "📊", hasOptions: false },
  { value: "DATE", label: "Fecha", icon: "📅", hasOptions: false },
  { value: "EMAIL", label: "Email", icon: "📧", hasOptions: false },
  { value: "NET_PROMOTER_SCORE", label: "NPS", icon: "💯", hasOptions: false },
];

const emptyQuestion = {
  title: "",
  type: "SHORT_TEXT",
  required: true,
  description: "",
  options: [] as string[],
  minValue: "",
  maxValue: "",
  minLabel: "",
  maxLabel: "",
};

function SortableQuestion({
  question,
  index,
  onEdit,
  onDelete,
  deleting,
}: {
  question: Question;
  index: number;
  onEdit: (q: Question) => void;
  onDelete: (id: string) => void;
  deleting: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const opts = (() => {
    if (!question.options) return [];
    try {
      const parsed = JSON.parse(question.options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  const typeInfo = questionTypes.find((t) => t.value === question.type);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className={`rounded-lg border bg-white p-6 transition shadow-sm ${
        isDragging ? "border-blue-400 shadow-lg ring-2 ring-blue-500/20" : "border-slate-200 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition shrink-0 touch-none"
            title="Arrastrar para reordenar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{typeInfo?.icon}</span>
              <h3 className="text-lg font-semibold text-slate-900 truncate">
                {index + 1}. {question.title}
              </h3>
              {question.required && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded whitespace-nowrap">Requerida</span>
              )}
            </div>
            {question.description && (
              <p className="mt-2 text-sm text-slate-600">{question.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500">
              <span className="bg-slate-100 px-2 py-0.5 rounded">{typeInfo?.label}</span>
              {opts.length > 0 && (
                <span className="text-slate-400">· {opts.length} opciones: {opts.slice(0, 3).join(", ")}{opts.length > 3 ? "..." : ""}</span>
              )}
              {question.minValue != null && question.maxValue != null && (
                <span className="text-slate-400">· {question.minValue}–{question.maxValue}{question.minLabel ? ` (${question.minLabel})` : ""}{question.maxLabel ? ` → (${question.maxLabel})` : ""}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 ml-4 shrink-0">
          <Button size="sm" variant="secondary" onClick={() => onEdit(question)}>Editar</Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(question.id)} loading={deleting === question.id}>Eliminar</Button>
        </div>
      </div>
    </motion.div>
  );
}

export default function SurveyEditorPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [form, setForm] = useState(emptyQuestion);
  const [newOption, setNewOption] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    fetchSurvey();
  }, [surveyId]);

  function parseOptions(q: Question): string[] {
    if (!q.options) return [];
    try {
      const parsed = JSON.parse(q.options);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

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

  function openAddModal() {
    setEditingQuestion(null);
    setForm({ ...emptyQuestion });
    setNewOption("");
    setShowModal(true);
  }

  function openEditModal(q: Question) {
    setEditingQuestion(q);
    setForm({
      title: q.title,
      type: q.type,
      required: q.required,
      description: q.description || "",
      options: parseOptions(q),
      minValue: q.minValue != null ? String(q.minValue) : "",
      maxValue: q.maxValue != null ? String(q.maxValue) : "",
      minLabel: q.minLabel || "",
      maxLabel: q.maxLabel || "",
    });
    setNewOption("");
    setShowModal(true);
  }

  function addOption() {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    if (form.options.includes(trimmed)) {
      showToast("La opción ya existe", "error");
      return;
    }
    setForm({ ...form, options: [...form.options, trimmed] });
    setNewOption("");
  }

  function removeOption(index: number) {
    setForm({ ...form, options: form.options.filter((_, i) => i !== index) });
  }

  async function handleSave() {
    if (!form.title.trim()) {
      showToast("El título de la pregunta es requerido", "error");
      return;
    }

    const needsOptions = questionTypes.find((t) => t.value === form.type)?.hasOptions;
    if (needsOptions && form.options.length < 2) {
      showToast("Agrega al menos 2 opciones", "error");
      return;
    }

    const payload: Record<string, any> = {
      title: form.title.trim(),
      type: form.type,
      required: form.required,
      description: form.description.trim() || null,
    };

    if (needsOptions) {
      payload.options = form.options;
    }
    if (form.type === "RATING" || form.type === "SCALE") {
      payload.minValue = form.minValue ? parseInt(form.minValue as string) : 1;
      payload.maxValue = form.maxValue ? parseInt(form.maxValue as string) : 5;
      payload.minLabel = form.minLabel || null;
      payload.maxLabel = form.maxLabel || null;
    }

    try {
      if (editingQuestion) {
        const qs = new URLSearchParams({ questionId: editingQuestion.id });
        const response = await fetch(`/api/surveys/${surveyId}/questions?${qs}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to update");
        showToast("Pregunta actualizada", "success");
      } else {
        const response = await fetch(`/api/surveys/${surveyId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Failed to create");
        showToast("Pregunta agregada", "success");
      }
      await fetchSurvey();
      setShowModal(false);
    } catch (error) {
      showToast("Error al guardar la pregunta", "error");
    }
  }

  async function handleDelete(questionId: string) {
    if (!confirm("¿Eliminar esta pregunta?")) return;
    setDeleting(questionId);
    try {
      const qs = new URLSearchParams({ questionId });
      const response = await fetch(`/api/surveys/${surveyId}/questions?${qs}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      showToast("Pregunta eliminada", "success");
      await fetchSurvey();
    } catch (error) {
      showToast("Error al eliminar la pregunta", "error");
    } finally {
      setDeleting(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !survey) return;

    const oldIndex = survey.questions.findIndex((q) => q.id === active.id);
    const newIndex = survey.questions.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(survey.questions, oldIndex, newIndex);
    setSurvey({ ...survey, questions: reordered });

    try {
      const response = await fetch(`/api/surveys/${surveyId}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((q) => q.id) }),
      });
      if (!response.ok) throw new Error("Failed to reorder");
    } catch (error) {
      showToast("Error al reordenar", "error");
      await fetchSurvey();
    }
  }

  async function handlePublish() {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !survey!.isPublished }),
      });
      if (!response.ok) throw new Error("Failed");
      await fetchSurvey();
      showToast(survey!.isPublished ? "Encuesta despublicada" : "Encuesta publicada", "success");
    } catch (error) {
      showToast("Error al cambiar estado", "error");
    }
  }

  if (loading) return <LoadingSpinner text="Cargando encuesta..." />;
  if (!survey) return null;

  const selectedType = questionTypes.find((t) => t.value === form.type);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-8 px-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    survey.isPublished
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${survey.isPublished ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {survey.isPublished ? "Publicada" : "Borrador"}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 truncate">{survey.title}</h1>
                {survey.description && (
                  <p className="mt-2 text-slate-500 line-clamp-2">{survey.description}</p>
                )}
                <div className="mt-3 flex items-center gap-4 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                    {survey.questions.length} {survey.questions.length === 1 ? "pregunta" : "preguntas"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex gap-2">
                  <Button variant={survey.isPublished ? "success" : "secondary"} onClick={handlePublish} disabled={survey.questions.length === 0}>
                    {survey.isPublished ? "✓ Publicada" : "Publicar"}
                  </Button>
                  <Link href={`/survey/${surveyId}/settings`}>
                    <Button variant="secondary">Compartir</Button>
                  </Link>
                </div>
                <div className="flex gap-2">
                  <Link href={`/survey/${surveyId}/results`}>
                    <Button variant="secondary" size="sm">Resultados</Button>
                  </Link>
                  <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard")}>Volver</Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Questions List */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={survey.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              <AnimatePresence>
                {survey.questions.map((question, index) => (
                  <SortableQuestion
                    key={question.id}
                    question={question}
                    index={index}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    deleting={deleting}
                  />
                ))}
              </AnimatePresence>
            </SortableContext>
          </DndContext>

          {survey.questions.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500">
              <p className="text-lg">Aún no hay preguntas</p>
              <p className="mt-1 text-sm">Agrega la primera pregunta para comenzar</p>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openAddModal}
            className="w-full rounded-lg border-2 border-dashed border-slate-300 p-6 text-slate-600 hover:border-blue-500 hover:text-blue-600 transition"
          >
            + Agregar Pregunta
          </motion.button>
        </motion.div>
      </div>

      {/* Question Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingQuestion ? "Editar Pregunta" : "Nueva Pregunta"}>
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-900">Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: ¿Cómo fue tu experiencia?"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-900">Descripción</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Instrucción opcional..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Tipo de pregunta</label>
            <div className="grid grid-cols-3 gap-2">
              {questionTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setForm({ ...form, type: type.value })}
                  className={`p-3 rounded-lg border text-left text-sm transition ${
                    form.type === type.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <span className="mr-1">{type.icon}</span> {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options Editor for MULTIPLE_CHOICE / CHECKBOX */}
          {selectedType?.hasOptions && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <label className="block text-sm font-medium text-slate-900 mb-2">Opciones</label>
              {form.options.length > 0 && (
                <div className="space-y-2 mb-3">
                  {form.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2">
                      <span className="text-sm text-slate-400 w-5">{i + 1}.</span>
                      <span className="flex-1 text-sm text-slate-900">{opt}</span>
                      <button onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600 text-sm font-medium">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                  placeholder="Escribir opción..."
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <Button size="sm" onClick={addOption}>+ Agregar</Button>
              </div>
            </div>
          )}

          {/* Rating / Scale Options */}
          {(form.type === "RATING" || form.type === "SCALE") && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-900">Mínimo</label>
                  <input
                    type="number"
                    value={form.minValue}
                    onChange={(e) => setForm({ ...form, minValue: e.target.value })}
                    placeholder="1"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900">Máximo</label>
                  <input
                    type="number"
                    value={form.maxValue}
                    onChange={(e) => setForm({ ...form, maxValue: e.target.value })}
                    placeholder="5"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-900">Label mínimo</label>
                  <input
                    type="text"
                    value={form.minLabel}
                    onChange={(e) => setForm({ ...form, minLabel: e.target.value })}
                    placeholder="Ej: Muy mal"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900">Label máximo</label>
                  <input
                    type="text"
                    value={form.maxLabel}
                    onChange={(e) => setForm({ ...form, maxLabel: e.target.value })}
                    placeholder="Ej: Excelente"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Required Toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <button
              onClick={() => setForm({ ...form, required: !form.required })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.required ? "bg-blue-600" : "bg-slate-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.required ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm font-medium text-slate-900">Pregunta requerida</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-200">
            <Button variant="secondary" fullWidth onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button fullWidth onClick={handleSave}>
              {editingQuestion ? "Guardar Cambios" : "Agregar Pregunta"}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
