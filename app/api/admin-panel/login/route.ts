import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminPanelCookieName,
  createAdminPanelSessionToken,
  safeStringEqual,
} from "@/lib/admin-panel-session";

export async function POST(req: Request) {
  const loginEnv = process.env.ADMIN_PANEL_LOGIN;
  const passwordEnv = process.env.ADMIN_PANEL_PASSWORD;

  if (!loginEnv || !passwordEnv) {
    return NextResponse.json(
      { error: "Админ-панель не настроена (ADMIN_PANEL_LOGIN / ADMIN_PANEL_PASSWORD)." },
      { status: 503 },
    );
  }

  let body: { login?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const login = String(body.login ?? "");
  const password = String(body.password ?? "");

  if (!safeStringEqual(login, loginEnv) || !safeStringEqual(password, passwordEnv)) {
    return NextResponse.json({ error: "Неверный логин или пароль." }, { status: 401 });
  }

  let token: string;
  try {
    token = createAdminPanelSessionToken();
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
