import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/surveys/[id]/department-config
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { department, responsibleEmail, sendSummary, summaryFrequency } = body;

    if (!department || !responsibleEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: responsibleEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const config = await prisma.departmentConfig.create({
      data: {
        surveyId: id,
        department,
        responsibleId: user.id,
        sendSummary,
        summaryFrequency,
      },
      include: {
        responsible: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error("Error creating department config:", error);
    return NextResponse.json(
      { error: "Failed to create department config" },
      { status: 500 }
    );
  }
}
