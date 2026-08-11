import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMagicToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { generateSurveyUrl, getBaseUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || "").toLowerCase();
    if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, name: email.split("@")[0] } });
    }

    const token = await generateMagicToken({ userId: user.id, email: user.email });
    const base = process.env.NEXT_PUBLIC_BASE_URL || getBaseUrl();
    const link = `${base}/api/auth/verify?token=${encodeURIComponent(token)}`;

    await sendEmail({
      to: user.email,
      subject: "Accede a SDC Form — enlace mágico",
      html: `<p>Hola ${user.name || ""},</p>
             <p>Haz clic en el siguiente enlace para iniciar sesión — expira en 15 minutos:</p>
             <p><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;">Iniciar sesión</a></p>
             <p>Si no solicitaste este enlace, ignora este correo.</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("send-link error:", error);
    return NextResponse.json({ error: "No se pudo enviar el enlace" }, { status: 500 });
  }
}
