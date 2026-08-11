import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.headers.set(
    "Set-Cookie",
    `sdc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;`
  );
  return res;
}
