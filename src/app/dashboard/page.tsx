"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Loading";
import { Alert } from "@/components/Alert";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Line,
} from "recharts";

interface Survey {
  id: string;
  title: string;
  description?: string;
  status: string;
  isPublished: boolean;
  createdAt: string;
  _count: { questions: number; responses: number };
  metadata: {
    totalResponses: number;
    completedResponses: number;
    completionRate: number;
  };
}

interface Analytics {
  satisfactionBySurvey: {
    id: string;
    title: string;
    avgRating: number;
    totalResponses: number;
    completedResponses: number;
  }[];
  nps: { promoters: number; passives: number; detractors: number; score: number };
  timeline: { date: string; responses: number }[];
  statusCounts: { DRAFT: number; PUBLISHED: number; ARCHIVED: number; CLOSED: number };
  questionTypeDist: { type: string; count: number }[];
}

const STATUS_MAP: Record<string, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivada",
  CLOSED: "Cerrada",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#94a3b8",
  PUBLISHED: "#22c55e",
  ARCHIVED: "#f59e0b",
  CLOSED: "#ef4444",
};

function AnimatedCounter({ value, suffix = "" }: { value: number | string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const target = typeof value === "string" ? parseFloat(value) : value;

  useEffect(() => {
    if (isNaN(target)) { setDisplay(0); return; }
    const duration = 900;
    const startTime = performance.now();
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target * 10) / 10);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target]);

  return <span>{display}{suffix}</span>;
}

function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-slate-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur-sm border border-white/10">
      {label && <p className="text-xs font-medium text-slate-300 mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
          {formatter ? formatter(entry.value) : entry.value}
          <span className="text-xs font-normal text-slate-400">{entry.name}</span>
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "draft" | "published" | "closed">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/surveys?${new URLSearchParams(filter !== "all" ? { status: filter.toUpperCase() } : {})}`).then((r) => r.json()),
      fetch("/api/analytics").then((r) => r.json()),
    ])
      .then(([surveyData, analyticsData]) => {
        setSurveys(surveyData?.surveys || []);
        setAnalytics(analyticsData?.satisfactionBySurvey ? analyticsData : null);
      })
      .catch(() => {
        setSurveys([]);
        setAnalytics(null);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    if (search) {
      fetch(`/api/surveys?search=${encodeURIComponent(search)}`)
        .then((r) => r.json())
        .then((d) => setSurveys(d.surveys || []));
    }
  }, [search]);

  const stats = {
    totalSurveys: surveys.length,
    activeSurveys: surveys.filter((s) => s.status === "PUBLISHED").length,
    totalResponses: surveys.reduce((sum, s) => sum + (s.metadata?.totalResponses ?? 0), 0),
    avgCompletion: surveys.length > 0
      ? (surveys.reduce((sum, s) => sum + (s.metadata?.completionRate ?? 0), 0) / surveys.length).toFixed(1)
      : "0",
  };

  const statusData = analytics?.statusCounts
    ? Object.entries(analytics.statusCounts)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name: STATUS_MAP[name] || name, value, color: STATUS_COLORS[name] || "#94a3b8" }))
    : [];

  const satisfactionData = analytics?.satisfactionBySurvey.filter((s) => s.totalResponses > 0) ?? [];

  const radarData = satisfactionData.map((s) => ({
    subject: s.title.substring(0, 8),
    satisfaccion: s.avgRating * 20,
    respuestas: Math.min(s.totalResponses * 5, 100),
  }));

  const FILTER_LABELS: Record<string, string> = {
    all: "Todas",
    draft: "Borrador",
    published: "Publicada",
    closed: "Cerrada",
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-8 px-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Resumen general de tus encuestas</p>
          </div>
          <Link href="/survey/new">
            <Button>+ Nueva Encuesta</Button>
          </Link>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Encuestas", value: stats.totalSurveys, accent: "from-blue-500 to-indigo-600", ring: "ring-blue-500/20", iconBg: "bg-blue-500/10" },
            { label: "Publicadas", value: stats.activeSurveys, accent: "from-emerald-400 to-teal-500", ring: "ring-emerald-500/20", iconBg: "bg-emerald-500/10" },
            { label: "Respuestas", value: stats.totalResponses, accent: "from-violet-500 to-purple-600", ring: "ring-violet-500/20", iconBg: "bg-violet-500/10" },
            { label: "Finalización", value: stats.avgCompletion, suffix: "%", accent: "from-amber-400 to-orange-500", ring: "ring-amber-500/20", iconBg: "bg-amber-500/10" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
              className={`relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ${stat.ring} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}
            >
              <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${stat.accent} opacity-[0.08] blur-sm`} />
              <div className={`absolute -right-2 -bottom-8 h-20 w-20 rounded-full bg-gradient-to-br ${stat.accent} opacity-[0.05]`} />
              <div className={`inline-flex rounded-lg ${stat.iconBg} p-2 mb-3`}>
                <div className={`h-2 w-8 rounded-full bg-gradient-to-r ${stat.accent}`} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
              <p className="mt-1 text-3xl font-extrabold text-slate-900 tabular-nums">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </p>
            </motion.div>
          ))}
        </div>

        {/* Charts Row 1 */}
        {analytics && (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Satisfaction Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Satisfacción por Encuesta</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Promedio de calificación por encuesta</p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400">
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Alta</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Media</span>
                  <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />Baja</span>
                </div>
              </div>
              {satisfactionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={satisfactionData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                        <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="barAmber" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="barRed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                      </linearGradient>
                      <filter id="barShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="title" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip formatter={(v: number) => `${v} ★`} />} cursor={{ fill: "rgba(99,102,241,0.04)", radius: 8 }} />
                    <Bar dataKey="avgRating" radius={[8, 8, 0, 0]} maxBarSize={52} filter="url(#barShadow)">
                      {satisfactionData.map((entry) => (
                        <Cell
                          key={entry.id}
                          fill={entry.avgRating >= 4 ? "url(#barGreen)" : entry.avgRating >= 3 ? "url(#barAmber)" : "url(#barRed)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center py-16">Sin datos de satisfacción aún</p>
              )}
            </motion.div>

            {/* Status Donut */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 flex flex-col"
            >
              <div className="mb-2">
                <h2 className="text-sm font-bold text-slate-900">Estado de Encuestas</h2>
                <p className="text-xs text-slate-400 mt-0.5">Distribución por estado</p>
              </div>
              {statusData.length > 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="relative">
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={88}
                          paddingAngle={4}
                          dataKey="value"
                          strokeWidth={0}
                          animationBegin={200}
                          animationDuration={1000}
                        >
                          {statusData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.1))" }} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold text-slate-900">{stats.totalSurveys}</span>
                      <span className="text-[10px] font-medium text-slate-400 uppercase">Total</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
                    {statusData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name} ({entry.value})
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-12">Sin encuestas</p>
              )}
            </motion.div>
          </div>
        )}

        {/* Charts Row 2 */}
        {analytics && (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Response Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Respuestas Recientes</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Actividad de los últimos 7 días</p>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  {analytics.timeline.reduce((s, t) => s + t.responses, 0)} esta semana
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={analytics.timeline} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaTop" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                      <stop offset="50%" stopColor="#818cf8" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => `${v} respuestas`} />} cursor={{ stroke: "#818cf8", strokeWidth: 1, strokeDasharray: "4 4" }} />
                  <Area
                    type="monotone"
                    dataKey="responses"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#areaTop)"
                    dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 7, fill: "#6366f1", stroke: "#fff", strokeWidth: 3 }}
                    animationDuration={1200}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Completion Rate per Survey */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5"
            >
              <div className="self-start mb-4">
                <h2 className="text-sm font-bold text-slate-900">Tasa de Finalización</h2>
                <p className="text-xs text-slate-400 mt-0.5">Porcentaje de respuestas completadas</p>
              </div>
              {satisfactionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={satisfactionData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="completionGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="title" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip content={<CustomTooltip formatter={(v: number) => `${v.toFixed(1)}% completado`} />} cursor={{ fill: "rgba(99,102,241,0.04)" }} />
                    <Bar dataKey="completedResponses" radius={[0, 6, 6, 0]} maxBarSize={18} fill="url(#completionGrad)" animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400 text-center py-12">Sin datos aún</p>
              )}
            </motion.div>
          </div>
        )}

        {/* Third Row — Radar + Question Types */}
        {analytics && radarData.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Radar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5"
            >
              <h2 className="text-sm font-bold text-slate-900 mb-1">Vista Comparativa</h2>
              <p className="text-xs text-slate-400 mb-4">Satisfacción vs Respuestas por encuesta</p>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} outerRadius={90}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                  <Radar name="Satisfacción" dataKey="satisfaccion" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} animationDuration={1000} />
                  <Radar name="Respuestas" dataKey="respuestas" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} animationDuration={1200} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => `${v}%`} />} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-5 mt-2">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Satisfacción
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Respuestas
                </span>
              </div>
            </motion.div>

            {/* Question Type Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5"
            >
              <h2 className="text-sm font-bold text-slate-900 mb-1">Tipos de Preguntas</h2>
              <p className="text-xs text-slate-400 mb-5">Distribución por tipo de pregunta usada</p>
              <div className="space-y-3">
                {analytics.questionTypeDist
                  .sort((a, b) => b.count - a.count)
                  .map((qt, i) => {
                    const max = Math.max(...analytics.questionTypeDist.map((q) => q.count));
                    const pct = max > 0 ? (qt.count / max) * 100 : 0;
                    const TYPE_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f5f3ff"];
                    const TYPE_LABELS: Record<string, string> = {
                      TEXT: "Texto",
                      TEXTAREA: "Texto largo",
                      RATING: "Calificación",
                      MULTIPLE_CHOICE: "Selección múltiple",
                      CHECKBOX: "Casillas",
                      DROPDOWN: "Desplegable",
                      SCALE: "Escala",
                      NET_PROMOTER_SCORE: "NPS",
                      YES_NO: "Sí/No",
                      DATE: "Fecha",
                      EMAIL: "Email",
                      NUMBER: "Número",
                      PHONE: "Teléfono",
                      MATRIX: "Matriz",
                    };
                    return (
                      <div key={qt.type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-600">{TYPE_LABELS[qt.type] || qt.type}</span>
                          <span className="text-xs font-bold text-slate-900">{qt.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: TYPE_COLORS[i % TYPE_COLORS.length] }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.8 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            {(["all", "draft", "published", "closed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  filter === f
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
                    : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition"
          />
        </div>

        {/* Surveys List */}
        <div className="space-y-3">
          {loading ? (
            <Skeleton count={3} height="h-24" />
          ) : surveys.length === 0 ? (
            <Alert type="info" title="No hay encuestas" message="Crea tu primera encuesta para comenzar" />
          ) : (
            <AnimatePresence>
              {surveys.map((survey, i) => (
                <motion.div
                  key={survey.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 truncate">{survey.title}</h3>
                        <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          survey.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${survey.isPublished ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          {survey.isPublished ? "Activa" : "Borrador"}
                        </span>
                      </div>
                      {survey.description && (
                        <p className="text-sm text-slate-500 truncate">{survey.description}</p>
                      )}
                      <div className="mt-2 flex gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">📝 {survey._count.questions} preguntas</span>
                        <span className="flex items-center gap-1">💬 {survey.metadata?.totalResponses ?? 0} respuestas</span>
                        <span className="flex items-center gap-1">✓ {(survey.metadata?.completionRate ?? 0).toFixed(0)}% finalización</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Link href={`/survey/${survey.id}/edit`}>
                        <Button size="sm" variant="secondary">Editar</Button>
                      </Link>
                      <Link href={`/survey/${survey.id}/settings`}>
                        <Button size="sm" variant="secondary">Compartir</Button>
                      </Link>
                      <Link href={`/survey/${survey.id}/results`}>
                        <Button size="sm" variant="secondary">Resultados</Button>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </main>
  );
}
