import type { Prisma } from "@prisma/client";

/** Данные арендатора, сохраняемые в `Booking.contractMeta` и используемые в PDF. */
export type BookingContractMeta = {
  fullName: string;
  birthYear: number;
  ageYears: number;
  passportSeries: string;
  passportNumber: string;
  passportIssuedBy: string;
  additionalDriverName?: string;
  additionalDriverPassport?: string;
};

export type ContractFormInput = {
  fullName: string;
  birthYear: string;
  ageYears: string;
  passportSeries: string;
  passportNumber: string;
  passportIssuedBy: string;
  additionalDriverName: string;
  additionalDriverPassport: string;
};

const NAME_RE = /^[\p{L}\s.\-']+$/u;

export function validateContractForm(input: ContractFormInput): { ok: true; meta: BookingContractMeta } | { ok: false; error: string } {
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  if (fullName.length < 5 || fullName.length > 200) {
    return { ok: false, error: "Укажите ФИО полностью (как в паспорте)." };
  }
  if (!NAME_RE.test(fullName)) {
    return { ok: false, error: "ФИО содержит недопустимые символы." };
  }

  const birthYear = Number.parseInt(input.birthYear.trim(), 10);
  const ageYears = Number.parseInt(input.ageYears.trim(), 10);
  const y = new Date().getUTCFullYear();
  if (!Number.isFinite(birthYear) || birthYear < 1940 || birthYear > y - 18) {
    return { ok: false, error: "Укажите корректный год рождения." };
  }
  if (!Number.isFinite(ageYears) || ageYears < 18 || ageYears > 100) {
    return { ok: false, error: "Укажите возраст (полных лет) от 18 до 100." };
  }
  const expectedAge = y - birthYear;
  if (Math.abs(expectedAge - ageYears) > 1) {
    return { ok: false, error: "Год рождения и возраст не совпадают. Проверьте данные." };
  }

  const passportSeries = input.passportSeries.trim();
  const passportNumber = input.passportNumber.trim();
  const passportIssuedBy = input.passportIssuedBy.trim();
  if (passportSeries.length < 2 || passportSeries.length > 20) {
    return { ok: false, error: "Укажите серию паспорта." };
  }
  if (passportNumber.length < 2 || passportNumber.length > 20) {
    return { ok: false, error: "Укажите номер паспорта." };
  }
  if (passportIssuedBy.length < 5 || passportIssuedBy.length > 500) {
    return { ok: false, error: "Укажите, кем и когда выдан паспорт (не короче 5 символов)." };
  }

  const addName = input.additionalDriverName.trim();
  const addPass = input.additionalDriverPassport.trim();
  if (addName.length > 0 || addPass.length > 0) {
    if (addName.length < 3 || addPass.length < 5) {
      return { ok: false, error: "Для дополнительного водителя укажите ФИО и паспорт (серия и номер) полностью или оставьте оба поля пустыми." };
    }
  }

  const meta: BookingContractMeta = {
    fullName,
    birthYear,
    ageYears,
    passportSeries,
    passportNumber,
    passportIssuedBy,
    ...(addName ? { additionalDriverName: addName, additionalDriverPassport: addPass } : {}),
  };

  return { ok: true, meta };
}

export function parseBookingContractMeta(raw: Prisma.JsonValue | null | undefined): BookingContractMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.fullName !== "string" ||
    typeof o.birthYear !== "number" ||
    typeof o.ageYears !== "number" ||
    typeof o.passportSeries !== "string" ||
    typeof o.passportNumber !== "string" ||
    typeof o.passportIssuedBy !== "string"
  ) {
    return null;
  }
  const meta: BookingContractMeta = {
    fullName: o.fullName,
    birthYear: o.birthYear,
    ageYears: o.ageYears,
    passportSeries: o.passportSeries,
    passportNumber: o.passportNumber,
    passportIssuedBy: o.passportIssuedBy,
  };
  if (typeof o.additionalDriverName === "string" && typeof o.additionalDriverPassport === "string") {
    meta.additionalDriverName = o.additionalDriverName;
    meta.additionalDriverPassport = o.additionalDriverPassport;
  }
  return meta;
}
