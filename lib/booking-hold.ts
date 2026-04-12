/** Неоплаченная бронь удерживает машину не дольше этого времени (мс). */
export const PENDING_PAYMENT_HOLD_MS = 15 * 60 * 1000;

export function pendingPaymentHoldExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + PENDING_PAYMENT_HOLD_MS);
}

/** Активно ли удержание по «ожидает оплаты» (машина ещё занята этой бронью). */
export function isPendingPaymentHoldActive(createdAt: Date, nowMs: number = Date.now()): boolean {
  return nowMs - createdAt.getTime() < PENDING_PAYMENT_HOLD_MS;
}
