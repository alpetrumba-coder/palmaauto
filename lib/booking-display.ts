import type { User } from "@prisma/client";

/** Подпись на полосе брони в шахматке: ФИО или email. */
export function formatBookingUserLabel(user: Pick<User, "email" | "firstName" | "lastName" | "patronymic">): string {
  const fio = [user.lastName, user.firstName, user.patronymic].filter(Boolean).join(" ").trim();
  return fio.length > 0 ? fio : user.email;
}
