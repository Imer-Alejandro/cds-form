import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const surveys = await prisma.survey.findMany({
      where,
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

    const total = await prisma.survey.count({ where });

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
    const { title, description, createdBy } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let userId = createdBy;

    if (!userId) {
      const defaultUser = await prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (!defaultUser) {
        return NextResponse.json(
          { error: "No users found in database" },
          { status: 400 }
        );
      }
      userId = defaultUser.id;
    }

    const survey = await prisma.survey.create({
      data: {
        title,
        description,
        createdBy: userId,
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
