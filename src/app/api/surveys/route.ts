import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT, buildSurveyAccessFilter } from "@/lib/auth";

// GET /api/surveys - Get all surveys with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const sessionCookie = request.cookies.get("sdc_session")?.value;
    const session = sessionCookie ? await verifyJWT(sessionCookie) : null;
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const accessFilter = buildSurveyAccessFilter(session);
    const finalWhere = Object.keys(where).length > 0 ? { AND: [where, accessFilter] } : accessFilter;

    const surveys = await prisma.survey.findMany({
      where: finalWhere,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        _count: {
          select: { questions: true, responses: true },
        },
        metadata: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.survey.count({ where: finalWhere });

    const enrichedSurveys = surveys.map((s) => ({
      ...s,
      metadata: s.metadata
        ? {
            ...s.metadata,
            completionRate:
              s.metadata.totalResponses > 0
                ? (s.metadata.completedResponses / s.metadata.totalResponses) * 100
                : 0,
          }
        : null,
    }));

    return NextResponse.json({
      surveys: enrichedSurveys,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error fetching surveys:", error);
    return NextResponse.json(
      { error: "Failed to fetch surveys" },
      { status: 500 }
    );
  }
}

// POST /api/surveys - Create a new survey
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sessionCookie = request.cookies.get("sdc_session")?.value;
    const session = sessionCookie ? await verifyJWT(sessionCookie) : null;
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const survey = await prisma.survey.create({
      data: {
        title,
        description,
        createdBy: session.userId,
        metadata: {
          create: {},
        },
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        metadata: true,
      },
    });

    return NextResponse.json(survey, { status: 201 });
  } catch (error) {
    console.error("Error creating survey:", error);
    return NextResponse.json(
      { error: "Failed to create survey" },
      { status: 500 }
    );
  }
}
