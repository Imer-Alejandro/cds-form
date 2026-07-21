"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { LoadingSpinner } from "@/components/Loading";
import { showToast } from "@/components/Alert";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SurveyResult {
  id: string;
  title: string;
  description?: string;
  metadata: {
    totalResponses: number;
    completedResponses: number;
    abandonedResponses: number;
  };
  questions: any[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function SurveyResultsPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<SurveyResult | null>(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSurveyData();
  }, [surveyId]);

  async function fetchSurveyData() {
    try {
      const [surveyRes, responsesRes] = await Promise.all([
        fetch(`/api/surveys/${surveyId}`),
        fetch(`/api/responses?surveyId=${surveyId}`),
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

  if (loading) return <LoadingSpinner text="Cargando resultados..." />;
  if (!survey) return null;

  const completionRate = (
    (survey.metadata.completedResponses / survey.metadata.totalResponses) *
    100
  ).toFixed(2);

  const statsData = [
    {
      name: "Total",
      value: survey.metadata.totalResponses,
      color: "#3b82f6",
    },
    {
      name: "Completadas",
      value: survey.metadata.completedResponses,
      color: "#10b981",
    },
    {
      name: "Abandonadas",
      value: survey.metadata.abandonedResponses,
      color: "#ef4444",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Resultados: {survey.title}
            </h1>
            <p className="mt-2 text-slate-600">
              Análisis completo de respuestas
            </p>
          </div>
          <Button onClick={() => router.back()} variant="secondary">
            Volver
          </Button>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8"
        >
          {[
            {
              label: "Respuestas Totales",
              value: survey.metadata.totalResponses,
              color: "blue",
            },
            {
              label: "Completadas",
              value: survey.metadata.completedResponses,
              color: "green",
            },
            {
              label: "Abandonadas",
              value: survey.metadata.abandonedResponses,
              color: "red",
            },
            {
              label: "Tasa de Finalización",
              value: `${completionRate}%`,
              color: "purple",
            },
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

        {/* Charts Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid gap-6 lg:grid-cols-2"
        >
          {/* Status Distribution */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">
              Distribución de Respuestas
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Response Timeline */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">
              Actividad
            </h2>
            <div className="space-y-4">
              {responses.slice(0, 5).map((response: any, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm p-3 rounded-lg bg-slate-50"
                >
                  <span className="text-slate-600">
                    Respuesta {i + 1}
                  </span>
                  <span className="text-green-600 font-medium">✓ Completada</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Question Analysis */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            Análisis por Pregunta
          </h2>
          <div className="space-y-8">
            {survey.questions.map((question, i) => (
              <div key={question.id} className="border-b border-slate-100 pb-6 last:border-b-0">
                <h3 className="font-medium text-slate-900 mb-4">
                  {i + 1}. {question.title}
                </h3>
                <div className="text-sm text-slate-600">
                  <p>Tipo: {question.type}</p>
                  <p>Respuestas: {responses.filter((r: any) =>
                    r.answers.some((a: any) => a.questionId === question.id)
                  ).length}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
