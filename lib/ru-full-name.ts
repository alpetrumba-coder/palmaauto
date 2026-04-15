/** Делит строку ФИО в порядке «фамилия имя отчество» для полей профиля в БД. */
export function splitRuFullName(fullName: string): {
  lastName: string | null;
  firstName: string | null;
  patronymic: string | null;
} {
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (parts.length === 0) return { lastName: null, firstName: null, patronymic: null };
  if (parts.length === 1) return { lastName: parts[0] ?? null, firstName: null, patronymic: null };
  if (parts.length === 2) return { lastName: parts[0] ?? null, firstName: parts[1] ?? null, patronymic: null };
  return {
    lastName: parts[0] ?? null,
    firstName: parts[1] ?? null,
    patronymic: parts.slice(2).join(" ") || null,
  };
}
