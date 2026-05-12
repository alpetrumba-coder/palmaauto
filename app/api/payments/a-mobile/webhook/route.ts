import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function parsePlanFromComment(comment: string): "FULL" | "FIRST_DAY" | null {
  // ожидаемый формат: "PALMAAUTO;booking=<id>;plan=FULL"
  const m = comment.match(/(?:^|[;&\s])plan=(FULL|FIRST_DAY)(?:$|[;&\s])/);
  return m?.[1] === "FULL" || m?.[1] === "FIRST_DAY" ? m[1] : null;
}

function xmlOk(): Response {
  return new Response(`<response><result>0</result></response>`, {
    status: 200,
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  const secret = (process.env.AMOBILE_TSP_SECRET ?? "").trim();
  if (!secret) {
    // если секрет не задан — лучше явно сообщить, чтобы A‑Mobile ретраил, а мы не теряли уведомление
    return new Response("Server misconfigured", { status: 503 });
  }

  let fields: Record<string, string> = {};
  try {
    // A‑Mobile обычно шлёт form-urlencoded параметры
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      fields = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, safeStr(v)]));
    } else {
      const fd = await req.formData();
      fields = Object.fromEntries(Array.from(fd.entries()).map(([k, v]) => [k, safeStr(v)]));
    }
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const id = safeStr(fields.id);
  const order_id = safeStr(fields.order_id);
  const sum = safeStr(fields.sum);
  const order_date = safeStr(fields.order_date);
  const user_id = safeStr(fields.user_id);
  const pay_type = safeStr(fields.pay_type);
  const comment = safeStr(fields.comment);
  const signature = safeStr(fields.signature);

  if (!id || !order_id || !sum || !signature) {
    return new Response("Missing fields", { status: 400 });
  }

  const base = `${id};${order_id};${sum};${order_date};${user_id};${pay_type};${comment};${secret}`;
  const expected = sha256Hex(base);
  if (expected.toLowerCase() !== signature.toLowerCase()) {
    return new Response("Invalid signature", { status: 401 });
  }

  // order_id у нас = booking.id
  const booking = await prisma.booking.findUnique({ where: { id: order_id }, include: { car: true } });
  if (!booking) {
    // чтобы A‑Mobile не ретраил бесконечно, можно отвечать ОК даже если бронь не найдена
    return xmlOk();
  }

  const paidRub = Math.max(0, Math.round(Number.parseFloat(sum) || 0));
  if (paidRub <= 0) {
    return xmlOk();
  }

  // Идемпотентность: если уже оплачено (или оплачено больше/равно), просто подтверждаем получение
  if ((booking.status === "PAID" || booking.status === "PARTIALLY_PAID") && (booking.paidAmountRub ?? 0) >= paidRub) {
    return xmlOk();
  }

  const planFromComment = parsePlanFromComment(comment);
  const isPartial = planFromComment === "FIRST_DAY" || paidRub < (booking.totalPriceRub ?? 0);
  const nextStatus = isPartial ? "PARTIALLY_PAID" : "PAID";
  const nextPlan = planFromComment ?? (isPartial ? "FIRST_DAY" : "FULL");

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: nextStatus,
      paymentPlan: nextPlan,
      paidAmountRub: paidRub,
    },
  });

  return xmlOk();
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

