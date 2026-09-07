import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyMagicToken, generateMagicToken } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/utils";
import { rateLimit, getClientIp, ipKey } from "@/lib/rate-limit";

// POST /api/auth/reset-password
// Body: { email } -> Envia un enlace de restablecimiento por email
// Body: { token, email, password } -> Realiza el restablecimiento (verificado por token)
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ipKey(ip, "reset-password"), 5, 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Espera un momento." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const email = (body.email || "").toLowerCase().trim();
    const token = (body.token || "").toString();
    const password = (body.password || "").toString();

    // Flujo de solicitud: enviar enlace por email
    if (email && !token && !password) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        // No revelar si el usuario existe
        return NextResponse.json({ success: true });
      }

      const resetToken = await generateMagicToken(
        { userId: user.id, email: user.email, purpose: "password_reset" },
        60 * 15
      );
      const base = process.env.NEXT_PUBLIC_BASE_URL || getBaseUrl();
      const link = `${base}/api/auth/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(user.email)}`;

      await sendEmail({
        to: user.email,
        subject: "Restablece tu contraseña — SDC Form",
        html: `<p>Hola ${user.name || user.email.split("@")[0] || ""},</p>
               <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente enlace — expira en 15 minutos:</p>
               <p><a href="${link}" style="background:#2563eb;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;">Restablecer contraseña</a></p>
               <p>Si no solicitaste este cambio, ignora este correo.</p>`,
      });

      return NextResponse.json({ success: true });
    }

    // Flujo de confirmacion: token + nueva contraseña
    if (email && token && password) {
      if (password.length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
      }

      const payload = await verifyMagicToken(token);
      if (!payload || payload.purpose !== "password_reset") {
        return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 401 });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || String(payload.userId) !== user.id) {
        return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Parámetros inválidos" },
      { status: 400 }
    );
  } catch (error) {
    console.error("reset-password error:", error);
    return NextResponse.json({ error: "No se pudo procesar la solicitud" }, { status: 500 });
  }
}

// GET /api/auth/reset-password - Muestra el enlace de reset con token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || "";
    const email = searchParams.get("email") || "";

    if (!token || !email) {
      return NextResponse.json({ error: "Enlace inválido" }, { status: 400 });
    }

    const payload = await verifyMagicToken(token);
    if (!payload || payload.purpose !== "password_reset") {
      return NextResponse.json({ error: "Enlace inválido o expirado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || String(payload.userId) !== user.id) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL || getBaseUrl();
    const resetUrl = new URL("/login?reset=1", base);
    resetUrl.searchParams.set("token", token);
    resetUrl.searchParams.set("email", email);
    return NextResponse.redirect(resetUrl);
  } catch (error) {
    console.error("reset-password GET error:", error);
    return NextResponse.json({ error: "Error verificando enlace" }, { status: 500 });
  }
}
