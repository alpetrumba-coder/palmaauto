import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { hashPassword, validatePasswordPlain } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const raw = String(body.token ?? "");
  const password = String(body.password ?? "");

  if (!raw || !password) {
    return NextResponse.json({ error: "Заполните все поля." }, { status: 400 });
  }

  const pwdErr = validatePasswordPlain(password);
  if (pwdErr) {
    return NextResponse.json({ error: pwdErr }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(raw).digest("hex");

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) {
    return NextResponse.json({ error: "Ссылка недействительна или истекла." }, { status: 400 });
  }

  const newHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: newHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
