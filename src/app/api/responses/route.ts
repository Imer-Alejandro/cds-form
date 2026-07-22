import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExecutiveSummaryEmail, sendEmail } from "@/lib/email";

// POST /api/responses - Create or submit a survey response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { surveyId, respondentId, respondentEmail, respondentName, answers, action } = body;

    if (!surveyId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (action === "start") {
      const existingId = body.responseId;
      if (existingId) {
        const existing = await prisma.response.findUnique({ where: { id: existingId } });
        if (existing) {
          return NextResponse.json(existing);
        }
      }

      const response = await prisma.response.create({
        data: {
          surveyId,
          respondentId: respondentId || null,
          respondentEmail: respondentEmail || null,
          respondentName: respondentName || null,
          status: "STARTED",
        },
      });

      const survey = await prisma.survey.findUnique({
        where: { id: surveyId },
        include: { metadata: true },
      });
      if (survey?.metadata) {
        await prisma.surveyMetadata.update({
          where: { id: survey.metadata.id },
          data: { totalResponses: { increment: 1 } },
        });
      }

      return NextResponse.json(response, { status: 201 });
    }

    if (action === "abandon") {
      const { responseId } = body;
      if (!responseId) {
        return NextResponse.json({ error: "responseId required" }, { status: 400 });
      }

      const existing = await prisma.response.findUnique({ where: { id: responseId }, select: { status: true } });
      if (existing && existing.status !== "COMPLETED" && existing.status !== "ABANDONED") {
        await prisma.response.update({ where: { id: responseId }, data: { status: "ABANDONED" } });
        const survey = await prisma.survey.findUnique({ where: { id: surveyId }, include: { metadata: true } });
        if (survey?.metadata) {
          await prisma.surveyMetadata.update({
            where: { id: survey.metadata.id },
            data: { abandonedResponses: { increment: 1 } },
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (!answers) {
      return NextResponse.json({ error: "Missing answers" }, { status: 400 });
    }

    const existingId = body.responseId;
    let response;

    if (existingId) {
      const existing = await prisma.response.findUnique({ where: { id: existingId }, select: { status: true } });
      if (existing && existing.status !== "COMPLETED") {
        response = await prisma.response.update({
          where: { id: existingId },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            respondentId: respondentId || null,
            respondentEmail: respondentEmail || null,
            respondentName: respondentName || null,
          },
          include: { answers: true },
        });

        await prisma.answer.deleteMany({ where: { responseId: existingId } });
        await prisma.answer.createMany({
          data: answers.map(
            (answer: { questionId: string; value: string | number; selectedOptions?: string[] }) => ({
              responseId: existingId,
              questionId: answer.questionId,
              value: answer.value != null ? String(answer.value) : null,
              selectedOptions: answer.selectedOptions ? JSON.stringify(answer.selectedOptions) : null,
            })
          ),
        });

        const survey = await prisma.survey.findUnique({ where: { id: surveyId }, include: { metadata: true } });
        if (survey?.metadata) {
          await prisma.surveyMetadata.update({
            where: { id: survey.metadata.id },
            data: {
              completedResponses: { increment: 1 },
            },
          });
        }
      } else {
        return NextResponse.json({ error: "Response already completed or not found" }, { status: 400 });
      }
    } else {
      response = await prisma.response.create({
        data: {
          surveyId,
          respondentId: respondentId || null,
          respondentEmail: respondentEmail || null,
          respondentName: respondentName || null,
          status: "COMPLETED",
          completedAt: new Date(),
          answers: {
            create: answers.map(
              (answer: { questionId: string; value: string | number; selectedOptions?: string[] }) => ({
                questionId: answer.questionId,
                value: answer.value != null ? String(answer.value) : null,
                selectedOptions: answer.selectedOptions ? JSON.stringify(answer.selectedOptions) : null,
              })
            ),
          },
        },
        include: { answers: true },
      });

      const survey = await prisma.survey.findUnique({ where: { id: surveyId }, include: { metadata: true } });
      if (survey?.metadata) {
        await prisma.surveyMetadata.update({
          where: { id: survey.metadata.id },
          data: {
            totalResponses: { increment: 1 },
            completedResponses: { increment: 1 },
          },
        });
      }
    }

    return NextResponse.json(response, { status: 201 });

    triggerCompletionEmails(surveyId).catch((err) =>
      console.error("Failed to send completion emails:", err)
    );
  } catch (error) {
    console.error("Error submitting response:", error);
    return NextResponse.json(
      { error: "Failed to submit response" },
      { status: 500 }
    );
  }
}

// GET /api/responses - Get responses with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get("surveyId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    if (!surveyId) {
      return NextResponse.json(
        { error: "surveyId is required" },
        { status: 400 }
      );
    }

    const where: any = { surveyId };
    if (status) where.status = status;

    const responses = await prisma.response.findMany({
      where,
      include: {
        respondent: { select: { id: true, name: true, email: true } },
        answers: {
          include: { question: { select: { id: true, title: true, type: true } } },
        },
      },
      skip,
      take: limit,
      orderBy: { completedAt: "desc" },
    });

    const total = await prisma.response.count({ where });

    return NextResponse.json({
      responses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching responses:", error);
    return NextResponse.json(
      { error: "Failed to fetch responses" },
      { status: 500 }
    );
  }
}

async function triggerCompletionEmails(surveyId: string) {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      metadata: true,
      departmentConfigs: {
        where: { sendOnCompletion: true },
        include: { responsible: { select: { id: true, name: true, email: true } } },
      },
      questions: { orderBy: { order: "asc" } },
    },
  });

  if (!survey || survey.departmentConfigs.length === 0) return;

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
  const ratingDistributions: Record<number, number> = {};
  const questionSummaries: { title: string; type: string; summary: string }[] = [];

  for (const question of survey.questions) {
    const questionAnswers = responses
      .flatMap((r) => r.answers)
      .filter((a) => a.questionId === question.id);

    if (question.type === "RATING") {
      for (const a of questionAnswers) {
        const val = parseInt(a.value || "0");
        if (val > 0) {
          totalRating += val;
          ratingCount++;
          ratingDistributions[val] = (ratingDistributions[val] || 0) + 1;
        }
      }
      questionSummaries.push({
        title: question.title,
        type: "RATING",
        summary: `Promedio: ${ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : "N/A"} de 5 estrellas`,
      });
    } else if (question.type === "MULTIPLE_CHOICE") {
      const counts: Record<string, number> = {};
      for (const a of questionAnswers) {
        if (a.value) counts[a.value] = (counts[a.value] || 0) + 1;
      }
      const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
      const top = sorted[0];
      questionSummaries.push({
        title: question.title,
        type: "MULTIPLE_CHOICE",
        summary: top ? `Mas seleccionada: "${top[0]}" (${top[1]} respuestas)` : "Sin respuestas",
      });
    } else if (question.type === "NET_PROMOTER_SCORE") {
      const scores = questionAnswers.map((a) => parseInt(a.value || "0")).filter((v) => !isNaN(v));
      if (scores.length > 0) {
        const promoters = scores.filter((s) => s >= 9).length;
        const detractors = scores.filter((s) => s <= 6).length;
        const nps = Math.round(((promoters - detractors) / scores.length) * 100);
        questionSummaries.push({
          title: question.title,
          type: "NET_PROMOTER_SCORE",
          summary: `NPS: ${nps > 0 ? "+" : ""}${nps} (${scores.length} respuestas)`,
        });
      }
    } else if (question.type === "CHECKBOX") {
      const counts: Record<string, number> = {};
      for (const a of questionAnswers) {
        try {
          const opts = JSON.parse(a.selectedOptions || "[]");
          if (Array.isArray(opts)) {
            for (const o of opts) counts[o] = (counts[o] || 0) + 1;
          }
        } catch {}
      }
      const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 3);
      questionSummaries.push({
        title: question.title,
        type: "CHECKBOX",
        summary: sorted.length > 0 ? `Top: ${sorted.map(([k, v]) => `"${k}" (${v})`).join(", ")}` : "Sin respuestas",
      });
    } else if (question.type === "SCALE") {
      const vals = questionAnswers.map((a) => parseInt(a.value || "0")).filter((v) => !isNaN(v));
      const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "N/A";
      questionSummaries.push({
        title: question.title,
        type: "SCALE",
        summary: `Promedio: ${avg} (${vals.length} respuestas)`,
      });
    }
  }

  const avgRating = ratingCount > 0 ? totalRating / ratingCount : null;
  const satisfactionRate = avgRating != null ? (avgRating / 5) * 100 : completionRate;
  const sentimentScore = satisfactionRate / 100;
  const sentimentLabel = sentimentScore >= 0.7 ? "Positivo" : sentimentScore >= 0.4 ? "Neutro" : "Negativo";

  const keyFindings: string[] = [];
  if (avgRating != null) {
    keyFindings.push(`Calificacion promedio: ${avgRating.toFixed(1)} de 5 estrellas`);
  }
  if (completionRate > 0) {
    keyFindings.push(`Tasa de finalizacion: ${completionRate.toFixed(0)}%`);
  }
  if (abandonedResponses > 0) {
    keyFindings.push(`${abandonedResponses} respuesta(s) abandonada(s)`);
  }
  const topRating = Object.entries(ratingDistributions).sort(([, a], [, b]) => b - a)[0];
  if (topRating) {
    keyFindings.push(`Calificacion mas comun: ${topRating[0]} estrellas (${topRating[1]} veces)`);
  }

  const surveyUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/survey/${surveyId}/results`
    : `http://localhost:3000/survey/${surveyId}/results`;

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
        sentimentLabel,
        satisfactionRate,
        npsScore: null,
        keyFindings,
        questionSummaries,
        surveyUrl,
      });

      await sendEmail({
        to: config.responsible.email,
        subject: `Resumen Ejecutivo: ${survey.title}`,
        html,
      });
    } catch (err) {
      console.error(`Failed to send email to ${config.responsible.email}:`, err);
    }
  }
}
