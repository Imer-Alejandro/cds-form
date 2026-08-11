"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface Props {
  surveyId: string;
  onClose(): void;
}

export default function SurveyMetricsModal({ surveyId, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/analytics?surveyId=${surveyId}`);
        const json = await res.json();
        if (!mounted) return;
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [surveyId]);

  if (!data && loading) return null;

  const survey = data?.satisfactionBySurvey?.[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[94%] max-w-4xl bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{survey ? survey.title : "Métricas"}</h2>
            <p className="text-sm text-slate-500">Resumen y gráfica de la encuesta</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded-lg bg-slate-100">Cerrar</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="col-span-1 bg-slate-50 rounded-lg p-4">
            <div className="text-xs text-slate-500">Respuestas totales</div>
            <div className="text-2xl font-extrabold mt-1">{survey?.totalResponses ?? 0}</div>
            <div className="text-xs text-slate-400 mt-2">Completadas: {survey?.completedResponses ?? 0}</div>
            <div className="text-xs text-slate-400">Finalización: {survey?.completedResponses && survey?.totalResponses ? `${((survey.completedResponses / survey.totalResponses) * 100).toFixed(0)}%` : "0%"}</div>
          </div>

          <div className="col-span-2 bg-white rounded-lg p-4 border">
            <div className="text-sm font-semibold text-slate-700 mb-2">Satisfacción (promedio)</div>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-extrabold text-slate-900">{survey?.avgRating ?? "N/A"} <span className="text-sm text-slate-500">/5</span></div>
              <div className="flex-1 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: survey?.title, value: survey?.avgRating || 0 }]}> 
                    <XAxis dataKey="name" hide />
                    <YAxis domain={[0, 5]} hide />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8,8,0,0]} fill="#6366f1">
                      <Cell />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg p-4 border">
          <div className="text-sm font-semibold text-slate-700 mb-3">Actividad (últimos 7 días)</div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.timeline || []} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip />
                <Area type="monotone" dataKey="responses" stroke="#6366f1" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
