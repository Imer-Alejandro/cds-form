import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken, signJWT } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || "";
    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 });

    const payload = await verifyMagicToken(token as string);
    if (!payload) return NextResponse.json({ error: "Token invalido o expirado" }, { status: 401 });

    const requestUrl = new URL(request.url);
    const redirectOrigin = process.env.NEXT_PUBLIC_BASE_URL || requestUrl.origin || getBaseUrl();

    let user = null as any;
    if (payload.userId) {
      user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    } else if (payload.email) {
      user = await prisma.user.findUnique({ where: { email: payload.email } });
    } else {
      return NextResponse.json({ error: "Token invalido" }, { status: 401 });
    }

    // New user, or existing user without credentials yet → set name + password first
    if (!user || !user.passwordHash) {
      const registerUrl = new URL("/register", redirectOrigin);
      registerUrl.searchParams.set("token", token);
      return NextResponse.redirect(registerUrl);
    }

    const sessionToken = await signJWT(
      { userId: user.id, role: user.role, email: user.email, department: user.department || null },
      60 * 60 * 24 * 7
    );

    const res = NextResponse.redirect(new URL("/dashboard", redirectOrigin));

    const secure = process.env.NODE_ENV === "production";
    res.headers.set(
      "Set-Cookie",
      `sdc_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; ${secure ? "Secure;" : ""} Max-Age=${60 * 60 * 24 * 7}`
    );

    return res;
  } catch (error) {
    console.error("verify token error:", error);
    return NextResponse.json({ error: "Error verificando token" }, { status: 500 });
  }
}
