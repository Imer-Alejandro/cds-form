import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const result = await transporter.sendMail({
      from: options.from || process.env.SMTP_USER,
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

export async function sendSurveyInvitation(
  email: string,
  surveyTitle: string,
  surveyUrl: string
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">¡Te invitamos a responder una encuesta!</h2>
      <p style="color: #666; line-height: 1.6;">
        Estamos recopilando tu opinión sobre: <strong>${surveyTitle}</strong>
      </p>
      <p style="color: #666; line-height: 1.6;">
        Tu respuesta es muy importante para nosotros y nos ayudará a mejorar continuamente.
      </p>
      <div style="margin: 30px 0;">
        <a href="${surveyUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
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
    text: `Te invitamos a responder la encuesta: ${surveyTitle}\n\nEnlace: ${surveyUrl}`,
  });
}

export async function sendSurveySummary(
  email: string,
  surveyTitle: string,
  summaryData: {
    totalResponses: number;
    completedResponses: number;
    completionRate: number;
  }
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Resumen de Encuesta: ${surveyTitle}</h2>
      
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #1e40af; margin-top: 0;">Estadísticas Generales</h3>
        <p style="color: #333; margin: 10px 0;">
          <strong>Total de respuestas:</strong> ${summaryData.totalResponses}
        </p>
        <p style="color: #333; margin: 10px 0;">
          <strong>Respuestas completadas:</strong> ${summaryData.completedResponses}
        </p>
        <p style="color: #333; margin: 10px 0;">
          <strong>Tasa de finalización:</strong> ${summaryData.completionRate.toFixed(2)}%
        </p>
      </div>

      <p style="color: #666; margin-top: 30px;">
        Accede al dashboard para ver el análisis detallado de resultados.
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: `Resumen - Encuesta: ${surveyTitle}`,
    html,
  });
}
