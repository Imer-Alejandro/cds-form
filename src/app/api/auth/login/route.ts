import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJWT, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || "").toLowerCase().trim();
    const password = (body.password || "").toString();

    if (!email || !password) {
      return NextResponse.json({ error: "Correo y contraseña requeridos" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const sessionToken = await signJWT(
      { userId: user.id, role: user.role, email: user.email, department: user.department || null },
      60 * 60 * 24 * 7
    );

    const res = NextResponse.json({ success: true });
    const secure = process.env.NODE_ENV === "production";
    res.headers.set(
      "Set-Cookie",
      `sdc_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; ${secure ? "Secure;" : ""} Max-Age=${60 * 60 * 24 * 7}`
    );

    return res;
  } catch (error) {
    console.error("login error:", error);
    return NextResponse.json({ error: "No se pudo iniciar sesión" }, { status: 500 });
  }
}
