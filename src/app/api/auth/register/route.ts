import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMagicToken, hashPassword } from "@/lib/auth";
import { rateLimit, getClientIp, ipKey } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(ipKey(ip, "register"), 10, 60 * 1000)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera un momento." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const token = (body.token || "").toString();
    const name = (body.name || "").trim();
    const password = (body.password || "").toString();

    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const payload = await verifyMagicToken(token);
    if (!payload) return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });

    const email = (payload.email || "").toLowerCase().trim();
    if (!email) return NextResponse.json({ error: "Token inválido" }, { status: 401 });

    let user = await prisma.user.findUnique({ where: { email } });

    if (user && user.passwordHash) {
      return NextResponse.json({ error: "Este correo ya tiene una cuenta. Inicia sesión." }, { status: 409 });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: "VIEWER",
          passwordHash: await hashPassword(password),
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name, passwordHash: await hashPassword(password) },
      });
    }

    return NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error("register error:", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta" }, { status: 500 });
  }
}
