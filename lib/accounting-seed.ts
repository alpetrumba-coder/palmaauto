/**
 * Стартовые данные справочников учёта (проекты, объекты, кассы, статьи, площадки).
 * Источники: УК.xlsx, «настройка ОТА…», кабинет RealtyCalendar, ответы владельца 08.10.2026.
 *
 * Идемпотентно: существующие записи НЕ перезаписываются — правки владельца в админке сохраняются.
 * Вызывается кнопкой в админке (владелец) и скриптом scripts/seed-accounting.ts.
 */
import { prisma } from "@/lib/prisma";

const lines = (...names: string[]) => names.join("\n");

const PROJECTS = ["УН", "Проект N", "Библая В.", "Кизер А.", "Кошман В."];

type A = { name: string; rcName?: string; address?: string; aliases?: string[]; kind?: "APARTMENT" | "CAR"; carSlug?: string; share?: number; ownerName?: string };

const APARTMENTS: A[] = [
  { name: "Муха", rcName: "00 Муха - Заречная 16", address: "Сухум, ул. Заречная 16, кв. 41", aliases: ["ул. Заречная 16/41 Двухкомнатная"] },
  { name: "Мансарда", rcName: "01 Мансарда - Заречная 16", address: "Сухум, ул. Заречная 16, кв. 42", aliases: ["ул. Заречная 16/42 Однокомнатная"] },
  { name: "Африка", rcName: "1. Африка - Мачара 9 - Каштак", address: "Сухум, Абжуйское шоссе 9, кв. 2а", aliases: ["ул. Абжуйское шоссе, дом 9, кв. 2а однокомнатная"] },
  { name: "Рио", rcName: "2. Рио - Мачара 9 - Каштак", address: "Сухум, Абжуйское шоссе 9, кв. 2", aliases: ["ул. Абжуйское шоссе, дом 9, кв.2 двухкомнатная"] },
  { name: "Домик", rcName: "3. Домик - Мачаре 9 - Каштак", address: "Сухум, Абжуйское шоссе 9", aliases: ["ул. Абжуйское шоссе, дом 9 домик"] },
  { name: "Дольче Вита", rcName: "4. Дольче Вита - Пхазария 2- 5 этаж", address: "Сухум, ул. Пхазария 2, кв. 24, 5 этаж", aliases: ["ул. Пхазария,  дом 2, эт. 5", "ул. Пхазария, дом 2, эт. 5"] },
  { name: "Матисс", rcName: "5. Матисс - Пхазария 2 - 3 этаж", address: "Сухум, ул. Пхазария 2, кв. 18, 3 этаж", aliases: ["ул. Пхазария,  дом 2, эт. 3", "ул. Пхазария, дом 2, эт. 3"] },
  { name: "Дом на Эшерской", rcName: "6.1 Дом на Эшерской - Ачадара", address: "Сухум, 6 тупик Эшерской ул., д. 7", aliases: ["ул. 6-й тупик Эшерской улицы дом 7"] },
  { name: "Дача Черномора", rcName: "6.2 Дача Черномора на Тоннельной", address: "Сухум, ул. 2-я Тоннельная, д. 17", aliases: ["ул. 2-я Тоннельная дом 17"] },
  { name: "Маркиза", rcName: "7. Маркиза - Адлейба, 232", address: "Сухум, ул. Адлейба 232, кв. 29", aliases: ["ул.Адлейба 232, кв. 29"] },
  { name: "Полёт", rcName: "8. Полет - Гумистинская 29 - Новый район", address: "Сухум, ул. Гумистинская 29, кв. 71", aliases: ["ул. Гумистинская 29, кв. 71"] },
  { name: "Массив Гумиста 14", rcName: "9.1. Массив Гумиста 14", address: "Сухум, Массив Гумиста 14, кв. 5", aliases: ["Массив Гумиста 14 кв 5"] },
  { name: "Почтовая", rcName: "9.2. Почтовая улица 27", address: "Сухум, ул. Почтовая 27", aliases: ["ул. Почтовая 27"], ownerName: "Кошман В." },
  { name: "Акиртава 27", address: "Сухум, ул. Акиртава 27", aliases: ["Акиртава 27"] },
  { name: "Классика", rcName: "9. Классика - Очамчира", address: "Очамчира, ул. Б. Шинкуба 72", aliases: ["Очамчира, ул. Б.Шинкуба 72"] },
];

const CARS: A[] = [
  { name: "Nissan Note", kind: "CAR", address: "М112МАABH", carSlug: "nissan-note", share: 85, aliases: ["NISSAN NOTE, гос. номер М112МАABH"] },
  { name: "Toyota Prius", kind: "CAR", address: "E611YYABH", carSlug: "toyota-prius", share: 85, aliases: ["TOYOTA PRIUS, гос. номер E611YYABH"] },
  { name: "Toyota Estima", kind: "CAR", address: "X211XXABH", carSlug: "toyota-estima", share: 85, aliases: ["Toyota Estima, гос. номер X211XXABH"] },
  { name: "Toyota Crown", kind: "CAR", carSlug: "toyota-crown", share: 85 },
];

const CASH: { name: string; kind: "CARD" | "CASH" | "ONLINE"; responsible?: string; active?: boolean }[] = [
  { name: "Т-банк", kind: "CARD" },
  { name: "Карта Х", kind: "CARD" },
  { name: "Наличные Ева", kind: "CASH", responsible: "Ева" },
  { name: "Карта Евы", kind: "CARD", responsible: "Ева" },
  { name: "Карта Дмитрия Л.", kind: "CARD", responsible: "Дмитрий" },
  { name: "Карта Анны Нестеровой", kind: "CARD", responsible: "Анна Нестерова" },
  { name: "Монета", kind: "ONLINE" },
  // Служебная касса для перенесённой истории, где реальную кассу определить нельзя; в формах ввода не показывается.
  { name: "Перенесённая история (не распознано)", kind: "CASH", active: false },
];

type C = { name: string; kind: "INCOME" | "EXPENSE"; nature: "VARIABLE" | "FIXED"; aliases?: string[] };

const CATEGORIES: C[] = [
  // Доходы
  { name: "Доходы от сдачи имущества в аренду", kind: "INCOME", nature: "VARIABLE", aliases: ["Доходы от сдачи имущества в аренду"] },
  { name: "Транспортные услуги (трансфер)", kind: "INCOME", nature: "VARIABLE", aliases: ["Трансфер"] },
  { name: "Оплата за жилье (долгосрочные жильцы)", kind: "INCOME", nature: "VARIABLE", aliases: ["оплата за жилье Прусаков А.", "аренда жилья Гаранин", "оплата за жилье Болгов А."] },
  // Переменные расходы (относятся к заезду / аренде)
  { name: "Уборка", kind: "EXPENSE", nature: "VARIABLE", aliases: ["уборка"] },
  { name: "Стирка белья", kind: "EXPENSE", nature: "VARIABLE", aliases: ["стирка белья"] },
  { name: "Комиссия агрегатора", kind: "EXPENSE", nature: "VARIABLE", aliases: ["комиссия агрегатора", " комиссия агрегатора"] },
  { name: "Комиссионные Ева", kind: "EXPENSE", nature: "VARIABLE", aliases: ["оплата комиссионных Ева"] },
  { name: "Комиссионные Татьяны", kind: "EXPENSE", nature: "VARIABLE", aliases: ["оплата комиссионных Татьяны", "оплата комиссионных татьяны"] },
  { name: "Выплата собственнику (аренда помещений)", kind: "EXPENSE", nature: "VARIABLE", aliases: ["аренда помещений и прочего имущества"] },
  { name: "Ремонт и содержание объектов", kind: "EXPENSE", nature: "VARIABLE", aliases: ["содержание зданий и сооружений, оборудования, прочих ОС"] },
  { name: "Хозяйственные расходы", kind: "EXPENSE", nature: "VARIABLE", aliases: ["хозяйственные расходы"] },
  { name: "МБП (мелкие бытовые принадлежности)", kind: "EXPENSE", nature: "VARIABLE", aliases: ["МБП"] },
  { name: "Транспортные расходы", kind: "EXPENSE", nature: "VARIABLE", aliases: ["транспортные расходы"] },
  { name: "ГСМ", kind: "EXPENSE", nature: "VARIABLE", aliases: ["ГСМ"] },
  { name: "Ремонт и обслуживание транспорта", kind: "EXPENSE", nature: "VARIABLE", aliases: ["ремонт, обслуживание и содержание транспорта"] },
  { name: "Возврат клиенту", kind: "EXPENSE", nature: "VARIABLE", aliases: ["возврат денежных средств"] },
  { name: "Прочие расходы (не классифицировано)", kind: "EXPENSE", nature: "FIXED", aliases: [] },
  // Служебная статья: деньги получены из кассы Рубина / на карту — это не доход, в отчёты о доходах не входит.
  { name: "Служебное: получение денег (не доход)", kind: "INCOME", nature: "FIXED", aliases: ["Получение ДС из кассы ТДР", "Получение ДС на карту"] },
  { name: "Банковская комиссия", kind: "EXPENSE", nature: "VARIABLE", aliases: ["банковская комиссия"] },
  // Постоянные расходы (распределяются по объектам)
  { name: "Связь", kind: "EXPENSE", nature: "FIXED", aliases: ["связь"] },
  { name: "Интернет", kind: "EXPENSE", nature: "FIXED", aliases: ["интернет"] },
  { name: "Коммунальные платежи", kind: "EXPENSE", nature: "FIXED", aliases: ["коммунальные платежи"] },
  { name: "Электронные программы", kind: "EXPENSE", nature: "FIXED", aliases: ["электронные программы"] },
  { name: "Реклама", kind: "EXPENSE", nature: "FIXED", aliases: ["реклама"] },
  { name: "Зарплата Дмитрий", kind: "EXPENSE", nature: "FIXED", aliases: ["зп Дима Леготкин"] },
  { name: "Расходы на персонал", kind: "EXPENSE", nature: "FIXED", aliases: ["расходы на персонал"] },
  { name: "Юридическое и документальное сопровождение", kind: "EXPENSE", nature: "FIXED", aliases: ["юридическое и документальное сопровождение деятельности"] },
  { name: "Общие расходы", kind: "EXPENSE", nature: "FIXED", aliases: ["общие расходы "] },
  { name: "Канцтовары и мелкая техника", kind: "EXPENSE", nature: "FIXED", aliases: ["канцтовары и мелкая техника"] },
  { name: "Чай, вода, кофе", kind: "EXPENSE", nature: "FIXED", aliases: ["чай, вода,кофе"] },
  { name: "Основные средства", kind: "EXPENSE", nature: "FIXED", aliases: ["основные средства"] },
];

const CHANNELS: { name: string; low: number; high: number; active?: boolean }[] = [
  { name: "Островок", low: 15, high: 15 },
  { name: "Суточно", low: 20, high: 20 },
  { name: "ПриветТур", low: 16, high: 16 },
  { name: "Форенто", low: 15, high: 15 },
  { name: "Твил", low: 26, high: 20 },
  { name: "Яндекс Путешествия", low: 15, high: 15, active: false },
  { name: "Авито", low: 0, high: 0 },
  { name: "Прямые бронирования", low: 0, high: 0 },
];

export type SeedResult = {
  created: { projects: number; assets: number; cash: number; categories: number; channels: number };
  total: { projects: number; assets: number; cash: number; categories: number; channels: number };
};

export async function seedAccountingDictionaries(): Promise<SeedResult> {
  const created = { projects: 0, assets: 0, cash: 0, categories: 0, channels: 0 };

  for (const [i, name] of PROJECTS.entries()) {
    if (!(await prisma.project.findUnique({ where: { name } }))) {
      await prisma.project.create({ data: { name, sortOrder: i } });
      created.projects++;
    }
  }

  for (const [i, a] of [...APARTMENTS, ...CARS].entries()) {
    const kind = a.kind ?? "APARTMENT";
    if (!(await prisma.asset.findUnique({ where: { kind_name: { kind, name: a.name } } }))) {
      await prisma.asset.create({
        data: {
          kind,
          name: a.name,
          address: a.address ?? null,
          rcName: a.rcName ?? null,
          carSlug: a.carSlug ?? null,
          ownerName: a.ownerName ?? null,
          ownerSharePct: a.share ?? 65,
          aliases: a.aliases ? lines(...a.aliases) : null,
          sortOrder: i,
        },
      });
      created.assets++;
    }
  }

  for (const [i, c] of CASH.entries()) {
    if (!(await prisma.cashAccount.findUnique({ where: { name: c.name } }))) {
      await prisma.cashAccount.create({ data: { name: c.name, kind: c.kind, responsible: c.responsible ?? null, active: c.active ?? true, sortOrder: i } });
      created.cash++;
    }
  }

  for (const [i, c] of CATEGORIES.entries()) {
    if (!(await prisma.category.findUnique({ where: { name: c.name } }))) {
      await prisma.category.create({
        data: { name: c.name, kind: c.kind, nature: c.nature, aliases: c.aliases ? lines(...c.aliases) : null, sortOrder: i },
      });
      created.categories++;
    }
  }

  for (const [i, c] of CHANNELS.entries()) {
    if (!(await prisma.channel.findUnique({ where: { name: c.name } }))) {
      await prisma.channel.create({
        data: { name: c.name, commissionLowPct: c.low, commissionHighPct: c.high, active: c.active ?? true, sortOrder: i },
      });
      created.channels++;
    }
  }

  const total = {
    projects: await prisma.project.count(),
    assets: await prisma.asset.count(),
    cash: await prisma.cashAccount.count(),
    categories: await prisma.category.count(),
    channels: await prisma.channel.count(),
  };
  return { created, total };
}
