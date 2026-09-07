import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetTransporter } from "@/lib/email";
import { getSessionFromRequest, isAllowedOrigin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const config = await prisma.sMTPConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    if (!config) {
      return NextResponse.json(null);
    }
    return NextResponse.json({
      id: config.id,
      host: config.host,
      port: config.port,
      user: config.user,
      fromName: config.fromName,
      fromEmail: config.fromEmail,
      secure: config.secure,
    });
  } catch (error) {
    console.error("Error fetching SMTP config:", error);
    return NextResponse.json({ error: "Failed to fetch SMTP config" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
    }

    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo el administrador puede configurar SMTP" }, { status: 403 });
    }

    const body = await request.json();
    const { host, port, user, password, fromName, fromEmail, secure } = body;

    if (!host || !user || !fromEmail) {
      return NextResponse.json(
        { error: "host, user, and fromEmail are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.sMTPConfig.findFirst({ where: { isActive: true } });

    if (existing) {
      await prisma.sMTPConfig.update({
        where: { id: existing.id },
        data: {
          host,
          port: port || 587,
          user,
          ...(password && { password }),
          fromName: fromName || "SDC Form",
          fromEmail,
          secure: secure || false,
        },
      });
    } else {
      await prisma.sMTPConfig.create({
        data: {
          host,
          port: port || 587,
          user,
          password: password || "",
          fromName: fromName || "SDC Form",
          fromEmail,
          secure: secure || false,
        },
      });
    }

    resetTransporter();

    return NextResponse.json({ message: "SMTP configuration saved" });
  } catch (error) {
    console.error("Error saving SMTP config:", error);
    return NextResponse.json({ error: "Failed to save SMTP config" }, { status: 500 });
  }
}
