"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPanelSession } from "@/lib/require-admin-panel";
import { prisma } from "@/lib/prisma";

export type AdminUserProfilePayload = {
  email: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  phone: string;
  address: string;
  passportData: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t.length === 0 ? null : t;
}

function validatePayload(p: AdminUserProfilePayload): string | null {
  const email = p.email.toLowerCase().trim();
  if (!email || !EMAIL_RE.test(email)) {
    return "Укажите корректный email.";
  }
  return null;
}

export async function updateAdminUserAction(
  userId: string,
  payload: AdminUserProfilePayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminPanelSession();

  const err = validatePayload(payload);
  if (err) return { ok: false, error: err };

  const email = payload.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    return { ok: false, error: "Пользователь не найден." };
  }

  if (email !== existing.email) {
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken) {
      return { ok: false, error: "Другой пользователь уже использует этот email." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      email,
      lastName: emptyToNull(payload.lastName),
      firstName: emptyToNull(payload.firstName),
      patronymic: emptyToNull(payload.patronymic),
      phone: emptyToNull(payload.phone),
      address: emptyToNull(payload.address),
      passportData: emptyToNull(payload.passportData),
    },
  });

  revalidatePath("/admin-panel/users");
  revalidatePath(`/admin-panel/users/${userId}/edit`);

  return { ok: true };
}
