import type { BookingStatus } from "@prisma/client";

export type AdminBookingPaymentStatus = "PENDING_PAYMENT" | "PARTIALLY_PAID" | "PAID";

export function bookingStatusToPaymentStatus(status: BookingStatus): AdminBookingPaymentStatus {
  if (status === "PAID") return "PAID";
  if (status === "PARTIALLY_PAID") return "PARTIALLY_PAID";
  return "PENDING_PAYMENT";
}

export function resolveBookingPayment(
  status: AdminBookingPaymentStatus,
  totalPriceRub: number,
  paidAmountRub: number,
): { ok: true; status: BookingStatus; paidAmountRub: number } | { ok: false; error: string } {
  if (status === "PENDING_PAYMENT") {
    if (paidAmountRub !== 0) {
      return { ok: false, error: "При статусе «ожидает оплаты» предоплата должна быть 0 ₽." };
    }
    return { ok: true, status: "PENDING_PAYMENT", paidAmountRub: 0 };
  }
  if (status === "PARTIALLY_PAID") {
    if (paidAmountRub <= 0) {
      return { ok: false, error: "Укажите сумму предоплаты больше 0." };
    }
    if (paidAmountRub >= totalPriceRub) {
      return { ok: false, error: "При частичной оплате предоплата должна быть меньше общей суммы." };
    }
    return { ok: true, status: "PARTIALLY_PAID", paidAmountRub };
  }
  if (paidAmountRub < totalPriceRub) {
    return { ok: false, error: "При полной оплате предоплата должна равняться общей сумме заказа." };
  }
  return { ok: true, status: "PAID", paidAmountRub: totalPriceRub };
}
