import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJsonSafe } from "@/lib/utils";

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
