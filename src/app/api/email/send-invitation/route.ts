import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getSessionFromRequest, canManageSurvey, isAllowedOrigin } from "@/lib/auth";
import { rateLimit, getClientIp, ipKey } from "@/lib/rate-limit";

// POST /api/email/send-invitation - Send survey invitations
export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }

    const ip = getClientIp(request);
    if (!rateLimit(ipKey(ip, "send-invitation"), 20, 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiadas invitaciones. Espera un momento." },
        { status: 429 }
      );
    }

    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { surveyId, emails } = body;

    if (!surveyId || !emails || !Array.isArray(emails)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (!canManageSurvey(session, survey)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const port = parseInt(process.env.PORT || "3000", 10);
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${port}`;
    const surveyUrl = `${baseUrl}/survey/${surveyId}`;

    const results = [];
    for (const email of emails) {
      try {
        await sendEmail({
          to: email,
          subject: `Encuesta: ${survey.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">¡Te invitamos a responder una encuesta!</h2>
              <p style="color: #666; line-height: 1.6;">
                Estamos recopilando tu opinión sobre: <strong>${survey.title}</strong>
              </p>
              <p style="color: #666; line-height: 1.6;">
                ${survey.description || "Tu respuesta es muy importante para nosotros y nos ayudará a mejorar continuamente."}
              </p>
              <div style="margin: 30px 0;">
                <a href="${surveyUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Responder Encuesta
                </a>
              </div>
              <p style="color: #999; font-size: 12px;">
                O copia este enlace: ${surveyUrl}
              </p>
            </div>
          `,
        });

        results.push({ email, status: "sent" });
      } catch (error) {
        results.push({ email, status: "failed", error: String(error) });
      }
    }

    return NextResponse.json({
      message: "Invitations sent",
      results,
      successCount: results.filter((r) => r.status === "sent").length,
      failureCount: results.filter((r) => r.status === "failed").length,
    });
  } catch (error) {
    console.error("Error sending invitations:", error);
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 }
    );
  }
}
