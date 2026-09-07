import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateMagicToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/utils";
import { rateLimit, getClientIp, ipKey } from "@/lib/rate-limit";

const ALLOWED_DOMAINS = ["sanchezbusinesscorp.com", "kexford.com", "jsanchezcomercial.com"];

function isAllowedDomain(email: string) {
  const domain = email.toLowerCase().split("@")?.[1];
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ipKey(ip, "send-link"), 5, 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Espera un momento." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = (body.email || "").toLowerCase().trim();
    const mode = (body.mode || "login").toString();

    if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    if (!isAllowedDomain(email)) {
      return NextResponse.json({ error: "Solo se permiten correos corporativos autorizados" }, { status: 403 });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (mode === "login" && !user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const payload = user
      ? { userId: user.id, email: user.email }
      : { email, mode };

    const token = await generateMagicToken(payload);
    const base = process.env.NEXT_PUBLIC_BASE_URL || getBaseUrl();
    const link = `${base}/api/auth/verify?token=${encodeURIComponent(token)}`;

    await sendEmail({
      to: email,
      subject: mode === "register" ? "Registra tu acceso a SDC Form" : "Accede a SDC Form — enlace mágico",
      html: `<p>Hola ${email.split("@")[0] || ""},</p>
             <p>Haz clic en el siguiente enlace para ${mode === "register" ? "registrarte y entrar" : "iniciar sesión"} — expira en 15 minutos:</p>
             <p><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;">${mode === "register" ? "Crear acceso" : "Iniciar sesión"}</a></p>
             <p>Si no solicitaste este enlace, ignora este correo.</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("send-link error:", error);
    return NextResponse.json({ error: "No se pudo enviar el enlace" }, { status: 500 });
  }
}
