import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminPanelCookieName,
  createAdminPanelSessionToken,
  safeStringEqual,
} from "@/lib/admin-panel-session";

export async function POST(req: Request) {
  const emailEnv = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase().trim();
  const passwordEnv = process.env.INITIAL_ADMIN_PASSWORD;

  if (!emailEnv || !passwordEnv) {
    return NextResponse.json(
      { error: "Задайте INITIAL_ADMIN_EMAIL и INITIAL_ADMIN_PASSWORD в .env (те же, что для сида админа)." },
      { status: 503 },
    );
  }

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

  if (!safeStringEqual(email, emailEnv) || !safeStringEqual(password, passwordEnv)) {
    return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
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
