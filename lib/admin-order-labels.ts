import type { BookingStatus } from "@prisma/client";

export const bookingStatusLabelRu: Record<BookingStatus, string> = {
  DRAFT: "Черновик",
  PENDING_PAYMENT: "Ожидает оплаты",
  PARTIALLY_PAID: "Частично оплачено",
  PAID: "Оплачено",
  CANCELLED: "Отменено",
};
