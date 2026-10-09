/**
 * Описание справочников учёта: одно место для списка, формы и серверной проверки.
 * Удалять записи нельзя — только отключать (active), чтобы история не теряла ссылки.
 */

export type DictEntity = "projects" | "assets" | "cash" | "categories" | "channels";

export type FieldSpec = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "money" | "select" | "checkbox";
  required?: boolean;
  /** Для select: фиксированный список. Для projectId список приходит с сервера (динамический). */
  options?: { value: string; label: string }[];
  dynamicOptions?: "projects";
  /** Показывать колонкой в списке. */
  inList?: boolean;
  hint?: string;
};

export type DictSpec = {
  title: string;
  description: string;
  fields: FieldSpec[];
};

const activeField: FieldSpec = { key: "active", label: "Активна", type: "checkbox", inList: true };
const sortField: FieldSpec = { key: "sortOrder", label: "Порядок", type: "number", hint: "Меньше — выше в списках" };

export const DICTS: Record<DictEntity, DictSpec> = {
  assets: {
    title: "Объекты",
    description: "Квартиры, дома и автомобили, по которым ведётся учёт.",
    fields: [
      {
        key: "kind",
        label: "Тип",
        type: "select",
        required: true,
        inList: true,
        options: [
          { value: "APARTMENT", label: "Квартира / дом" },
          { value: "CAR", label: "Автомобиль" },
        ],
      },
      { key: "name", label: "Название", type: "text", required: true, inList: true },
      { key: "address", label: "Адрес / госномер", type: "text", inList: true },
      { key: "projectId", label: "Проект", type: "select", dynamicOptions: "projects", inList: true },
      { key: "ownerName", label: "Внешний собственник", type: "text", inList: true, hint: "Пусто — объект компании (расчёт доли собственника не нужен)" },
      {
        key: "ownerSharePct",
        label: "Доля внешнего собственника, %",
        type: "number",
        required: true,
        hint: "Остальное — УК. Нужна только если указан внешний собственник (обычно 65).",
      },
      { key: "rcName", label: "Название в RealtyCalendar", type: "text", hint: "Для сопоставления броней" },
      { key: "carSlug", label: "Машина сайта (slug)", type: "text", hint: "Для авто: nissan-note, toyota-prius…" },
      { key: "aliases", label: "Названия в УК.xlsx", type: "textarea", hint: "По одному названию в строке — нужно для переноса истории" },
      sortField,
      activeField,
    ],
  },
  cash: {
    title: "Кассы",
    description: "Карты, наличные у сотрудников, онлайн-кошельки. Касса Рубина — внешняя, здесь её нет.",
    fields: [
      { key: "name", label: "Название", type: "text", required: true, inList: true },
      {
        key: "kind",
        label: "Вид",
        type: "select",
        required: true,
        inList: true,
        options: [
          { value: "CARD", label: "Карта" },
          { value: "CASH", label: "Наличные" },
          { value: "ONLINE", label: "Онлайн" },
        ],
      },
      { key: "responsible", label: "Ответственный", type: "text", inList: true },
      {
        key: "openingKop",
        label: "Начальный остаток, ₽",
        type: "money",
        inList: true,
        hint: "Сколько денег было в кассе на день начала учёта в системе (можно с копейками)",
      },
      sortField,
      activeField,
    ],
  },
  categories: {
    title: "Статьи",
    description: "Статьи доходов и расходов. Переменные относятся к заезду/аренде, постоянные распределяются по объектам.",
    fields: [
      { key: "name", label: "Название", type: "text", required: true, inList: true },
      {
        key: "kind",
        label: "Вид",
        type: "select",
        required: true,
        inList: true,
        options: [
          { value: "INCOME", label: "Доход" },
          { value: "EXPENSE", label: "Расход" },
        ],
      },
      {
        key: "nature",
        label: "Характер",
        type: "select",
        required: true,
        inList: true,
        options: [
          { value: "VARIABLE", label: "Переменная (к заезду/аренде)" },
          { value: "FIXED", label: "Постоянная (распределяется)" },
        ],
      },
      { key: "aliases", label: "Названия в УК.xlsx", type: "textarea", hint: "По одному названию в строке — для переноса истории" },
      sortField,
      activeField,
    ],
  },
  channels: {
    title: "Площадки",
    description: "Каналы продаж и комиссии по сезону (низкий / высокий).",
    fields: [
      { key: "name", label: "Название", type: "text", required: true, inList: true },
      { key: "commissionLowPct", label: "Комиссия, низкий сезон %", type: "number", required: true, inList: true },
      { key: "commissionHighPct", label: "Комиссия, высокий сезон %", type: "number", required: true, inList: true },
      sortField,
      activeField,
    ],
  },
  projects: {
    title: "Проекты",
    description: "Проекты (направления) из учёта УК.",
    fields: [{ key: "name", label: "Название", type: "text", required: true, inList: true }, sortField, activeField],
  },
};

export const DICT_ORDER: DictEntity[] = ["assets", "cash", "categories", "channels", "projects"];

export function isDictEntity(v: string | undefined): v is DictEntity {
  return !!v && v in DICTS;
}
