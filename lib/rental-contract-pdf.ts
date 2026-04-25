import type { BookingContractMeta } from "@/lib/booking-contract";
import { formatDateInputUTC } from "@/lib/rental-dates";

export type RentalContractPdfInput = {
  issuedAt: Date;
  bookingId: string;
  startDate: Date;
  endDate: Date;
  days: number;
  pricePerDayRub: number;
  totalPriceRub: number;
  extrasTotalRub: number;
  extrasLines: string[];
  car: {
    make: string;
    model: string;
    modelYear: number;
    color: string;
    plateNumber: string;
    registrationCertificate: string;
  };
  meta: BookingContractMeta;
};

let pdfFontsReady = false;

function ensurePdfMakeFonts(): void {
  if (pdfFontsReady) return;
  pdfFontsReady = true;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfMake = require("pdfmake") as {
    virtualfs: { writeFileSync: (name: string, buf: Buffer) => void };
    addFonts: (f: Record<string, Record<string, string>>) => void;
    setUrlAccessPolicy: (cb: () => boolean) => void;
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vfsFonts = require("pdfmake/build/vfs_fonts") as Record<string, string>;
  for (const fileName of Object.keys(vfsFonts)) {
    pdfMake.virtualfs.writeFileSync(fileName, Buffer.from(vfsFonts[fileName], "base64"));
  }
  pdfMake.addFonts({
    Roboto: {
      normal: "Roboto-Regular.ttf",
      bold: "Roboto-Medium.ttf",
      italics: "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf",
    },
  });
  pdfMake.setUrlAccessPolicy(() => false);
}

function ruDateLong(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function signLinesBlock(): unknown {
  return {
    table: {
      widths: ["*", "*"],
      body: [
        [
          { text: "Арендодатель _______________________________________________ /ФИО/___________________", style: "small" },
          { text: "Арендатор __________________________________________________ /ФИО/___________________", style: "small" },
        ],
      ],
    },
    layout: "noBorders",
    margin: [0, 6, 0, 0],
  };
}

function ruDateShort(d: Date): string {
  // Для полей сроков удобнее короткий формат.
  return formatDateInputUTC(d);
}

function trimPdfText(s: string, max: number): string {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function actLine(label: string, value?: string): string {
  const v = value?.trim();
  return `${label}: ${v && v.length > 0 ? v : "______________________________"}`;
}

function buildDocDefinition(input: RentalContractPdfInput) {
  const m = input.meta;
  const passportIssuedBy = trimPdfText(m.passportIssuedBy, 220);
  const regCert = trimPdfText(input.car.registrationCertificate, 120);
  const extrasInline = trimPdfText(input.extrasLines.join("; "), 180);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [
    { text: "ДОГОВОР", style: "h", alignment: "center" },
    { text: "аренды транспортного средства с физическим лицом", style: "subh", alignment: "center", margin: [0, 0, 0, 6] },
    {
      text: `г. Сухум, ${ruDateLong(input.issuedAt)} г.`,
      style: "small",
      margin: [0, 0, 0, 6],
    },
    {
      text: [
        "ООО «ТДР», именуемое в дальнейшем ",
        { text: "«Арендодатель»", bold: true },
        ", в лице Генерального директора Библая Вячеслава Арвелодовича, действующего на основании Устава, с одной стороны, и гражданин(ка) ",
        { text: m.fullName, bold: true },
        ", паспорт: ",
        { text: `${m.passportSeries} ${m.passportNumber}`, bold: true },
        ", выдан ",
        passportIssuedBy,
        ", именуемый(ая) в дальнейшем ",
        { text: "«Арендатор»", bold: true },
        ", с другой стороны, заключили настоящий договор о нижеследующем:",
      ],
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "1. ПРЕДМЕТ ДОГОВОРА", style: "h2" },
    {
      text: [
        "1.1. Арендодатель передает, а Арендатор принимает во временное владение и пользование транспортное средство — легковой автомобиль ",
        { text: `${input.car.make} ${input.car.model}`, bold: true },
        `, ${input.car.modelYear} года выпуска, цвет ${input.car.color}, гос. номер `,
        { text: input.car.plateNumber, bold: true },
        ", свидетельство о регистрации ТС ",
        { text: regCert, bold: true },
        " (далее — «ТС»).",
      ],
      style: "small",
      margin: [0, 0, 0, 3],
    },
    {
      text: "1.2. Использование ТС должно соответствовать его назначению и условиям настоящего договора.",
      style: "small",
      margin: [0, 0, 0, 3],
    },
    { text: "2. ПОРЯДОК ПЕРЕДАЧИ И ВОЗВРАТА ТС", style: "h2" },
    {
      text:
        "2.1. Передача и возврат ТС оформляются актом(ами), подписанными обеими сторонами.\n" +
        "2.2. При передаче ТС стороны фиксируют техническое состояние и осуществляют фото/видеофиксацию имеющихся повреждений.\n" +
        "2.3. Арендатор обязуется возвратить ТС в том же техническом состоянии с учётом нормального износа.",
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "3. СРОК АРЕНДЫ И ПЛАТА", style: "h2" },
    {
      text: [
        { text: "3.1. Срок аренды: ", bold: true },
        { text: `с ${ruDateShort(input.startDate)} по ${ruDateShort(input.endDate)} `, bold: true, italics: true },
        `(${input.days} суток). `,
        "\n",
        "Арендная плата: ",
        { text: `${input.pricePerDayRub} руб.`, bold: true },
        " в сутки. Общая сумма по договору: ",
        { text: `${input.totalPriceRub} руб.`, bold: true },
        ".\n",
        "3.2. Дополнительные услуги: ",
        { text: `${input.extrasTotalRub} руб.`, bold: true },
        input.extrasLines.length > 0 ? ` (${extrasInline})` : "",
        ".\n",
        { text: "3.3. Оплата: ", bold: true },
        "авансом, в рублях РФ, наличным расчётом.\n",
        "3.4. Срок аренды исчисляется с момента подписания акта приёма‑передачи.\n",
        { text: "3.5. Досрочный возврат: ", bold: true },
        "удерживается 50% от неиспользованной суммы.\n",
        { text: "3.6. Просрочка возврата: ", bold: true },
        "при превышении более чем на 1 час — оплата за каждые полные сутки.\n",
        "3.7. Платежи за позднее время, превышение лимита пробега или топливо — по факту.",
      ],
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "4. ТОПЛИВНАЯ ПОЛИТИКА", style: "h2" },
    {
      text: [
        { text: "4.1. ", bold: true },
        "ТС предоставляется с полным баком топлива и возвращается с полным баком.\n",
        { text: "4.2. ", bold: true },
        "При возврате с неполным баком Арендатор компенсирует стоимость недостающего топлива по тарифам Арендодателя.",
      ],
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "5. ПРАВА И ОБЯЗАННОСТИ СТОРОН", style: "h2" },
    {
      text: [
        { text: "5.1. Арендодатель обязан: ", bold: true },
        "предоставить исправное ТС с документами; обеспечить возможность использования ТС в рамках договора.\n",
        { text: "5.2. Арендодатель вправе: ", bold: true },
        "требовать расторжения договора/возмещения убытков при нарушениях; удерживать 50% оставшейся суммы аренды при досрочном возврате.\n",
        { text: "5.3. Арендатор обязан: ", bold: true },
        "бережно использовать ТС; оплачивать топливо/парковку/штрафы; сообщать о поломках и ДТП; вернуть ТС чистым, с полным баком и документами; не передавать управление третьим лицам.\n",
        { text: "Лимит пробега: ", bold: true, italics: true },
        { text: "200 км/сутки", bold: true, italics: true },
        ". При превышении — 5 руб. за каждый км.",
      ],
      style: "small",
      margin: [0, 0, 0, 6],
    },
    {
      text: [
        { text: "5.3.7. Запрещено: ", bold: true },
        "перевозка опасных/запрещённых грузов; такси/курьерская деятельность; обучение вождению; гонки/соревнования; буксировка без согласия; эксплуатация в неисправном состоянии; управление в состоянии опьянения; управление без прав; выезд за пределы РА без письменного разрешения Арендодателя; маршруты из раздела 8.",
      ],
      style: "small",
      margin: [0, 0, 0, 4],
    },
    {
      text: [
        { text: "5.3.8. При ДТП/угоне/пожаре/вандализме: ", bold: true },
        "вызвать ГАИ; получить документы/протокол; при возможности зафиксировать свидетелей; незамедлительно уведомить Арендодателя; действовать по требованиям ГАИ и законодательства.",
      ],
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "6. ЗАЛОГ", style: "h2" },
    {
      text: [
        "6.1. При получении автомобиля Арендатор оставляет у Арендодателя залог ",
        { text: "15 000 рублей", bold: true, italics: true },
        ".\n",
        "6.2. При ущербе по вине Арендатора залог используется для покрытия ущерба; Арендодатель возвращает разницу между суммой ущерба и залогом.\n",
        { text: "6.3. Если сумма ущерба превышает размер залога, ", bold: true },
        "Арендатор доплачивает Арендодателю разницу.\n",
        "6.4. Если за время аренды страховых случаев не было, залог полностью возвращается при возврате автомобиля.",
      ],
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "7. ДОСРОЧНОЕ РАСТОРЖЕНИЕ", style: "h2" },
    {
      text: [
        "7.1. Арендодатель вправе расторгнуть договор при существенных нарушениях условий аренды.\n",
        "7.2. Арендатор вправе требовать расторжения при непредоставлении ТС, препятствиях в пользовании, скрытых неисправностях или непригодности ТС.\n",
        { text: "7.3. Отмена брони: ", bold: true },
        { text: "бесплатная", bold: true, italics: true },
        " отмена возможна, если Арендатор уведомил Арендодателя ",
        { text: "не позднее чем за 3 суток", bold: true, italics: true },
        " до даты начала аренды. Если уведомление получено позднее указанного срока — удерживается ",
        { text: "оплата за первые сутки", bold: true, italics: true },
        " аренды.",
      ],
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "8. ЗАПРЕЩЁННЫЕ МАРШРУТЫ", style: "h2" },
    {
      text: [
        { text: "8.1. ", bold: true },
        "Гегский водопад; ",
        { text: "8.2. ", bold: true },
        "Перевал Пыв; ",
        { text: "8.3. ", bold: true },
        "Заброшенный город Акармара; ",
        { text: "8.4. ", bold: true },
        "опасные горные маршруты и водопады; ",
        { text: "8.5. ", bold: true },
        "песчаные пляжи.",
      ],
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "9. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ", style: "h2" },
    {
      text:
        "9.1. Договор составлен в 2х (двух) экземплярах, имеющих равную юридическую силу.\n" +
        "9.2. Договор вступает в силу с момента подписания и действует до полного исполнения обязательств.\n" +
        "9.3. Изменения действительны только в письменной форме.\n" +
        "9.4. Споры решаются переговорами, при недостижении согласия — в Арбитражном суде г. Сухум.",
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "Подписи сторон:", style: "h2" },
    signLinesBlock(),

    // Отдельный лист: акты
    { text: "", pageBreak: "before" },
    { text: "АКТ ПРИЁМА‑ПЕРЕДАЧИ ТС", style: "h2" },
    {
      text: `г. Сухум, ${ruDateLong(input.issuedAt)} г.`,
      style: "small",
      margin: [0, 0, 0, 4],
    },
    {
      text:
        "Мы, нижеподписавшиеся, Арендодатель __________ и Арендатор __________ составили настоящий акт о том, что Арендодатель передал, а Арендатор принял ТС на условиях договора аренды.\n" +
        `Бронь №: ${input.bookingId}\n` +
        `Срок аренды: с ${ruDateShort(input.startDate)} по ${ruDateShort(input.endDate)} (${input.days} суток)\n` +
        actLine("ТС", `${input.car.make} ${input.car.model}`) +
        "\n" +
        actLine("Год", String(input.car.modelYear)) +
        "\n" +
        actLine("Цвет", input.car.color) +
        "\n" +
        actLine("Гос. номер", input.car.plateNumber) +
        "\n" +
        actLine("СТС", regCert) +
        "\n" +
        actLine("Комплектность/документы", "") +
        "\n" +
        actLine("Повреждения/особые отметки", ""),
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "Подписи сторон:", style: "h2" },
    signLinesBlock(),

    { text: "", margin: [0, 10, 0, 0] },
    { text: "АКТ ВОЗВРАТА ТС", style: "h2" },
    {
      text: `г. Сухум, ${ruDateLong(input.issuedAt)} г.`,
      style: "small",
      margin: [0, 0, 0, 4],
    },
    {
      text:
        "Мы, нижеподписавшиеся, Арендодатель __________ и Арендатор __________ составили настоящий акт о том, что Арендатор возвратил, а Арендодатель принял ТС.\n" +
        `Бронь №: ${input.bookingId}\n` +
        actLine("ТС", `${input.car.make} ${input.car.model}`) +
        "\n" +
        actLine("Состояние ТС при возврате", "") +
        "\n" +
        actLine("Пробег/топливо", "") +
        "\n" +
        actLine("Претензии", ""),
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "Подписи сторон:", style: "h2" },
    signLinesBlock(),
  ];

  return {
    pageSize: "A4" as const,
    pageMargins: [26, 24, 26, 24] as [number, number, number, number],
    defaultStyle: {
      font: "Roboto",
      fontSize: 8,
      lineHeight: 1.08,
    },
    styles: {
      h: { fontSize: 12, bold: true },
      subh: { fontSize: 9, bold: true },
      h2: { fontSize: 9, bold: true, margin: [0, 4, 0, 2] },
      small: { fontSize: 8 },
    },
    content,
  };
}

export async function buildRentalContractPdfBuffer(input: RentalContractPdfInput): Promise<Buffer> {
  ensurePdfMakeFonts();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfMake = require("pdfmake") as { createPdf: (def: object) => { getBuffer: () => Promise<Buffer> } };
  const doc = buildDocDefinition(input);
  return pdfMake.createPdf(doc).getBuffer();
}
