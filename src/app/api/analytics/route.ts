import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT, buildSurveyAccessFilter } from "@/lib/auth";
import { TOTAL_EMPLOYEES, isPrivateDepartment } from "@/lib/departments";

const MIN_DEPT_RESPONSES = 5;

function departmentLabel(dept: string | null, count: number): string {
  if (!dept) return "Sin departamento";
  if (isPrivateDepartment(dept) || count < MIN_DEPT_RESPONSES) return "General";
  return dept;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyId = searchParams.get("surveyId");

    const sessionCookie = request.cookies.get("sdc_session")?.value;
    const session = sessionCookie ? await verifyJWT(sessionCookie) : null;
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const accessFilter = buildSurveyAccessFilter(session);

    const surveyWhere = surveyId
      ? { AND: [{ id: surveyId }, accessFilter] }
      : accessFilter;

    const surveys = await prisma.survey.findMany({
      where: surveyWhere,
      include: {
        metadata: true,
        questions: { select: { id: true, type: true, title: true } },
        responses: {
          select: {
            id: true,
            status: true,
            completedAt: true,
            createdAt: true,
            respondentDepartment: true,
            answers: { select: { value: true, questionId: true } },
          },
        }
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

    // Participation (completion) vs known headcount — only for surveys with a DEPARTMENT_SELECT question
    // Each survey can define its own reveal threshold; results stay hidden until that threshold is met.
    const participationBySurvey = surveys.map((s: any) => {
      const hasDeptQuestion = s.questions.some((q: any) => q.type === "DEPARTMENT_SELECT");
      const completed = s.responses.filter((r: any) => r.status === "COMPLETED").length;
      const threshold = s.participationThreshold ?? 100;
      const expected = hasDeptQuestion ? TOTAL_EMPLOYEES : 0;
      const percentForSurvey = expected > 0 ? Math.round((completed / expected) * 100) : 0;
      return {
        id: s.id,
        title: s.title,
        hasDeptQuestion,
        completed,
        expected,
        threshold,
        percent: percentForSurvey,
        locked: expected > 0 && percentForSurvey < threshold,
      };
    });

    const expectedTotal = participationBySurvey.reduce((a, c) => a + c.expected, 0);
    const completedTotal = Math.min(
      participationBySurvey.reduce((a, c) => a + c.completed, 0),
      expectedTotal
    );
    const percent = expectedTotal > 0 ? Math.round((completedTotal / expectedTotal) * 100) : 0;
    const deptParticipation = participationBySurvey.filter((p) => p.hasDeptQuestion);
    const locked =
      deptParticipation.every((p) => p.threshold === 100) && expectedTotal > 0 && completedTotal < expectedTotal
        ? true
        : deptParticipation.some((p) => p.locked);

    // Department breakdown with anonymity rules.
    // Hidden entirely until 100% participation; then departments with <5 employees OR <5 responses are merged into "General".
    let departmentBreakdown: { department: string; count: number }[] = [];
    const completedResponses = surveys.flatMap((s: any) => s.responses).filter((r: any) => r.status === "COMPLETED");

    if (!locked) {
      const rawDeptCounts: Record<string, number> = {};
      for (const resp of completedResponses) {
        const dept = resp.respondentDepartment?.trim() || null;
        const key = dept || "__none__";
        rawDeptCounts[key] = (rawDeptCounts[key] || 0) + 1;
      }
      const deptCounts: Record<string, number> = {};
      for (const [key, count] of Object.entries(rawDeptCounts)) {
        const dept = key === "__none__" ? null : key;
        const label = departmentLabel(dept, count);
        deptCounts[label] = (deptCounts[label] || 0) + count;
      }
      departmentBreakdown = Object.entries(deptCounts)
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count);
    }

    // Per-question averages (only when a specific survey is requested)
    let questionAverages: { questionId: string; title: string; type: string; avg: number; count: number }[] = [];
    if (surveyId && surveys.length === 1) {
      const survey = surveys[0];
      const questionIds = survey.questions.map((q: any) => q.id);
      const allAnswersForSurvey = questionIds.length > 0
        ? await prisma.answer.findMany({
            where: { questionId: { in: questionIds } },
            select: { questionId: true, value: true },
          })
        : [];
      const answersByQuestion: Record<string, string[]> = {};
      for (const a of allAnswersForSurvey) {
        if (!answersByQuestion[a.questionId]) answersByQuestion[a.questionId] = [];
        if (a.value) answersByQuestion[a.questionId].push(a.value);
      }
      questionAverages = survey.questions.map((q: any) => {
        const vals = (answersByQuestion[q.id] || [])
          .map((v) => parseFloat(v))
          .filter((n) => !isNaN(n));
        const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        return { questionId: q.id, title: q.title, type: q.type, avg: Math.round(avg * 10) / 10, count: vals.length };
      });
    }

    return NextResponse.json({
      satisfactionBySurvey,
      nps: { promoters: npsPromoters, passives: npsPassives, detractors: npsDetractors, score: npsScore },
      timeline,
      statusCounts,
      questionTypeDist,
      completion: expectedTotal > 0
        ? { expectedTotal, completedTotal, missing: expectedTotal - completedTotal, percent, locked }
        : null,
      participation: participationBySurvey.filter((p) => p.hasDeptQuestion),
      departmentBreakdown,
      departmentLocked: locked,
      questionAverages,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
