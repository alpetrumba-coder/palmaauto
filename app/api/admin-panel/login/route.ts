import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminPanelCookieName,
  createAdminPanelSessionToken,
  safeStringEqual,
  type AdminPanelSession,
} from "@/lib/admin-panel-session";
import { prisma } from "@/lib/prisma";

/** Пауза при неверном пароле — замедляет подбор. */
const FAIL_DELAY_MS = 600;

async function findStaffSession(login: string, password: string): Promise<AdminPanelSession | null> {
  try {
    const staff = await prisma.staffUser.findUnique({ where: { login } });
    if (!staff || !staff.active) return null;
    if (!(await compare(password, staff.passwordHash))) return null;
    await prisma.staffUser.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });
    return { role: staff.role, staffId: staff.id };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const email = String(body.email ?? "")
    .toLowerCase()
    .trim();
  const password = String(body.password ?? "");

  // 1) личный вход сотрудника; 2) общая учётка владельца из .env (INITIAL_ADMIN_*) — как раньше.
  let session = email && password ? await findStaffSession(email, password) : null;

  if (!session) {
    const emailEnv = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase().trim();
    const passwordEnv = process.env.INITIAL_ADMIN_PASSWORD;
    if (emailEnv && passwordEnv && safeStringEqual(email, emailEnv) && safeStringEqual(password, passwordEnv)) {
      session = { role: "OWNER", staffId: "env" };
    }
  }

  if (!session) {
    await new Promise((r) => setTimeout(r, FAIL_DELAY_MS));
    return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
  }

  let token: string;
  try {
    token = createAdminPanelSessionToken(session);
  } catch {
    return NextResponse.json({ error: "Сервер: задайте AUTH_SECRET." }, { status: 500 });
  }

  const cookieStore = await cookies();
  cookieStore.set(adminPanelCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin-panel",
    maxAge: 7 * 24 * 60 * 60,
  });

  return NextResponse.json({ ok: true });
}
