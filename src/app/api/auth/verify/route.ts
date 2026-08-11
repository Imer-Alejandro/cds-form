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
    if (!payload || !payload.userId) return NextResponse.json({ error: "Token invalido o expirado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    // Create session token (7 days) and include department for RBAC
    const sessionToken = await signJWT(
      { userId: user.id, role: user.role, department: user.department || null },
      60 * 60 * 24 * 7
    );

    const requestUrl = new URL(request.url);
    const redirectOrigin = process.env.NEXT_PUBLIC_BASE_URL || requestUrl.origin || getBaseUrl();
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
