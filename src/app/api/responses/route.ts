import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJsonSafe } from "@/lib/utils";

// POST /api/responses - Submit a survey response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { surveyId, respondentId, respondentEmail, respondentName, answers } = body;

    if (!surveyId || !answers) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the response record
    const response = await prisma.response.create({
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
              selectedOptions: answer.selectedOptions
                ? JSON.stringify(answer.selectedOptions)
                : null,
            })
          ),
        },
      },
      include: {
        answers: true,
      },
    });

    // Update metadata
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: { metadata: true },
    });

    if (survey?.metadata) {
      await prisma.surveyMetadata.update({
        where: { id: survey.metadata.id },
        data: {
          totalResponses: { increment: 1 },
          completedResponses: { increment: 1 },
        },
      });
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
