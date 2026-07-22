"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { LoadingSpinner } from "@/components/Loading";
import { showToast } from "@/components/Alert";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import * as XLSX from "xlsx";

interface Question {
  id: string;
  title: string;
  description?: string;
  type: string;
  required: boolean;
  order: number;
  options?: string;
  minValue?: number;
  maxValue?: number;
  minLabel?: string;
  maxLabel?: string;
}

interface Answer {
  id: string;
  questionId: string;
  value: string | null;
  selectedOptions: string | null;
  question: { id: string; title: string; type: string };
}

interface Response {
  id: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  respondentEmail: string | null;
  respondentName: string | null;
  answers: Answer[];
}

interface SurveyResult {
  id: string;
  title: string;
  description?: string;
  metadata: {
    totalResponses: number;
    completedResponses: number;
    abandonedResponses: number;
    completionRate: number;
  };
  questions: Question[];
}

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

function parseOptions(q: Question): string[] {
  if (!q.options) return [];
  try {
    const p = JSON.parse(q.options);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function getQuestionAnalysis(question: Question, responses: Response[]) {
  const answers = responses
    .flatMap((r) => r.answers)
    .filter((a) => a.questionId === question.id);

  const type = question.type;

  if (type === "MULTIPLE_CHOICE" || type === "CHECKBOX") {
    const opts = parseOptions(question);
    const distribution: Record<string, number> = {};
    opts.forEach((o) => (distribution[o] = 0));

    for (const ans of answers) {
      if (type === "CHECKBOX" && ans.selectedOptions) {
        try {
          const selected = JSON.parse(ans.selectedOptions);
          if (Array.isArray(selected)) {
            selected.forEach((v: string) => {
              distribution[v] = (distribution[v] || 0) + 1;
            });
          }
        } catch {}
      } else if (ans.value) {
        distribution[ans.value] = (distribution[ans.value] || 0) + 1;
      }
    }

    return {
      chartData: Object.entries(distribution).map(([name, value]) => ({ name, value })),
      total: answers.length,
    };
  }

  if (type === "RATING") {
    const max = question.maxValue || 5;
    const dist: Record<number, number> = {};
    for (let i = 1; i <= max; i++) dist[i] = 0;

    let sum = 0;
    let count = 0;
    for (const ans of answers) {
      if (ans.value) {
        const num = parseInt(ans.value);
        if (!isNaN(num) && num >= 1 && num <= max) {
          dist[num]++;
          sum += num;
          count++;
        }
      }
    }

    return {
      chartData: Object.entries(dist).map(([name, value]) => ({
        name: `${name} ★`,
        value,
        rating: Number(name),
      })),
      average: count > 0 ? (sum / count).toFixed(1) : "0",
      total: count,
    };
  }

  if (type === "SCALE") {
    const min = question.minValue || 0;
    const max = question.maxValue || 10;
    const dist: Record<number, number> = {};
    for (let i = min; i <= max; i++) dist[i] = 0;

    let sum = 0;
    let count = 0;
    for (const ans of answers) {
      if (ans.value) {
        const num = parseInt(ans.value);
        if (!isNaN(num)) {
          dist[num] = (dist[num] || 0) + 1;
          sum += num;
          count++;
        }
      }
    }

    return {
      chartData: Object.entries(dist).map(([name, value]) => ({ name, value })),
      average: count > 0 ? (sum / count).toFixed(1) : "0",
      total: count,
    };
  }

  if (type === "NET_PROMOTER_SCORE") {
    let promoters = 0, passives = 0, detractors = 0;
    for (const ans of answers) {
      if (ans.value) {
        const score = parseInt(ans.value);
        if (!isNaN(score)) {
          if (score <= 6) detractors++;
          else if (score <= 8) passives++;
          else promoters++;
        }
      }
    }
    const total = promoters + passives + detractors;
    const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    return {
      chartData: [
        { name: "Detractores (0-6)", value: detractors, fill: "#ef4444" },
        { name: "Pasivos (7-8)", value: passives, fill: "#f59e0b" },
        { name: "Promotores (9-10)", value: promoters, fill: "#22c55e" },
      ],
      npsScore,
      total,
    };
  }

  if (type === "SHORT_TEXT" || type === "LONG_TEXT" || type === "EMAIL") {
    const textAnswers = answers
      .map((a) => a.value)
      .filter((v): v is string => !!v && v.trim().length > 0);

    const wordFreq: Record<string, number> = {};
    textAnswers.forEach((v) => {
      const words = v.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      words.forEach((w) => (wordFreq[w] = (wordFreq[w] || 0) + 1));
    });

    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    return { textAnswers, topWords, total: textAnswers.length };
  }

  return { total: answers.length };
}

export default function SurveyResultsPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<SurveyResult | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"charts" | "responses">("charts");

  useEffect(() => {
    fetchSurveyData();
  }, [surveyId]);

  async function fetchSurveyData() {
    try {
      const [surveyRes, responsesRes] = await Promise.all([
        fetch(`/api/surveys/${surveyId}`),
        fetch(`/api/responses?surveyId=${surveyId}&limit=200`),
      ]);

      if (!surveyRes.ok) throw new Error("Survey not found");

      const surveyData = await surveyRes.json();
      const responsesData = await responsesRes.json();

      setSurvey(surveyData);
      setResponses(responsesData.responses || []);
    } catch (error) {
      showToast("Error al cargar los resultados", "error");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  function exportToExcel() {
    if (!survey || responses.length === 0) return;

    const rows = responses.map((resp) => {
      const row: Record<string, string> = {
        "ID": resp.id.substring(0, 8),
        "Estado": resp.status === "COMPLETED" ? "Completada" : resp.status,
        "Fecha": resp.completedAt
          ? new Date(resp.completedAt).toLocaleDateString("es-ES")
          : new Date(resp.createdAt).toLocaleDateString("es-ES"),
        "Email": resp.respondentEmail || "",
        "Nombre": resp.respondentName || "",
      };

      for (const q of survey.questions) {
        const ans = resp.answers.find((a) => a.questionId === q.id);
        if (q.type === "CHECKBOX" && ans?.selectedOptions) {
          try {
            row[q.title] = JSON.parse(ans.selectedOptions).join(", ");
          } catch {
            row[q.title] = ans?.value || "";
          }
        } else {
          row[q.title] = ans?.value || "";
        }
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    const colWidths = Object.keys(rows[0] || {}).map((key) => ({
      wch: Math.max(key.length + 2, ...rows.map((r) => String(r[key] || "").length + 2)),
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Respuestas");
    XLSX.writeFile(wb, `${survey.title.replace(/[^a-zA-Z0-9]/g, "_")}_respuestas.xlsx`);
    showToast("Archivo Excel descargado", "success");
  }

  if (loading) return <LoadingSpinner text="Cargando resultados..." />;
  if (!survey) return null;

  const totalResp = survey.metadata.totalResponses;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-8 px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{survey.title}</h1>
            <p className="mt-1 text-sm text-slate-500">Resultados y análisis de respuestas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportToExcel} disabled={responses.length === 0}>
              📊 Exportar Excel
            </Button>
            <Button variant="secondary" onClick={() => router.back()}>Volver</Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Respuestas", value: totalResp, accent: "from-blue-500 to-indigo-600" },
            { label: "Completadas", value: survey.metadata.completedResponses, accent: "from-emerald-400 to-teal-500" },
            { label: "Abandonadas", value: survey.metadata.abandonedResponses, accent: "from-red-400 to-rose-500" },
            { label: "Finalización", value: `${survey.metadata.completionRate.toFixed(1)}%`, accent: "from-violet-500 to-purple-600" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5"
            >
              <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${stat.accent} opacity-[0.08] blur-sm`} />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
              <p className="mt-1 text-3xl font-extrabold text-slate-900 tabular-nums">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {[
            { key: "charts" as const, label: "Análisis por Pregunta" },
            { key: "responses" as const, label: `Respuestas Individuales (${responses.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition -mb-px ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Charts Tab */}
        {activeTab === "charts" && (
          <div className="space-y-6">
            {survey.questions.map((question, i) => {
              const analysis = getQuestionAnalysis(question, responses);
              const hasData = analysis.total > 0;

              return (
                <motion.div
                  key={question.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
                          {i + 1}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">{question.title}</h3>
                      </div>
                      {question.description && (
                        <p className="mt-1 ml-9 text-xs text-slate-400">{question.description}</p>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
                      {analysis.total} {analysis.total === 1 ? "respuesta" : "respuestas"}
                    </span>
                  </div>

                  {!hasData ? (
                    <p className="text-sm text-slate-400 text-center py-8">Sin respuestas para esta pregunta</p>
                  ) : (
                    <>
                      {/* MULTIPLE_CHOICE / CHECKBOX */}
                      {(question.type === "MULTIPLE_CHOICE" || question.type === "CHECKBOX") && analysis.chartData && (
                        <div className="grid gap-6 lg:grid-cols-2 items-center">
                          <ResponsiveContainer width="100%" height={Math.max(200, analysis.chartData.length * 40)}>
                            <BarChart data={analysis.chartData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={120} />
                              <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
                              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                {analysis.chartData.map((_, idx) => (
                                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                          <div className="space-y-2">
                            {analysis.chartData.map((item, idx) => {
                              const pct = analysis.total > 0 ? ((item.value / analysis.total) * 100).toFixed(1) : 0;
                              return (
                                <div key={idx} className="flex items-center gap-3">
                                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                  <span className="text-sm text-slate-600 flex-1 truncate">{item.name}</span>
                                  <span className="text-sm font-bold text-slate-900 tabular-nums">{item.value}</span>
                                  <span className="text-xs text-slate-400 w-12 text-right">{pct}%</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* RATING */}
                      {question.type === "RATING" && analysis.chartData && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <span className="text-5xl font-extrabold text-amber-500">{(analysis as any).average ?? "0"}</span>
                            <div>
                              <div className="flex gap-0.5">
                                {Array.from({ length: question.maxValue || 5 }).map((_, s) => (
                                  <span key={s} className={`text-2xl $                                {s < Math.round(parseFloat((analysis as any).average ?? "0")) ? "text-amber-400" : "text-slate-200"}`}>★</span>
                                ))}
                              </div>
                              <p className="text-xs text-slate-400 mt-1">Promedio de {analysis.total} respuestas</p>
                            </div>
                          </div>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={analysis.chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                {analysis.chartData.map((entry: any) => (
                                  <Cell key={entry.name} fill={entry.rating >= 4 ? "#22c55e" : entry.rating >= 3 ? "#f59e0b" : "#ef4444"} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* SCALE */}
                      {question.type === "SCALE" && analysis.chartData && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <span className="text-4xl font-extrabold text-indigo-600">{(analysis as any).average ?? "0"}</span>
                            <p className="text-xs text-slate-400">Promedio de {analysis.total} respuestas ({question.minValue || 0}–{question.maxValue || 10})</p>
                          </div>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={analysis.chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                              <defs>
                                <linearGradient id="scaleGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
                              <Bar dataKey="value" fill="url(#scaleGrad)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* NPS */}
                      {question.type === "NET_PROMOTER_SCORE" && analysis.chartData && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <span className={`text-5xl font-extrabold ${
                              (analysis as any).npsScore >= 50 ? "text-emerald-500" : (analysis as any).npsScore >= 0 ? "text-amber-500" : "text-red-500"
                            }`}>
                              {(analysis as any).npsScore}
                            </span>
                            <p className="text-xs text-slate-400">NPS Score ({analysis.total} respuestas)</p>
                          </div>
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={analysis.chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 13 }} />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                {analysis.chartData.map((entry: any, idx) => (
                                  <Cell key={idx} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* TEXT / EMAIL */}
                      {(question.type === "SHORT_TEXT" || question.type === "LONG_TEXT" || question.type === "EMAIL") && (analysis as any).textAnswers && (
                        <div className="space-y-4">
                          {(analysis as any).topWords.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-2">Palabras más frecuentes</p>
                              <div className="flex flex-wrap gap-2">
                                {(analysis as any).topWords.map((w: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                                    style={{ fontSize: `${Math.min(14, 10 + w.value)}px` }}
                                  >
                                    {w.name} ({w.value})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-2">Respuestas</p>
                            <div className="space-y-1.5 max-h-60 overflow-y-auto">
                              {(analysis as any).textAnswers.map((text: string, idx: number) => (
                                <div key={idx} className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                                  {text}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* DATE */}
                      {question.type === "DATE" && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-500 mb-2">Fechas seleccionadas</p>
                          <div className="space-y-1.5 max-h-60 overflow-y-auto">
                            {responses
                              .map((r) => r.answers.find((a) => a.questionId === question.id)?.value)
                              .filter((v): v is string => !!v)
                              .sort()
                              .map((date, idx) => (
                                <div key={idx} className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                                  📅 {date}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Responses Accordion Tab */}
        {activeTab === "responses" && (
          <div className="space-y-3">
            {responses.length === 0 ? (
              <div className="rounded-2xl bg-white p-12 text-center text-slate-400 shadow-sm ring-1 ring-slate-900/5">
                <p className="text-lg font-medium">Sin respuestas aún</p>
                <p className="text-sm mt-1">Comparte la encuesta para recibir respuestas</p>
              </div>
            ) : (
              responses.map((resp, i) => {
                const isOpen = openAccordion === resp.id;
                return (
                  <motion.div
                    key={resp.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenAccordion(isOpen ? null : resp.id)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          resp.status === "COMPLETED" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {resp.respondentName || resp.respondentEmail || `Respuesta #${i + 1}`}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(resp.completedAt || resp.createdAt).toLocaleDateString("es-ES", {
                              day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                            {" · "}{resp.answers.length} respuestas
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 space-y-3 border-t border-slate-100">
                            {survey.questions.map((q) => {
                              const ans = resp.answers.find((a) => a.questionId === q.id);
                              let displayValue = "—";

                              if (q.type === "CHECKBOX" && ans?.selectedOptions) {
                                try {
                                  const parsed = JSON.parse(ans.selectedOptions);
                                  displayValue = Array.isArray(parsed) ? parsed.join(", ") : ans.value || "—";
                                } catch {
                                  displayValue = ans?.value || "—";
                                }
                              } else if (ans?.value) {
                                displayValue = ans.value;
                              }

                              return (
                                <div key={q.id} className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
                                  <span className="text-xs font-medium text-slate-400 w-48 shrink-0 pt-0.5">{q.title}</span>
                                  <span className="text-sm text-slate-700 font-medium">{displayValue}</span>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>
    </main>
  );
}
