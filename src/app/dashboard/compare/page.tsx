"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
  Legend,
} from "recharts";

const TEAL = "#0d7377";
const ORANGE = "#e8722a";
const NPS_COLORS = ["#22c55e", "#eab308", "#ef4444"];

interface Survey {
  id: string;
  title: string;
  status: string;
  _count: { questions: number; responses: number };
}

interface QuestionAvg {
  questionId: string;
  title: string;
  type: string;
  avg: number;
  count: number;
}

interface AnalyticsData {
  satisfactionBySurvey: {
    id: string;
    title: string;
    avgRating: number;
    totalResponses: number;
    completedResponses: number;
  }[];
  nps: {
    promoters: number;
    passives: number;
    detractors: number;
    score: number;
  };
  departmentBreakdown: { department: string; count: number }[];
  questionTypeDist: { type: string; count: number }[];
  questionAverages: QuestionAvg[];
}

export default function ComparePage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveyA, setSurveyA] = useState("");
  const [surveyB, setSurveyB] = useState("");
  const [dataA, setDataA] = useState<AnalyticsData | null>(null);
  const [dataB, setDataB] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/surveys", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setSurveys(d.surveys || []));
  }, []);

  useEffect(() => {
    if (!surveyA || !surveyB || surveyA === surveyB) {
      setDataA(null);
      setDataB(null);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/analytics?surveyId=${surveyA}`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/analytics?surveyId=${surveyB}`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([a, b]) => {
        setDataA(a.error ? null : a);
        setDataB(b.error ? null : b);
      })
      .catch(() => { setDataA(null); setDataB(null); })
      .finally(() => setLoading(false));
  }, [surveyA, surveyB]);

  const isValid = surveyA && surveyB && surveyA !== surveyB && dataA && dataB;
  const satA = dataA?.satisfactionBySurvey?.[0];
  const satB = dataB?.satisfactionBySurvey?.[0];

  const satisfactionData = isValid && satA && satB
    ? [
        { name: "Satisfacción", A: satA.avgRating, B: satB.avgRating },
        { name: "Completadas", A: satA.completedResponses, B: satB.completedResponses },
        { name: "Total", A: satA.totalResponses, B: satB.totalResponses },
      ]
    : [];

  const npsPieA = dataA?.nps ? [
    { name: "Promotores", value: dataA.nps.promoters },
    { name: "Pasivos", value: dataA.nps.passives },
    { name: "Detractores", value: dataA.nps.detractors },
  ] : [];
  const npsPieB = dataB?.nps ? [
    { name: "Promotores", value: dataB.nps.promoters },
    { name: "Pasivos", value: dataB.nps.passives },
    { name: "Detractores", value: dataB.nps.detractors },
  ] : [];

  const deptA = dataA?.departmentBreakdown || [];
  const deptB = dataB?.departmentBreakdown || [];
  const allDepts = [...new Set([...deptA.map((d) => d.department), ...deptB.map((d) => d.department)])];
  const deptData = allDepts.map((dept) => ({
    department: dept,
    A: deptA.find((d) => d.department === dept)?.count || 0,
    B: deptB.find((d) => d.department === dept)?.count || 0,
  }));

  const qAvgA = dataA?.questionAverages || [];
  const qAvgB = dataB?.questionAverages || [];
  const matchingQuestions = qAvgA.filter((qA) =>
    qAvgB.some((qB) => qB.title === qA.title && (qA.type === "RATING" || qA.type === "NET_PROMOTER_SCORE"))
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm shadow-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard">
            <button className="text-slate-400 hover:text-slate-600 transition text-sm">← Volver al panel</button>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Comparar Encuestas</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Selectors */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-teal-700 uppercase tracking-wider mb-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#0d7377] mr-1" />
                Encuesta A
              </label>
              <select
                value={surveyA}
                onChange={(e) => setSurveyA(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0d7377]/20 focus:border-[#0d7377] transition"
              >
                <option value="">Seleccionar encuesta A...</option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
            <span className="text-slate-300 text-2xl font-light pb-1">vs</span>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-[#e8722a] uppercase tracking-wider mb-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#e8722a] mr-1" />
                Encuesta B
              </label>
              <select
                value={surveyB}
                onChange={(e) => setSurveyB(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#e8722a]/20 focus:border-[#e8722a] transition"
              >
                <option value="">Seleccionar encuesta B...</option>
                {surveys.filter((s) => s.id !== surveyA).map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!isValid && !loading && (
          <div className="text-center py-16 text-slate-400 text-sm">
            Selecciona dos encuestas diferentes para ver la comparación lado a lado
          </div>
        )}

        {loading && (
          <div className="text-center py-16 text-slate-400 text-sm">Cargando datos de comparación...</div>
        )}

        {isValid && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl p-6 shadow-sm ring-1 ring-slate-900/5 border-l-4 border-[#0d7377]"
                style={{ background: "linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-3 w-3 rounded-full bg-[#0d7377]" />
                  <h3 className="text-sm font-bold text-slate-900 truncate">{satA?.title || "—"}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Satisfacción</p>
                    <p className="text-3xl font-extrabold text-slate-900">{satA?.avgRating || "—"} <span className="text-sm font-normal text-slate-400">★</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">NPS</p>
                    <p className={`text-3xl font-extrabold ${(dataA?.nps?.score || 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {dataA?.nps?.score ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Respuestas</p>
                    <p className="text-3xl font-extrabold text-slate-900">{satA?.totalResponses || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Tasa</p>
                    <p className="text-3xl font-extrabold text-slate-900">
                      {satA && satA.totalResponses > 0 ? ((satA.completedResponses / satA.totalResponses) * 100).toFixed(0) : 0}%
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl p-6 shadow-sm ring-1 ring-slate-900/5 border-l-4 border-[#e8722a]"
                style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)" }}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-3 w-3 rounded-full bg-[#e8722a]" />
                  <h3 className="text-sm font-bold text-slate-900 truncate">{satB?.title || "—"}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Satisfacción</p>
                    <p className="text-3xl font-extrabold text-slate-900">{satB?.avgRating || "—"} <span className="text-sm font-normal text-slate-400">★</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">NPS</p>
                    <p className={`text-3xl font-extrabold ${(dataB?.nps?.score || 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {dataB?.nps?.score ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Respuestas</p>
                    <p className="text-3xl font-extrabold text-slate-900">{satB?.totalResponses || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Tasa</p>
                    <p className="text-3xl font-extrabold text-slate-900">
                      {satB && satB.totalResponses > 0 ? ((satB.completedResponses / satB.totalResponses) * 100).toFixed(0) : 0}%
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* General Comparison Bar Chart */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Comparación General</h2>
              <p className="text-xs text-slate-400 mb-5">Métricas lado a lado</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={satisfactionData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                  <Legend />
                  <Bar dataKey="A" name={satA?.title?.substring(0, 20) || "A"} fill={TEAL} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="B" name={satB?.title?.substring(0, 20) || "B"} fill={ORANGE} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* NPS Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              {[{ data: dataA, sat: satA, label: "A" }, { data: dataB, sat: satB, label: "B" }].map(({ data, sat, label }, idx) => {
                const pie = label === "A" ? npsPieA : npsPieB;
                return (
                  <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + idx * 0.1 }}
                    className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
                    <h2 className="text-sm font-bold text-slate-900 mb-1">NPS — {sat?.title?.substring(0, 25)}</h2>
                    <p className="text-xs text-slate-400 mb-4">
                      Score: <span className={`font-bold ${(data?.nps?.score || 0) >= 0 ? "text-emerald-600" : "text-red-500"}`}>{data?.nps?.score ?? "—"}</span>
                    </p>
                    {pie.length > 0 && (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={pie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                            {pie.map((_, i) => <Cell key={i} fill={NPS_COLORS[i]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Department Comparison */}
            {deptData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
                <h2 className="text-sm font-bold text-slate-900 mb-1">Respuestas por Departamento</h2>
                <p className="text-xs text-slate-400 mb-5">Participación por área</p>
                <ResponsiveContainer width="100%" height={Math.max(200, deptData.length * 36)}>
                  <BarChart data={deptData} layout="vertical" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis type="category" dataKey="department" width={120} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                    <Legend />
                    <Bar dataKey="A" name={satA?.title?.substring(0, 15) || "A"} fill={TEAL} radius={[0, 6, 6, 0]} />
                    <Bar dataKey="B" name={satB?.title?.substring(0, 15) || "B"} fill={ORANGE} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Per-Question Comparison */}
            {matchingQuestions.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
                <h2 className="text-sm font-bold text-slate-900 mb-1">Comparación por Pregunta</h2>
                <p className="text-xs text-slate-400 mb-5">Promedio de calificación/NPS por pregunta equivalente</p>
                <div className="space-y-6">
                  {matchingQuestions.map((qA) => {
                    const qB = qAvgB.find((b) => b.title === qA.title)!;
                    const maxVal = qA.type === "NET_PROMOTER_SCORE" ? 10 : 5;
                    return (
                      <div key={qA.questionId}>
                        <p className="text-sm font-semibold text-slate-700 mb-3">{qA.title}</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="w-8 text-xs font-bold text-[#0d7377]">A</span>
                            <div className="flex-1 h-6 rounded-full bg-slate-100 overflow-hidden">
                              <motion.div className="h-full rounded-full bg-[#0d7377]"
                                initial={{ width: 0 }} animate={{ width: `${(qA.avg / maxVal) * 100}%` }}
                                transition={{ delay: 0.6, duration: 0.8 }} />
                            </div>
                            <span className="w-16 text-xs font-bold text-right text-slate-900">{qA.avg.toFixed(1)} <span className="text-slate-400 font-normal">({qA.count})</span></span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="w-8 text-xs font-bold text-[#e8722a]">B</span>
                            <div className="flex-1 h-6 rounded-full bg-slate-100 overflow-hidden">
                              <motion.div className="h-full rounded-full bg-[#e8722a]"
                                initial={{ width: 0 }} animate={{ width: `${(qB.avg / maxVal) * 100}%` }}
                                transition={{ delay: 0.7, duration: 0.8 }} />
                            </div>
                            <span className="w-16 text-xs font-bold text-right text-slate-900">{qB.avg.toFixed(1)} <span className="text-slate-400 font-normal">({qB.count})</span></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {matchingQuestions.length === 0 && qAvgA.length > 0 && qAvgB.length > 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                No hay preguntas con el mismo título entre ambas encuestas para comparar
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
