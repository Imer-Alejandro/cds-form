import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT, buildSurveyAccessFilter } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get("surveyId");

    const sessionCookie = request.cookies.get("sdc_session")?.value;
    const session = sessionCookie ? await verifyJWT(sessionCookie) : null;
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const surveyWhere = surveyId
      ? { createdBy: session.userId, id: surveyId }
      : { createdBy: session.userId };

    const surveys = await prisma.survey.findMany({
      where: surveyWhere,
      include: {
        metadata: true,
        questions: { select: { id: true, type: true, title: true } },
        responses: { select: { id: true, status: true, completedAt: true, createdAt: true, answers: { select: { value: true, questionId: true } } } },
        departmentConfigs: true,
      },
    });

    if (surveyId && surveys.length === 0) {
      return NextResponse.json({ error: "Encuesta no encontrada o sin acceso" }, { status: 404 });
    }

    // Average satisfaction per survey (from RATING questions)
    const satisfactionBySurvey = surveys.map((s: any) => {
      const ratingQuestions = s.questions.filter((q: any) => q.type === "RATING");
      const ratingQuestionIds = new Set(ratingQuestions.map((q: any) => q.id));

      let totalRating = 0;
      let ratingCount = 0;
      let maxPossible = 5;

      if (ratingQuestions.length > 0) {
        const first = ratingQuestions[0];
        if (first.title) {
          // Try to get max from question config if available
        }
      }

      for (const resp of s.responses) {
        for (const ans of resp.answers) {
          if (ratingQuestionIds.has(ans.questionId) && ans.value) {
            const num = parseFloat(ans.value);
            if (!isNaN(num)) {
              totalRating += num;
              ratingCount++;
            }
          }
        }
      }

      return {
        id: s.id,
        title: s.title.substring(0, 20),
        avgRating: ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0,
        totalResponses: s.responses.length,
        completedResponses: s.responses.filter((r: any) => r.status === "COMPLETED").length,
      };
    });

    // NPS distribution
    const npsQuestionIds = new Set(
      surveys
        .flatMap((s: any) => s.questions)
        .filter((q: any) => q.type === "NET_PROMOTER_SCORE")
        .map((q: any) => q.id)
    );

    let npsDetractors = 0;
    let npsPassives = 0;
    let npsPromoters = 0;

    const accessibleQuestionIds = Array.from(npsQuestionIds);
    const allAnswers = accessibleQuestionIds.length > 0
      ? await prisma.answer.findMany({ where: { questionId: { in: accessibleQuestionIds } }, select: { value: true } })
      : [];

    for (const ans of allAnswers) {
      if (ans.value) {
        const score = parseInt(ans.value);
        if (!isNaN(score)) {
          if (score <= 6) npsDetractors++;
          else if (score <= 8) npsPassives++;
          else npsPromoters++;
        }
      }
    }

    const npsTotal = npsDetractors + npsPassives + npsPromoters;
    const npsScore = npsTotal > 0
      ? Math.round(((npsPromoters - npsDetractors) / npsTotal) * 100)
      : 0;

    // Response timeline (last 7 days) restricted to accessible surveys
    const now = new Date();
    const timeline: { date: string; responses: number }[] = [];
    const accessibleSurveyIds = surveys.map((s: any) => s.id);
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split("T")[0];
      const startOfDay = new Date(dayStr);
      const endOfDay = new Date(dayStr);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const count = await prisma.response.count({
        where: {
          surveyId: { in: accessibleSurveyIds },
          createdAt: { gte: startOfDay, lt: endOfDay },
        },
      });

      const label = day.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
      timeline.push({ date: label, responses: count });
    }

    // Status distribution
    const statusCounts = {
      DRAFT: surveys.filter((s: any) => s.status === "DRAFT").length,
      PUBLISHED: surveys.filter((s: any) => s.status === "PUBLISHED").length,
      ARCHIVED: surveys.filter((s: any) => s.status === "ARCHIVED").length,
      CLOSED: surveys.filter((s: any) => s.status === "CLOSED").length,
    };

    // Question type distribution
    const allQuestions = await prisma.question.groupBy({
      by: ["type"],
      where: { surveyId: { in: accessibleSurveyIds } },
      _count: true,
    });
    const questionTypeDist = allQuestions.map((q) => ({
      type: q.type.replace("_", " "),
      count: q._count,
    }));

    return NextResponse.json({
      satisfactionBySurvey,
      nps: { promoters: npsPromoters, passives: npsPassives, detractors: npsDetractors, score: npsScore },
      timeline,
      statusCounts,
      questionTypeDist,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
