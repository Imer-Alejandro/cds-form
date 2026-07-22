import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/surveys/[id]/questions - Add a question to survey
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, type, required, options, minValue, maxValue, minLabel, maxLabel } =
      body;

    if (!title || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const lastQuestion = await prisma.question.findFirst({
      where: { surveyId: id },
      orderBy: { order: "desc" },
    });

    const nextOrder = (lastQuestion?.order || 0) + 1;

    const question = await prisma.question.create({
      data: {
        surveyId: id,
        title,
        description: description || null,
        type,
        required: required ?? true,
        order: nextOrder,
        options: Array.isArray(options) ? JSON.stringify(options) : null,
        minValue: minValue ?? null,
        maxValue: maxValue ?? null,
        minLabel: minLabel || null,
        maxLabel: maxLabel || null,
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}

// GET /api/surveys/[id]/questions - Get all questions for a survey
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questions = await prisma.question.findMany({
      where: { surveyId: id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

// PUT /api/surveys/[id]/questions?questionId=... - Update a question
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, type, required, options, minValue, maxValue, minLabel, maxLabel, order } = body;

    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(type !== undefined && { type }),
        ...(required !== undefined && { required }),
        ...(options !== undefined && { options: Array.isArray(options) ? JSON.stringify(options) : null }),
        ...(minValue !== undefined && { minValue }),
        ...(maxValue !== undefined && { maxValue }),
        ...(minLabel !== undefined && { minLabel: minLabel || null }),
        ...(maxLabel !== undefined && { maxLabel: maxLabel || null }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

// DELETE /api/surveys/[id]/questions?questionId=... - Delete a question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId is required" },
        { status: 400 }
      );
    }

    await prisma.question.delete({
      where: { id: questionId },
    });

    return NextResponse.json({ message: "Question deleted" });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}

// PATCH /api/surveys/[id]/questions - Reorder questions
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { error: "orderedIds array is required" },
        { status: 400 }
      );
    }

    const updates = orderedIds.map((questionId: string, index: number) =>
      prisma.question.update({
        where: { id: questionId },
        data: { order: index + 1 },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ message: "Questions reordered" });
  } catch (error) {
    console.error("Error reordering questions:", error);
    return NextResponse.json(
      { error: "Failed to reorder questions" },
      { status: 500 }
    );
  }
}
