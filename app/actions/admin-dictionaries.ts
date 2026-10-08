"use server";

import { revalidatePath } from "next/cache";

import { seedAccountingDictionaries } from "@/lib/accounting-seed";
import { parseMoneyToKop } from "@/lib/money";
import { DICTS, isDictEntity, type DictEntity, type FieldSpec } from "@/lib/dictionaries";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/require-admin-panel";

export type DictValues = Record<string, string | boolean>;
export type DictActionResult = { ok: true } | { ok: false; error: string };

/** Приводит значения формы к типам по описанию справочника; неизвестные поля отбрасываются. */
function coerce(
  fields: FieldSpec[],
  raw: DictValues,
  projectIds: Set<string>,
): { data: Record<string, unknown> } | { error: string } {
  const data: Record<string, unknown> = {};
  for (const f of fields) {
    const v = raw[f.key];
    if (f.type === "checkbox") {
      data[f.key] = v === true;
      continue;
    }
    const str = typeof v === "string" ? v.trim() : "";
    if (f.type === "money") {
      if (str === "") {
        data[f.key] = 0;
        continue;
      }
      const kop = parseMoneyToKop(str);
      if (kop === null) return { error: `«${f.label}» — сумма вроде 15000 или 15000,50.` };
      data[f.key] = kop;
      continue;
    }
    if (f.type === "number") {
      if (str === "") {
        if (f.key === "sortOrder") {
          data[f.key] = 0;
          continue;
        }
        if (f.required) return { error: `Заполните поле «${f.label}».` };
        data[f.key] = null;
        continue;
      }
      const n = Number(str);
      if (!Number.isInteger(n) || n < 0 || n > 1_000_000) return { error: `«${f.label}» — целое число от 0.` };
      if (f.key.endsWith("Pct") && n > 100) return { error: `«${f.label}» — не больше 100.` };
      data[f.key] = n;
      continue;
    }
    if (f.type === "select") {
      if (str === "") {
        if (f.required) return { error: `Выберите «${f.label}».` };
        data[f.key] = null;
        continue;
      }
      if (f.dynamicOptions === "projects") {
        if (!projectIds.has(str)) return { error: `Неизвестное значение «${f.label}».` };
      } else if (!f.options?.some((o) => o.value === str)) {
        return { error: `Недопустимое значение «${f.label}».` };
      }
      data[f.key] = str;
      continue;
    }
    if (f.required && str === "") return { error: `Заполните поле «${f.label}».` };
    if (str.length > 2000) return { error: `«${f.label}» слишком длинное.` };
    data[f.key] = str === "" ? null : str;
  }
  return { data };
}

export async function saveDictionaryItemAction(
  entity: string,
  id: string | null,
  values: DictValues,
): Promise<DictActionResult> {
  await requireOwner();
  if (!isDictEntity(entity)) return { ok: false, error: "Неизвестный справочник." };

  const projectIds = new Set((await prisma.project.findMany({ select: { id: true } })).map((p) => p.id));
  const res = coerce(DICTS[entity].fields, values, projectIds);
  if ("error" in res) return { ok: false, error: res.error };
  const data = res.data as never;

  try {
    await write(entity, id, data);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") return { ok: false, error: "Запись с таким названием уже есть." };
    if (code === "P2025") return { ok: false, error: "Запись не найдена." };
    throw e;
  }
  revalidatePath("/admin-panel/dictionaries");
  return { ok: true };
}

async function write(entity: DictEntity, id: string | null, data: never) {
  switch (entity) {
    case "projects":
      return id ? prisma.project.update({ where: { id }, data }) : prisma.project.create({ data });
    case "assets":
      return id ? prisma.asset.update({ where: { id }, data }) : prisma.asset.create({ data });
    case "cash":
      return id ? prisma.cashAccount.update({ where: { id }, data }) : prisma.cashAccount.create({ data });
    case "categories":
      return id ? prisma.category.update({ where: { id }, data }) : prisma.category.create({ data });
    case "channels":
      return id ? prisma.channel.update({ where: { id }, data }) : prisma.channel.create({ data });
  }
}

export type SeedActionResult = { ok: true; message: string } | { ok: false; error: string };

/** Заполняет справочники стартовыми данными. Безопасно повторять: существующее не перезаписывается. */
export async function seedDictionariesAction(): Promise<SeedActionResult> {
  await requireOwner();
  const { created, total } = await seedAccountingDictionaries();
  revalidatePath("/admin-panel/dictionaries");
  const added = Object.values(created).reduce((a, b) => a + b, 0);
  return {
    ok: true,
    message:
      added === 0
        ? "Всё уже на месте, ничего не добавлено."
        : `Добавлено записей: ${added} (объекты ${created.assets}, кассы ${created.cash}, статьи ${created.categories}, площадки ${created.channels}, проекты ${created.projects}). Всего: объектов ${total.assets}, касс ${total.cash}, статей ${total.categories}.`,
  };
}
