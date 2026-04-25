"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type UserRole } from "@prisma/client";

import { hashPassword, validatePasswordPlain } from "@/lib/password";
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

export type AdminCreateUserPayload = {
  email: string;
  password: string;
  passwordConfirm: string;
  role: UserRole;
} & Omit<AdminUserProfilePayload, "email">;

function validateCreatePayload(p: AdminCreateUserPayload): string | null {
  const profileErr = validatePayload({
    email: p.email,
    lastName: p.lastName,
    firstName: p.firstName,
    patronymic: p.patronymic,
    phone: p.phone,
    address: p.address,
    passportData: p.passportData,
  });
  if (profileErr) return profileErr;

  const pwdErr = validatePasswordPlain(p.password);
  if (pwdErr) return pwdErr;
  if (p.password !== p.passwordConfirm) {
    return "Пароли не совпадают.";
  }
  if (p.role !== "CUSTOMER" && p.role !== "ADMIN") {
    return "Некорректная роль.";
  }
  return null;
}

export async function createAdminUserAction(
  payload: AdminCreateUserPayload,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  await requireAdminPanelSession();

  const err = validateCreatePayload(payload);
  if (err) return { ok: false, error: err };

  const email = payload.email.toLowerCase().trim();

  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken) {
    return { ok: false, error: "Пользователь с таким email уже есть." };
  }

  const passwordHash = await hashPassword(payload.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: payload.role,
      lastName: emptyToNull(payload.lastName),
      firstName: emptyToNull(payload.firstName),
      patronymic: emptyToNull(payload.patronymic),
      phone: emptyToNull(payload.phone),
      address: emptyToNull(payload.address),
      passportData: emptyToNull(payload.passportData),
    },
  });

  revalidatePath("/admin-panel/users");

  return { ok: true, userId: user.id };
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

export async function eraseUserPersonalDataAction(
  userId: string,
  input?: { note?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdminPanelSession();

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { ok: false, error: "Пользователь не найден." };

  const note = input?.note?.trim().slice(0, 2000) || null;

  await prisma.$transaction(async (tx) => {
    await tx.personalDataErasure.create({
      data: {
        userId,
        performedById: null,
        reason: "USER_REQUEST",
        note,
      },
    });

    await tx.booking.updateMany({
      where: { userId },
      data: {
        contractMeta: Prisma.DbNull,
        secondDriverPassportData: null,
        pickupAddress: null,
        pickupTimeSlot: null,
        dropoffAddress: null,
        dropoffTimeSlot: null,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        personalDataErasedAt: new Date(),
        phone: null,
        address: null,
        passportData: null,
        passportSeries: null,
        passportNumber: null,
        passportIssuedBy: null,
        ageYears: null,
      },
    });
  });

  revalidatePath("/admin-panel/users");
  revalidatePath(`/admin-panel/users/${userId}/edit`);

  return { ok: true };
}
