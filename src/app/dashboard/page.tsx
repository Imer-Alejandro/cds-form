"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { LoadingSpinner, Skeleton } from "@/components/Loading";
import { Alert } from "@/components/Alert";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Survey {
  id: string;
  title: string;
  description?: string;
  status: string;
  isPublished: boolean;
  createdAt: string;
  _count: {
    questions: number;
    responses: number;
  };
  metadata: {
    totalResponses: number;
    completedResponses: number;
    completionRate: number;
  };
}

export default function Dashboard() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "draft" | "published" | "closed">(
    "all"
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSurveys();
  }, [filter, search]);

  async function fetchSurveys() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter.toUpperCase());
      if (search) params.set("search", search);

      const response = await fetch(`/api/surveys?${params}`);
      const data = await response.json();
      setSurveys(data.surveys || []);
    } catch (error) {
      console.error("Error fetching surveys:", error);
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    totalSurveys: surveys.length,
    activeSurveys: surveys.filter((s) => s.status === "PUBLISHED").length,
    totalResponses: surveys.reduce((sum, s) => sum + (s.metadata?.totalResponses ?? 0), 0),
    avgCompletion: surveys.length > 0
      ? (surveys.reduce((sum, s) => sum + (s.metadata?.completionRate ?? 0), 0) / surveys.length).toFixed(1)
      : 0,
  };

  const chartData = surveys.slice(0, 10).map((s) => ({
    name: s.title.substring(0, 15),
    responses: s.metadata?.totalResponses ?? 0,
    completed: s.metadata?.completedResponses ?? 0,
  }));

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-slate-600">Visualiza y gestiona tus encuestas</p>
          </div>
          <Link href="/survey/new">
            <Button>+ Nueva Encuesta</Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            { label: "Encuestas Totales", value: stats.totalSurveys, color: "blue" },
            { label: "Encuestas Activas", value: stats.activeSurveys, color: "green" },
            { label: "Respuestas Totales", value: stats.totalResponses, color: "purple" },
            { label: "Tasa de Finalización", value: `${stats.avgCompletion}%`, color: "orange" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-slate-600">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {stat.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Respuestas por Encuesta
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="responses" fill="#3b82f6" name="Total" />
                <Bar dataKey="completed" fill="#10b981" name="Completadas" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            {(["all", "draft", "published", "closed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar encuestas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-200 px-4 py-2 w-full sm:w-auto"
          />
        </div>

        {/* Surveys List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {loading ? (
            <Skeleton count={3} height="h-24" />
          ) : surveys.length === 0 ? (
            <Alert
              type="info"
              title="No hay encuestas"
              message="Crea tu primera encuesta para comenzar"
            />
          ) : (
            surveys.map((survey) => (
              <motion.div
                key={survey.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {survey.title}
                    </h3>
                    {survey.description && (
                      <p className="mt-1 text-sm text-slate-600">
                        {survey.description}
                      </p>
                    )}
                    <div className="mt-3 flex gap-4 text-sm text-slate-600">
                      <span>📝 {survey._count.questions} preguntas</span>
                      <span>✓ {survey.metadata.completedResponses} respuestas</span>
                      <span>⏱️ {(survey.metadata?.completionRate ?? 0).toFixed(1)}% completadas</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link href={`/survey/${survey.id}/edit`}>
                      <Button size="sm" variant="secondary">
                        Editar
                      </Button>
                    </Link>
                    <Link href={`/survey/${survey.id}/settings`}>
                      <Button size="sm" variant="secondary">
                        Compartir
                      </Button>
                    </Link>
                    <Link href={`/survey/${survey.id}/results`}>
                      <Button size="sm" variant="secondary">
                        Ver Resultados
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </main>
  );
}
