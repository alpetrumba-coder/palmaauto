import { NextResponse } from "next/server";

import { hashPassword, validatePasswordPlain } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "")
    .toLowerCase()
    .trim();
  const password = String(body.password ?? "");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Укажите корректный email." }, { status: 400 });
  }

  const pwdErr = validatePasswordPlain(password);
  if (pwdErr) {
    return NextResponse.json({ error: pwdErr }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: "Пользователь с таким email уже зарегистрирован." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { email, passwordHash, role: "CUSTOMER" },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
