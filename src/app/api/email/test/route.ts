import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { to } = await request.json();

    if (!to) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:500px;margin:0 auto;padding:40px 20px;">
        <div style="background:#2563eb;border-radius:12px;padding:32px;text-align:center;">
          <h1 style="color:#ffffff;font-size:24px;margin:0;">Configuracion SMTP</h1>
          <p style="color:rgba(255,255,255,0.85);margin:12px 0 0;">Email de prueba enviado exitosamente</p>
        </div>
        <div style="padding:24px 0;text-align:center;">
          <p style="color:#64748b;font-size:14px;">Si recibiste este correo, tu configuracion SMTP funciona correctamente.</p>
          <p style="color:#94a3b8;font-size:12px;margin-top:16px;">SDC Form - Sistema de Encuestas</p>
        </div>
      </div>
    `;

    await sendEmail({ to, subject: "Prueba SMTP - SDC Form", html });

    return NextResponse.json({ message: "Test email sent" });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
