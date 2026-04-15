import type { BookingContractMeta } from "@/lib/booking-contract";
import { formatDateInputUTC } from "@/lib/rental-dates";

/** Строка прейскуранта (Приложение №3). */
export type ExtraServicePdfRow = { name: string; priceLabel: string };

export type RentalContractPdfInput = {
  issuedAt: Date;
  bookingId: string;
  startDate: Date;
  endDate: Date;
  days: number;
  pricePerDayRub: number;
  totalPriceRub: number;
  adminBookingsUrl: string;
  pickupLabel: string;
  dropoffLabel: string;
  pickupFeeRub: number;
  dropoffFeeRub: number;
  car: {
    make: string;
    model: string;
    modelYear: number;
    color: string;
    plateNumber: string;
    registrationCertificate: string;
  };
  meta: BookingContractMeta;
  /** Активные услуги из админки; если пусто — в PDF подставляется одна строка-заглушка. */
  extraServiceRows: ExtraServicePdfRow[];
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

function buildDocDefinition(input: RentalContractPdfInput) {
  const m = input.meta;
  const carLine = `легковой автомобиль ${input.car.make} ${input.car.model}, ${input.car.modelYear} года выпуска, цвета ${input.car.color}, гос. номер ${input.car.plateNumber}, свидетельство о регистрации ${input.car.registrationCertificate}`;
  const addDriverBlock =
    m.additionalDriverName && m.additionalDriverPassport
      ? `${m.additionalDriverName}, паспорт: ${m.additionalDriverPassport}`
      : "не указаны (управление третьим лицам не передаётся).";

  const extraRows =
    input.extraServiceRows.length > 0
      ? input.extraServiceRows.map((r) => [r.name, r.priceLabel] as [string, string])
      : [["(прейскурант не настроен)", "—"]] as [string, string][];

  const bookingInfoLines = [
    `Номер брони: ${input.bookingId}`,
    `Даты: ${formatDateInputUTC(input.startDate)} — ${formatDateInputUTC(input.endDate)}`,
    `Получение: ${input.pickupLabel}${input.pickupFeeRub > 0 ? ` (+${input.pickupFeeRub} ₽)` : ""}`,
    `Сдача: ${input.dropoffLabel}${input.dropoffFeeRub > 0 ? ` (+${input.dropoffFeeRub} ₽)` : ""}`,
    `Итого к оплате: ${input.totalPriceRub} ₽`,
    `Ссылка для администратора (шахматка броней): ${input.adminBookingsUrl}`,
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [
    { text: "ДОГОВОР", style: "h", alignment: "center" },
    { text: "аренды транспортного средства с физическим лицом", style: "subh", alignment: "center", margin: [0, 0, 0, 8] },
    {
      text: `г. Сухум «${String(input.issuedAt.getUTCDate()).padStart(2, "0")}» ${input.issuedAt.toLocaleDateString("ru-RU", { month: "long", timeZone: "UTC" })} ${input.issuedAt.getUTCFullYear()} г.`,
      style: "small",
      margin: [0, 0, 0, 6],
    },
    {
      text: `ООО «ТДР», именуемое в дальнейшем «Арендодатель», в лице Генерального директора Библая Вячеслава Арвелодовича, действующего на основании Устава, с одной стороны, и гражданин(ка) ${m.fullName}, возраст ${m.ageYears} полных лет, паспорт: ${m.passportSeries} ${m.passportNumber}, выдан ${m.passportIssuedBy}, именуемый(ая) в дальнейшем «Арендатор», с другой стороны, заключили настоящий договор о нижеследующем:`,
      style: "small",
      margin: [0, 0, 0, 8],
    },
    { text: "1. ПРЕДМЕТ ДОГОВОРА", style: "h2" },
    {
      text: `1.1. Арендодатель передает, а Арендатор принимает во временное владение и пользование транспортное средство — ${carLine} (далее — «ТС»).`,
      style: "small",
      margin: [0, 0, 0, 4],
    },
    {
      text: "1.2. Использование ТС должно соответствовать его назначению и условиям настоящего договора.",
      style: "small",
      margin: [0, 0, 0, 4],
    },
    {
      text: `1.3. Арендатор обязуется не передавать управление третьим лицам, кроме: ${addDriverBlock}`,
      style: "small",
      margin: [0, 0, 0, 8],
    },
    { text: "2. ПОРЯДОК ПЕРЕДАЧИ И ВОЗВРАТА ТС", style: "h2" },
    {
      text: "2.1. Передача и возврат ТС осуществляются по актам приёма-передачи и возврата (Приложения №1 и №2), подписанным обеими сторонами.\n2.2. При передаче ТС стороны фиксируют техническое состояние и осуществляют видеофиксацию имеющихся повреждений.\n2.3. Арендатор обязуется возвратить ТС в том же техническом состоянии с учётом нормального износа.",
      style: "small",
      margin: [0, 0, 0, 8],
    },
    { text: "3. СРОК АРЕНДЫ И ПЛАТА", style: "h2" },
    {
      text: `3.1. Арендная плата составляет ${input.pricePerDayRub} руб. в сутки. Общая сумма по договору: ${input.totalPriceRub} руб. (период: ${ruDateLong(input.startDate)} — ${ruDateLong(input.endDate)}, ${input.days} сут.).\n3.2. Оплата производится авансом, в рублях РФ, наличным расчётом.\n3.3. Срок аренды исчисляется с момента подписания акта приёма-передачи.\n3.4. В случае возврата ТС ранее окончания срока аренды удерживается 50% от неиспользованной суммы.\n3.5. При превышении срока аренды более чем на 1 час Арендатор оплачивает стоимость аренды за каждые полные сутки.\n3.6. Стоимость дополнительных услуг (Приложение №3) не входит в арендную плату и оплачивается отдельно по фактическому выбору Арендатора.`,
      style: "small",
      margin: [0, 0, 0, 8],
    },
    { text: "4. ТОПЛИВНАЯ ПОЛИТИКА", style: "h2" },
    {
      text: "4.1. ТС предоставляется с полным баком топлива и возвращается с полным баком.\n4.2. При возврате с неполным баком Арендатор компенсирует стоимость недостающего топлива по тарифам Арендодателя (текущая стоимость на АЗС+10%).",
      style: "small",
      margin: [0, 0, 0, 8],
    },
    { text: "5. ПРАВА И ОБЯЗАННОСТИ СТОРОН", style: "h2" },
    {
      text: "5.1. Арендодатель обязан: предоставить ТС в исправном состоянии с необходимыми документами; обеспечивать возможность использования ТС в рамках договора.\n5.2. Арендодатель вправе: требовать расторжения договора и возмещения убытков при нарушении условий договора; удерживать 50% оставшейся суммы аренды при досрочном возврате.\n5.3. Арендатор обязан: использовать ТС бережно и по назначению; за свой счет оплачивать топливо, парковку, штрафы и иные взыскания; своевременно сообщать Арендодателю о поломках и ДТП; вернуть ТС чистым, с полным баком, в исправном состоянии, со всеми документами; соблюдать лимит пробега 200 км/сутки (при превышении — 5 руб./км); не передавать управление третьим лицам, кроме указанных в п. 1.3.",
      style: "small",
      margin: [0, 0, 0, 4],
    },
    {
      text: "5.3.7. Арендатор обязуется не использовать ТС: для запрещённых/опасных грузов; для пассажирских перевозок с прибылью; для обучения вождению; для гонок/соревнований; для буксировки без согласия; при неисправности; в состоянии опьянения; без ВУ; за пределами РА без разрешения; на запрещённых маршрутах (раздел 8).",
      style: "small",
      margin: [0, 0, 0, 4],
    },
    {
      text: "5.3.8. При ДТП (включая угон, вандализм, пожар): вызвать ГАИ; получить копию протокола; зафиксировать свидетелей; незамедлительно известить Арендодателя; действовать по закону и указаниям ГАИ.",
      style: "small",
      margin: [0, 0, 0, 8],
    },
    { text: "6. ДЕПОЗИТ", style: "h2" },
    {
      text: "6.2. При получении автомобиля Арендатор оставляет залог (депозит) 15 000 рублей.\n6.3–6.4. Удержание и возмещение ущерба из депозита — по правилам, указанным в договоре.\n6.5. При отсутствии страховых случаев депозит возвращается при возврате автомобиля.",
      style: "small",
      margin: [0, 0, 0, 8],
    },
    { text: "7. ДОСРОЧНОЕ РАСТОРЖЕНИЕ", style: "h2" },
    {
      text: "7.1. Арендодатель вправе расторгнуть договор при существенных нарушениях.\n7.2. Арендатор вправе требовать расторжения при непредоставлении ТС, препятствиях, скрытых неисправностях.",
      style: "small",
      margin: [0, 0, 0, 8],
    },
    { text: "8. ЗАПРЕЩЁННЫЕ МАРШРУТЫ", style: "h2" },
    {
      text: "8.1. Гегский водопад. 8.2. Перевал Пыв. 8.3. Заброшенный город Акармара. 8.4. Опасные горные маршруты и водопады. 8.5. Песчаные пляжи.",
      style: "small",
      margin: [0, 0, 0, 8],
    },
    { text: "9. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ", style: "h2" },
    {
      text: "9.1. Договор в 2 экземплярах. 9.2. Вступает в силу с подписания. 9.3. Изменения — в письменной форме. 9.4. Споры: переговоры; при недостижении согласия — в Арбитражном суде г. Сухум.",
      style: "small",
      margin: [0, 0, 0, 8],
    },
    { text: "Сведения о бронировании на сайте", style: "h2" },
    {
      text: bookingInfoLines.join("\n"),
      style: "small",
      margin: [0, 0, 0, 12],
    },
    { text: "Приложение №3. Прейскурант на дополнительные услуги", style: "h2" },
    {
      table: {
        widths: ["*", 120],
        body: [[{ text: "Услуга", style: "th" }, { text: "Стоимость, руб.", style: "th" }], ...extraRows],
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 12],
    },
    {
      text: "Подписи сторон на бумажном экземпляре договора проставляются при передаче ТС. Настоящий PDF сформирован автоматически по данным, указанным при бронировании на сайте.",
      style: "small",
      italics: true,
    },
  ];

  return {
    pageSize: "A4" as const,
    pageMargins: [40, 44, 40, 52] as [number, number, number, number],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      lineHeight: 1.25,
    },
    styles: {
      h: { fontSize: 13, bold: true },
      subh: { fontSize: 10, bold: true },
      h2: { fontSize: 10, bold: true, margin: [0, 6, 0, 4] },
      small: { fontSize: 9 },
      th: { bold: true, fillColor: "#eeeeee" },
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
