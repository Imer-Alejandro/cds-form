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
    const { department, responsibleEmail, sendSummary, sendOnCompletion, summaryFrequency } = body;

    if (!department || !responsibleEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({
      where: { email: responsibleEmail },
    });

    if (!user) {
      user = await prisma.user.create({
          data: {
            email: responsibleEmail,
            name: responsibleEmail.split("@")[0],
          },
        });
    }

    const existing = await prisma.departmentConfig.findFirst({
      where: { surveyId: id, department },
    });

    let config;
    if (existing) {
      config = await prisma.departmentConfig.update({
        where: { id: existing.id },
        data: {
          responsibleId: user.id,
          sendSummary: sendSummary ?? true,
          sendOnCompletion: sendOnCompletion ?? false,
          summaryFrequency: summaryFrequency || "DAILY",
        },
        include: {
          responsible: { select: { id: true, name: true, email: true } },
        },
      });
    } else {
      config = await prisma.departmentConfig.create({
        data: {
          surveyId: id,
          department,
          responsibleId: user.id,
          sendSummary: sendSummary ?? true,
          sendOnCompletion: sendOnCompletion ?? false,
          summaryFrequency: summaryFrequency || "DAILY",
        },
        include: {
          responsible: { select: { id: true, name: true, email: true } },
        },
      });
    }

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error("Error creating department config:", error);
    return NextResponse.json(
      { error: "Failed to create department config" },
      { status: 500 }
    );
  }
}

// PUT /api/surveys/[id]/department-config
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { configId, department, responsibleEmail, sendSummary, sendOnCompletion, summaryFrequency } = body;

    if (!configId) {
      return NextResponse.json({ error: "configId is required" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (department !== undefined) updateData.department = department;
    if (sendSummary !== undefined) updateData.sendSummary = sendSummary;
    if (sendOnCompletion !== undefined) updateData.sendOnCompletion = sendOnCompletion;
    if (summaryFrequency !== undefined) updateData.summaryFrequency = summaryFrequency;

    if (responsibleEmail) {
      let user = await prisma.user.findUnique({ where: { email: responsibleEmail } });
      if (!user) {
        user = await prisma.user.create({
          data: { email: responsibleEmail, name: responsibleEmail.split("@")[0] },
        });
      }
      updateData.responsibleId = user.id;
    }

    const config = await prisma.departmentConfig.update({
      where: { id: configId },
      data: updateData,
      include: {
        responsible: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error updating department config:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/surveys/[id]/department-config
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get("configId");

    if (!configId) {
      return NextResponse.json({ error: "configId is required" }, { status: 400 });
    }

    await prisma.departmentConfig.delete({ where: { id: configId } });

    return NextResponse.json({ message: "Department config deleted" });
  } catch (error) {
    console.error("Error deleting department config:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
