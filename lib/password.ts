import { hash } from "bcryptjs";

const MIN_LENGTH = 8;

export function validatePasswordPlain(plain: string): string | null {
  if (plain.length < MIN_LENGTH) {
    return `Пароль не короче ${MIN_LENGTH} символов.`;
  }
  return null;
}

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, 12);
}
