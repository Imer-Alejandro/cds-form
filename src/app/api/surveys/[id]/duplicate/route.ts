import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT, canManageSurvey, isAllowedOrigin } from "@/lib/auth";

// POST /api/surveys/[id]/duplicate - Duplicate a survey with blank responses
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }

    const { id } = await params;
    const sessionCookie = request.cookies.get("sdc_session")?.value;
    const session = sessionCookie ? await verifyJWT(sessionCookie) : null;
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const original = await prisma.survey.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: "asc" } },
        departmentConfigs: true,
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
    }

    if (!canManageSurvey(session, original)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const newSurvey = await prisma.survey.create({
      data: {
        title: `${original.title} - Copia`,
        description: original.description,
        status: "DRAFT",
        createdBy: session.userId,
        isPublished: false,
        allowMultiple: original.allowMultiple,
        allowAnonymous: original.allowAnonymous,
        requireEmail: original.requireEmail,
        showProgressBar: original.showProgressBar,
        randomizeQuestions: original.randomizeQuestions,
        expiresAt: null,
        questions: {
          create: original.questions.map((q) => ({
            title: q.title,
            description: q.description,
            type: q.type,
            required: q.required,
            order: q.order,
            options: q.options,
            minValue: q.minValue,
            maxValue: q.maxValue,
            minLabel: q.minLabel,
            maxLabel: q.maxLabel,
          })),
        },
        metadata: {
          create: {},
        },
      },
      include: {
        questions: { orderBy: { order: "asc" } },
        metadata: true,
      },
    });

    return NextResponse.json(newSurvey, { status: 201 });
  } catch (error) {
    console.error("Error duplicating survey:", error);
    return NextResponse.json(
      { error: "No se pudo duplicar la encuesta" },
      { status: 500 }
    );
  }
}
