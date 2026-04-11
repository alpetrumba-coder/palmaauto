import { createHash, randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { sendPasswordResetEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

/** Всегда 200 с { ok: true }, чтобы не раскрывать наличие email в базе. */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const email = String(body.email ?? "")
    .toLowerCase()
    .trim();
  if (!email) {
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.passwordHash) {
    const raw = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await sendPasswordResetEmail(email, raw);
  }

  return NextResponse.json({ ok: true });
}
