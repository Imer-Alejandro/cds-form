import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT, canManageSurvey, canViewSurvey } from "@/lib/auth";

// GET /api/surveys/[id] - Get a specific survey
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        questions: {
          orderBy: { order: "asc" },
          include: { _count: { select: { answers: true } } },
        },
        metadata: true,
        departmentConfigs: {
          include: { responsible: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const sessionCookie = request.cookies.get("sdc_session")?.value;
    const session = sessionCookie ? await verifyJWT(sessionCookie) : null;
    if (!canViewSurvey(session, survey)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const enriched = {
      ...survey,
      metadata: survey.metadata
        ? {
            ...survey.metadata,
            completionRate:
              survey.metadata.totalResponses > 0
                ? (survey.metadata.completedResponses / survey.metadata.totalResponses) * 100
                : 0,
          }
        : null,
    };

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching survey:", error);
    return NextResponse.json(
      { error: "Failed to fetch survey" },
      { status: 500 }
    );
  }
}

// PUT /api/surveys/[id] - Update a survey
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      description,
      status,
      isPublished,
      showProgressBar,
      randomizeQuestions,
      expiresAt,
    } = body;

    const sessionCookie = request.cookies.get("sdc_session")?.value;
    const session = sessionCookie ? await verifyJWT(sessionCookie) : null;
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const existingSurvey = await prisma.survey.findUnique({
      where: { id },
      include: {
        departmentConfigs: true,
      },
    });
    if (!existingSurvey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }
    if (!canManageSurvey(session, existingSurvey)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const existing = await prisma.survey.findUnique({ where: { id }, select: { publishedAt: true } });

    const survey = await prisma.survey.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(isPublished !== undefined && { isPublished }),
        ...(showProgressBar !== undefined && { showProgressBar }),
        ...(randomizeQuestions !== undefined && { randomizeQuestions }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) }),
        ...(isPublished && !existing?.publishedAt && { publishedAt: new Date() }),
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        questions: { orderBy: { order: "asc" } },
        metadata: true,
      },
    });

    return NextResponse.json(survey);
  } catch (error) {
    console.error("Error updating survey:", error);
    return NextResponse.json(
      { error: "Failed to update survey" },
      { status: 500 }
    );
  }
}

// DELETE /api/surveys/[id] - Delete a survey
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionCookie = request.cookies.get("sdc_session")?.value;
    const session = sessionCookie ? await verifyJWT(sessionCookie) : null;
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const existingSurvey = await prisma.survey.findUnique({
      where: { id },
      include: { departmentConfigs: true },
    });
    if (!existingSurvey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }
    if (!canManageSurvey(session, existingSurvey)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await prisma.survey.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Survey deleted successfully" });
  } catch (error) {
    console.error("Error deleting survey:", error);
    return NextResponse.json(
      { error: "Failed to delete survey" },
      { status: 500 }
    );
  }
}
