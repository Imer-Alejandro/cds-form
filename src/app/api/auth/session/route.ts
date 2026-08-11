import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get("sdc_session")?.value;
  const session = sessionCookie ? await verifyJWT(sessionCookie) : null;

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true, user: { userId: session.userId, role: session.role, email: session.email, department: session.department || null } });
}
