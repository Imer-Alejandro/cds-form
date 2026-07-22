import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExecutiveSummaryEmail, sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { surveyId } = await request.json();

    if (!surveyId) {
      return NextResponse.json({ error: "surveyId is required" }, { status: 400 });
    }

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        metadata: true,
        departmentConfigs: {
          where: { sendSummary: true },
          include: { responsible: { select: { id: true, name: true, email: true } } },
        },
        questions: { orderBy: { order: "asc" } },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const responses = await prisma.response.findMany({
      where: { surveyId, status: "COMPLETED" },
      include: { answers: true },
    });

    const totalResponses = responses.length;
    const completedResponses = survey.metadata?.completedResponses ?? totalResponses;
    const abandonedResponses = survey.metadata?.abandonedResponses ?? 0;
    const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0;

    let totalRating = 0;
    let ratingCount = 0;
    const questionSummaries: { title: string; type: string; summary: string }[] = [];

    for (const question of survey.questions) {
      const qAnswers = responses.flatMap((r) => r.answers).filter((a) => a.questionId === question.id);

      if (question.type === "RATING") {
        for (const a of qAnswers) {
          const val = parseInt(a.value || "0");
          if (val > 0) { totalRating += val; ratingCount++; }
        }
        questionSummaries.push({
          title: question.title,
          type: "RATING",
          summary: `Promedio: ${ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : "N/A"} de 5`,
        });
      } else if (question.type === "MULTIPLE_CHOICE") {
        const counts: Record<string, number> = {};
        for (const a of qAnswers) { if (a.value) counts[a.value] = (counts[a.value] || 0) + 1; }
        const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
        questionSummaries.push({
          title: question.title, type: "MULTIPLE_CHOICE",
          summary: top ? `Mas seleccionada: "${top[0]}" (${top[1]})` : "Sin respuestas",
        });
      }
    }

    const avgRating = ratingCount > 0 ? totalRating / ratingCount : null;
    const satisfactionRate = avgRating != null ? (avgRating / 5) * 100 : completionRate;
    const sentimentScore = satisfactionRate / 100;

    const surveyUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/survey/${surveyId}/results`
      : `http://localhost:3000/survey/${surveyId}/results`;

    const results = [];
    for (const config of survey.departmentConfigs) {
      if (!config.responsible?.email) continue;
      try {
        const html = buildExecutiveSummaryEmail({
          surveyTitle: survey.title,
          totalResponses,
          completedResponses,
          abandonedResponses,
          completionRate,
          averageRating: avgRating,
          sentimentScore,
          sentimentLabel: sentimentScore >= 0.7 ? "Positivo" : sentimentScore >= 0.4 ? "Neutro" : "Negativo",
          satisfactionRate,
          npsScore: null,
          keyFindings: avgRating != null ? [`Calificacion promedio: ${avgRating.toFixed(1)} de 5`] : [],
          questionSummaries,
          surveyUrl,
        });

        await sendEmail({ to: config.responsible.email, subject: `Resumen: ${survey.title}`, html });
        results.push({ department: config.department, email: config.responsible.email, status: "sent" });
      } catch (error) {
        results.push({ department: config.department, email: config.responsible.email, status: "failed", error: String(error) });
      }
    }

    return NextResponse.json({
      results,
      successCount: results.filter((r) => r.status === "sent").length,
      failureCount: results.filter((r) => r.status === "failed").length,
    });
  } catch (error) {
    console.error("Error sending summaries:", error);
    return NextResponse.json({ error: "Failed to send summaries" }, { status: 500 });
  }
}
