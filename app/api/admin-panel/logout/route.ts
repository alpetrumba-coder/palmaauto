import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminPanelCookieName } from "@/lib/admin-panel-session";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(adminPanelCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin-panel",
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}
