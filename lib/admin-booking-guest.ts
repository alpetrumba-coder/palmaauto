import { splitRuFullName } from "@/lib/ru-full-name";

export type AdminBookingGuestInput = {
  fullName: string;
  birthYear: string;
  passportSeries: string;
  passportNumber: string;
  phone: string;
  messenger: string;
};

export type AdminBookingGuestParsed = {
  guestLastName: string | null;
  guestFirstName: string | null;
  guestPatronymic: string | null;
  guestBirthYear: number | null;
  guestPassportSeries: string | null;
  guestPassportNumber: string | null;
  guestPhone: string | null;
  guestMessenger: string | null;
};

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t.length > 0 ? t : null;
}

/** Разбор и проверка полей туриста для брони из админки. */
export function parseAdminBookingGuest(
  input: AdminBookingGuestInput,
): { ok: true; guest: AdminBookingGuestParsed } | { ok: false; error: string } {
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  if (fullName.length < 2) {
    return { ok: false, error: "Укажите ФИО туриста." };
  }
  const { lastName, firstName, patronymic } = splitRuFullName(fullName);
  if (!lastName || !firstName) {
    return { ok: false, error: "Укажите фамилию и имя (отчество — по желанию)." };
  }

  const phone = emptyToNull(input.phone);
  if (!phone) {
    return { ok: false, error: "Укажите телефон туриста." };
  }

  const birthRaw = input.birthYear.trim();
  if (!birthRaw) {
    return { ok: false, error: "Укажите год рождения." };
  }
  const y = Number.parseInt(birthRaw, 10);
  const current = new Date().getFullYear();
  if (!Number.isFinite(y) || y < 1920 || y > current - 18) {
    return { ok: false, error: "Укажите корректный год рождения (туристу должно быть не меньше 18 лет)." };
  }
  const guestBirthYear = y;

  const guestPassportSeries = emptyToNull(input.passportSeries);
  const guestPassportNumber = emptyToNull(input.passportNumber);
  if ((guestPassportSeries && !guestPassportNumber) || (!guestPassportSeries && guestPassportNumber)) {
    return { ok: false, error: "Укажите и серию, и номер паспорта — или оставьте оба поля пустыми." };
  }

  return {
    ok: true,
    guest: {
      guestLastName: lastName,
      guestFirstName: firstName,
      guestPatronymic: patronymic,
      guestBirthYear,
      guestPassportSeries,
      guestPassportNumber,
      guestPhone: phone,
      guestMessenger: emptyToNull(input.messenger),
    },
  };
}
