import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSurveySummary } from "@/lib/email";
import { calculateCompletionRate } from "@/lib/utils";

// POST /api/email/send-summary - Send survey summary to department leads
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { surveyId } = body;

    if (!surveyId) {
      return NextResponse.json(
        { error: "surveyId is required" },
        { status: 400 }
      );
    }

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        metadata: true,
        departmentConfigs: {
          include: { responsible: true },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const metadata = survey.metadata;
    if (!metadata) {
      return NextResponse.json(
        { error: "Survey metadata not found" },
        { status: 404 }
      );
    }

    const completionRate = calculateCompletionRate(
      metadata.completedResponses,
      metadata.totalResponses
    );

    const results = [];
    for (const config of survey.departmentConfigs) {
      if (config.sendSummary && config.responsible.email) {
        try {
          await sendSurveySummary(
            config.responsible.email,
            survey.title,
            {
              totalResponses: metadata.totalResponses,
              completedResponses: metadata.completedResponses,
              completionRate,
            }
          );

          results.push({
            department: config.department,
            email: config.responsible.email,
            status: "sent",
          });
        } catch (error) {
          results.push({
            department: config.department,
            email: config.responsible.email,
            status: "failed",
            error: String(error),
          });
        }
      }
    }

    return NextResponse.json({
      message: "Summaries sent",
      results,
      successCount: results.filter((r) => r.status === "sent").length,
      failureCount: results.filter((r) => r.status === "failed").length,
    });
  } catch (error) {
    console.error("Error sending summaries:", error);
    return NextResponse.json(
      { error: "Failed to send summaries" },
      { status: 500 }
    );
  }
}
