"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { LoadingSpinner } from "@/components/Loading";
import { showToast } from "@/components/Alert";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  id: string;
  title: string;
  description?: string;
  type: string;
  required: boolean;
  order: number;
  options?: string[];
  minValue?: number;
  maxValue?: number;
  minLabel?: string;
  maxLabel?: string;
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  showProgressBar: boolean;
  randomizeQuestions: boolean;
}

const AUTO_ADVANCE_MS = 600;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0, scale: 0.98 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0, scale: 0.98 }),
};

function SkeletonQuestion() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="text-center space-y-3">
        <div className="h-7 bg-slate-200 rounded-lg mx-auto w-3/4" />
        <div className="h-4 bg-slate-100 rounded mx-auto w-1/2" />
      </div>
      <div className="space-y-3 max-w-md mx-auto">
        <div className="h-12 bg-slate-100 rounded-xl" />
        <div className="h-12 bg-slate-100 rounded-xl" />
        <div className="h-12 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function RespondSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [direction, setDirection] = useState(1);
  const [wentBack, setWentBack] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseIdRef = useRef<string | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    fetchSurvey();
    return () => { if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current); };
  }, [surveyId]);

  useEffect(() => {
    if (!survey || submitted) return;

    const storageKey = `survey_response_${surveyId}`;
    const existingId = localStorage.getItem(storageKey);
    responseIdRef.current = existingId;

    if (!existingId) {
      fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId, action: "start" }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.id) {
            responseIdRef.current = data.id;
            localStorage.setItem(storageKey, data.id);
          }
        })
        .catch(() => {});
    }

    function sendAbandon() {
      if (completedRef.current || !responseIdRef.current) return;
      const payload = JSON.stringify({ surveyId, responseId: responseIdRef.current, action: "abandon" });
      navigator.sendBeacon("/api/responses", new Blob([payload], { type: "application/json" }));
    }

    function handleVisibility() {
      if (document.visibilityState === "hidden") sendAbandon();
    }

    window.addEventListener("beforeunload", sendAbandon);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("beforeunload", sendAbandon);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [survey, submitted, surveyId]);

  async function fetchSurvey() {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`);
      if (!response.ok) throw new Error("Survey not found");
      const data = await response.json();
      if (data.questions) {
        data.questions = data.questions.map((q: any) => ({
          ...q,
          options: (() => {
            if (!q.options) return [];
            try {
              const parsed = JSON.parse(q.options);
              return Array.isArray(parsed) ? parsed : [];
            } catch { return []; }
          })(),
        }));
      }
      setSurvey(data);
    } catch (error) {
      showToast("Encuesta no encontrada", "error");
      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  function autoAdvance() {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = setTimeout(() => {
      if (!survey) return;
      if (currentQuestionIndex < survey.questions.length - 1) {
        goNext();
      } else {
        handleSubmit();
      }
    }, AUTO_ADVANCE_MS);
  }

  function goNext() {
    if (!survey || transitioning) return;
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    setTransitioning(true);
    setDirection(1);
    setTimeout(() => {
      setCurrentQuestionIndex((i) => Math.min(survey.questions.length - 1, i + 1));
      setTransitioning(false);
    }, 50);
  }

  function goPrev() {
    if (!survey || transitioning) return;
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    setTransitioning(true);
    setDirection(-1);
    setWentBack(true);
    setTimeout(() => {
      setCurrentQuestionIndex((i) => Math.max(0, i - 1));
      setTransitioning(false);
    }, 50);
  }

  function skipQuestion() {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    goNext();
  }

  function setAnswerAndAutoAdvance(questionId: string, value: any) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    const q = survey!.questions.find((q) => q.id === questionId);
    if (q && !["SHORT_TEXT", "LONG_TEXT", "EMAIL", "CHECKBOX", "SCALE"].includes(q.type)) {
      autoAdvance();
    }
  }

  async function handleSubmit() {
    if (!survey) return;

    for (const question of survey.questions) {
      if (question.required && !answers[question.id]) {
        showToast(`Por favor responde: ${question.title}`, "error");
        setDirection(1);
        setCurrentQuestionIndex(survey.questions.findIndex((q) => q.id === question.id));
        return;
      }
    }

    try {
      setSubmitting(true);
      completedRef.current = true;
      const formattedAnswers = survey.questions.map((q) => ({
        questionId: q.id,
        value: answers[q.id] != null ? String(answers[q.id]) : null,
        selectedOptions:
          q.type === "CHECKBOX"
            ? Array.isArray(answers[q.id]) ? answers[q.id] : []
            : undefined,
      }));

      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId,
          responseId: responseIdRef.current,
          answers: formattedAnswers,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit");
      localStorage.removeItem(`survey_response_${surveyId}`);
      setSubmitted(true);
    } catch (error) {
      completedRef.current = false;
      showToast("Error al enviar la respuesta", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner text="Cargando encuesta..." />;
  if (!survey) return null;

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50/40 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
            className="mx-auto mb-8 h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25"
          >
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold text-slate-900"
          >
            Gracias por participar
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-lg text-slate-500"
          >
            Tu respuesta ha sido registrada exitosamente.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-2 text-sm text-slate-400"
          >
            {survey.title}
          </motion.p>
        </motion.div>
      </main>
    );
  }

  const currentQuestion = survey.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / survey.questions.length) * 100;
  const isLast = currentQuestionIndex === survey.questions.length - 1;
  const hasAnswer = answers[currentQuestion.id] != null && answers[currentQuestion.id] !== "" &&
    !(Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].length === 0);
  const needsManualAdvance = currentQuestion.type === "CHECKBOX" || currentQuestion.type === "SCALE" || currentQuestion.type === "SHORT_TEXT" || currentQuestion.type === "LONG_TEXT" || currentQuestion.type === "EMAIL";
  const canSkip = !currentQuestion.required;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50/40 py-8 px-6 flex items-center">
      <div className="mx-auto w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white p-8 md:p-10 shadow-xl ring-1 ring-slate-900/5"
        >
          {/* Header */}
          <AnimatePresence>
            {currentQuestionIndex === 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 text-center overflow-hidden"
              >
                <h1 className="text-3xl font-bold text-slate-900">{survey.title}</h1>
                {survey.description && (
                  <p className="mt-3 text-slate-500 text-lg">{survey.description}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Bar */}
          {survey.showProgressBar && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-400">
                  {currentQuestionIndex + 1} de {survey.questions.length}
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* Question */}
          <div className="mb-8" style={{ minHeight: 240 }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentQuestion.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-slate-900 leading-snug">
                    {currentQuestion.title}
                  </h2>
                  {currentQuestion.description && (
                    <p className="mt-2 text-slate-500">{currentQuestion.description}</p>
                  )}
                  {currentQuestion.required && (
                    <p className="mt-2 text-xs font-medium text-red-400 tracking-wide">Requerida</p>
                  )}
                </div>

                <div className="space-y-3">
                  {currentQuestion.type === "SHORT_TEXT" && (
                    <div className="max-w-md mx-auto">
                      <input
                        type="text"
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) =>
                          setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                        }
                        onKeyDown={(e) => { if (e.key === "Enter") goNext(); }}
                        placeholder="Tu respuesta..."
                        autoFocus
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-center text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                  )}

                  {currentQuestion.type === "LONG_TEXT" && (
                    <div className="max-w-md mx-auto">
                      <textarea
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) =>
                          setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                        }
                        placeholder="Tu respuesta..."
                        rows={4}
                        autoFocus
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 resize-none"
                      />
                    </div>
                  )}

                  {currentQuestion.type === "MULTIPLE_CHOICE" && (
                    <div className="space-y-2 max-w-md mx-auto">
                      {currentQuestion.options?.map((option) => {
                        const selected = answers[currentQuestion.id] === option;
                        return (
                          <button
                            key={option}
                            onClick={() => setAnswerAndAutoAdvance(currentQuestion.id, option)}
                            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                              selected
                                ? "border-blue-500 bg-blue-50 ring-4 ring-blue-500/10"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${
                              selected ? "border-blue-500 bg-blue-500" : "border-slate-300"
                            }`}>
                              {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                            </span>
                            <span className={`font-medium ${selected ? "text-blue-700" : "text-slate-700"}`}>{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.type === "CHECKBOX" && (
                    <div className="space-y-2 max-w-md mx-auto">
                      {currentQuestion.options?.map((option) => {
                        const selected: string[] = answers[currentQuestion.id] || [];
                        const isChecked = selected.includes(option);
                        return (
                          <button
                            key={option}
                            onClick={() => {
                              const next = isChecked
                                ? selected.filter((v) => v !== option)
                                : [...selected, option];
                              setAnswers({ ...answers, [currentQuestion.id]: next });
                            }}
                            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                              isChecked
                                ? "border-blue-500 bg-blue-50 ring-4 ring-blue-500/10"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition ${
                              isChecked ? "border-blue-500 bg-blue-500" : "border-slate-300"
                            }`}>
                              {isChecked && (
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </span>
                            <span className={`font-medium ${isChecked ? "text-blue-700" : "text-slate-700"}`}>{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.type === "DATE" && (
                    <div className="max-w-md mx-auto">
                      <input
                        type="date"
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) => setAnswerAndAutoAdvance(currentQuestion.id, e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-center text-slate-900 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                  )}

                  {currentQuestion.type === "EMAIL" && (
                    <div className="max-w-md mx-auto">
                      <input
                        type="email"
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) =>
                          setAnswers({ ...answers, [currentQuestion.id]: e.target.value })
                        }
                        onKeyDown={(e) => { if (e.key === "Enter") goNext(); }}
                        placeholder="tu@email.com"
                        autoFocus
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-5 py-3.5 text-center text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>
                  )}

                  {currentQuestion.type === "RATING" && (
                    <div className="flex items-center gap-3 justify-center py-4">
                      {Array.from({ length: currentQuestion.maxValue || 5 }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setAnswerAndAutoAdvance(currentQuestion.id, i + 1)}
                          className={`text-4xl transition-all duration-100 ${
                            answers[currentQuestion.id] === i + 1
                              ? "text-amber-400 scale-125 drop-shadow-md"
                              : "text-slate-200 hover:text-amber-200 hover:scale-110"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  )}

                  {currentQuestion.type === "NET_PROMOTER_SCORE" && (
                    <div className="space-y-3 max-w-lg mx-auto">
                      <div className="flex justify-between text-xs font-medium text-slate-400 px-1">
                        <span>Nada probable</span>
                        <span>Muy probable</span>
                      </div>
                      <div className="grid grid-cols-11 gap-1.5">
                        {Array.from({ length: 11 }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setAnswerAndAutoAdvance(currentQuestion.id, i)}
                            className={`aspect-square rounded-lg text-sm font-semibold transition-all duration-100 ${
                              answers[currentQuestion.id] === i
                                ? i <= 6
                                  ? "bg-red-500 text-white shadow-md shadow-red-500/25"
                                  : i <= 8
                                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                                  : "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentQuestion.type === "SCALE" && (
                    <div className="space-y-4 py-2 max-w-md mx-auto">
                      <div className="flex items-center justify-between text-sm font-medium text-slate-500">
                        <span>{currentQuestion.minLabel || currentQuestion.minValue || 0}</span>
                        <span>{currentQuestion.maxLabel || currentQuestion.maxValue || 10}</span>
                      </div>
                      <input
                        type="range"
                        min={currentQuestion.minValue || 0}
                        max={currentQuestion.maxValue || 10}
                        value={answers[currentQuestion.id] ?? Math.round(((currentQuestion.minValue || 0) + (currentQuestion.maxValue || 10)) / 2)}
                        onChange={(e) =>
                          setAnswers({ ...answers, [currentQuestion.id]: parseInt(e.target.value) })
                        }
                        className="w-full h-2 rounded-full appearance-none bg-slate-200 accent-blue-600 cursor-pointer"
                      />
                      <div className="text-center text-3xl font-bold text-blue-600">
                        {answers[currentQuestion.id] ?? Math.round(((currentQuestion.minValue || 0) + (currentQuestion.maxValue || 10)) / 2)}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-6 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={goPrev}
              disabled={currentQuestionIndex === 0}
            >
              Atras
            </Button>
            <div className="flex-1" />
            {isLast ? (
              <Button onClick={handleSubmit} loading={submitting}>
                Enviar
              </Button>
            ) : (
              <div className="flex gap-2">
                {canSkip && (
                  <Button variant="secondary" onClick={skipQuestion}>
                    Saltar
                  </Button>
                )}
                {(needsManualAdvance || wentBack) && (
                  <Button onClick={goNext} disabled={!hasAnswer && currentQuestion.required}>
                    Siguiente
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
