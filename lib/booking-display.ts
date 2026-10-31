import type { User } from "@prisma/client";

import { formatRuFullName } from "@/lib/ru-full-name";

/** Подпись на полосе брони в шахматке: ФИО или email. */
export function formatBookingUserLabel(
  user: Pick<User, "email" | "firstName" | "lastName" | "patronymic">,
): string {
  const fio = formatRuFullName({
    lastName: user.lastName,
    firstName: user.firstName,
    patronymic: user.patronymic,
  });
  return fio.length > 0 ? fio : user.email;
}

export type BookingGuestLabelSource = {
  guestLastName?: string | null;
  guestFirstName?: string | null;
  guestPatronymic?: string | null;
  guestPhone?: string | null;
  guestMessenger?: string | null;
  user?: Pick<User, "email" | "firstName" | "lastName" | "patronymic" | "phone"> | null;
};

/** ФИО туриста с брони; если пусто — из карточки пользователя сайта. */
export function formatBookingGuestLabel(b: BookingGuestLabelSource): string {
  const fio = formatRuFullName({
    lastName: b.guestLastName,
    firstName: b.guestFirstName,
    patronymic: b.guestPatronymic,
  });
  if (fio.length > 0) return fio;
  if (b.user) return formatBookingUserLabel(b.user);
  return "Без имени";
}

export function bookingGuestPhone(b: BookingGuestLabelSource): string | null {
  const phone = b.guestPhone?.trim() || b.user?.phone?.trim() || "";
  return phone.length > 0 ? phone : null;
}
