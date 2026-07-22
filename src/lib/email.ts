import nodemailer from "nodemailer";
import { prisma } from "./prisma";

async function getTransporter(): Promise<nodemailer.Transporter> {
  try {
    const smtpConfig = await prisma.sMTPConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (smtpConfig) {
      return nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: { user: smtpConfig.user, pass: smtpConfig.password },
      });
    }
  } catch (error) {
    console.error("Failed to load SMTP config from DB:", error);
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

export function resetTransporter() {}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
  try {
    const transporter = await getTransporter();
    const smtpConfig = await prisma.sMTPConfig.findFirst({ where: { isActive: true } });
    const fromAddress = smtpConfig
      ? `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`
      : process.env.SMTP_USER;

    const result = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

export function buildExecutiveSummaryEmail(data: {
  surveyTitle: string;
  totalResponses: number;
  completedResponses: number;
  abandonedResponses: number;
  completionRate: number;
  averageRating?: number | null;
  sentimentScore: number;
  sentimentLabel: string;
  satisfactionRate: number;
  npsScore?: number | null;
  keyFindings: string[];
  questionSummaries: { title: string; type: string; summary: string }[];
  surveyUrl: string;
}): string {
  const sentimentColor =
    data.sentimentScore >= 0.6 ? "#16a34a" : data.sentimentScore >= 0.4 ? "#d97706" : "#dc2626";
  const sentimentBg =
    data.sentimentScore >= 0.6 ? "#f0fdf4" : data.sentimentScore >= 0.4 ? "#fffbeb" : "#fef2f2";
  const npsDisplay = data.npsScore != null ? `${data.npsScore > 0 ? "+" : ""}${data.npsScore}` : "N/A";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <tr><td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:32px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">Resumen Ejecutivo</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${data.surveyTitle}</p>
        </td></tr>

        <tr><td style="padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="25%" style="padding:12px;text-align:center;background:#f0f9ff;border-radius:8px;">
                <div style="font-size:28px;font-weight:700;color:#1e40af;">${data.totalResponses}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">Total</div>
              </td>
              <td width="4%"></td>
              <td width="25%" style="padding:12px;text-align:center;background:#f0fdf4;border-radius:8px;">
                <div style="font-size:28px;font-weight:700;color:#16a34a;">${data.completedResponses}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">Completadas</div>
              </td>
              <td width="4%"></td>
              <td width="25%" style="padding:12px;text-align:center;background:#fef2f2;border-radius:8px;">
                <div style="font-size:28px;font-weight:700;color:#dc2626;">${data.abandonedResponses}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">Abandonadas</div>
              </td>
              <td width="4%"></td>
              <td width="12%" style="padding:12px;text-align:center;background:#f5f3ff;border-radius:8px;">
                <div style="font-size:28px;font-weight:700;color:#7c3aed;">${data.completionRate.toFixed(0)}%</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">Finalizacion</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>

        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 20px;font-size:18px;font-weight:600;color:#1e293b;">Sentimiento General</h2>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="vertical-align:top;">
                <div style="background:${sentimentBg};border:1px solid ${sentimentColor}20;border-radius:8px;padding:20px;text-align:center;">
                  <div style="font-size:36px;font-weight:700;color:${sentimentColor};">${data.sentimentLabel}</div>
                  <div style="font-size:13px;color:#64748b;margin-top:4px;">Puntuacion: ${(data.sentimentScore * 100).toFixed(0)}%</div>
                </div>
              </td>
              <td width="5%"></td>
              <td width="45%" style="vertical-align:top;">
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                  <tr>
                    <td style="padding:8px 0;color:#64748b;">Satisfaccion</td>
                    <td style="padding:8px 0;text-align:right;font-weight:600;color:#1e293b;">${data.satisfactionRate.toFixed(0)}%</td>
                  </tr>
                  ${data.averageRating != null ? `
                  <tr>
                    <td style="padding:8px 0;color:#64748b;">Calificacion Promedio</td>
                    <td style="padding:8px 0;text-align:right;font-weight:600;color:#1e293b;">${data.averageRating.toFixed(1)} / 5</td>
                  </tr>` : ""}
                  ${data.npsScore != null ? `
                  <tr>
                    <td style="padding:8px 0;color:#64748b;">NPS Score</td>
                    <td style="padding:8px 0;text-align:right;font-weight:600;color:${Number(npsDisplay) >= 0 ? "#16a34a" : "#dc2626"};">${npsDisplay}</td>
                  </tr>` : ""}
                </table>
              </td>
            </tr>
          </table>
        </td></tr>

        ${data.keyFindings.length > 0 ? `
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1e293b;">Hallazgos Clave</h2>
          <ul style="margin:0;padding-left:20px;">
            ${data.keyFindings.map((f) => `<li style="padding:4px 0;color:#475569;font-size:14px;line-height:1.5;">${f}</li>`).join("")}
          </ul>
        </td></tr>` : ""}

        ${data.questionSummaries.length > 0 ? `
        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1e293b;">Resumen por Pregunta</h2>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${data.questionSummaries.map((q) => `
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;">
                <div style="font-size:14px;font-weight:500;color:#1e293b;">${q.title}</div>
                <div style="font-size:13px;color:#64748b;margin-top:2px;">${q.summary}</div>
              </td>
            </tr>`).join("")}
          </table>
        </td></tr>` : ""}

        <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>
        <tr><td style="padding:32px 40px;" align="center">
          <a href="${data.surveyUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;">Ver Resultados Completos</a>
        </td></tr>

        <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Este es un reporte generado automaticamente por SDC Form</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendSurveyInvitation(
  email: string,
  surveyTitle: string,
  surveyUrl: string
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Te invitamos a responder una encuesta</h2>
      <p style="color: #666; line-height: 1.6;">
        Estamos recopilando tu opinion sobre: <strong>${surveyTitle}</strong>
      </p>
      <p style="color: #666; line-height: 1.6;">
        Tu respuesta es muy importante para nosotros y nos ayudara a mejorar continuamente.
      </p>
      <div style="margin: 30px 0;">
        <a href="${surveyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
          Responder Encuesta
        </a>
      </div>
      <p style="color: #999; font-size: 12px;">
        O copia este enlace en tu navegador: ${surveyUrl}
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      <p style="color: #999; font-size: 12px;">
        Esta es una encuesta corporativa. Por favor, no respondas si no eres la persona destinataria.
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Encuesta: ${surveyTitle}`,
    html,
  });
}
