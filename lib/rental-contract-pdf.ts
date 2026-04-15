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

function buildDocDefinition(input: RentalContractPdfInput) {
  const m = input.meta;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [
    { text: "ДОГОВОР", style: "h", alignment: "center" },
    { text: "аренды транспортного средства с физическим лицом", style: "subh", alignment: "center", margin: [0, 0, 0, 6] },
    {
      text: `г. Сухум«${String(input.issuedAt.getUTCDate()).padStart(2, "0")}» ${input.issuedAt.toLocaleDateString("ru-RU", { month: "long", timeZone: "UTC" })} ${input.issuedAt.getUTCFullYear()} г.`,
      style: "small",
      margin: [0, 0, 0, 6],
    },
    {
      text:
        "ООО «ТДР», именуемое в дальнейшем «Арендодатель», в лице Генерального директора Библая Вячеслава Арвелодовича, действующего на основании Устава, с одной стороны, и гражданин(ка) " +
        m.fullName +
        ", паспорт: " +
        `${m.passportSeries} ${m.passportNumber}` +
        ", выдан " +
        m.passportIssuedBy +
        ", именуемый(ая) в дальнейшем «Арендатор», с другой стороны, заключили настоящий договор о нижеследующем:",
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "1. ПРЕДМЕТ ДОГОВОРА", style: "h2" },
    {
      text:
        "1.1. Арендодатель передает, а Арендатор принимает во временное владение и пользование транспортное средство — легковой автомобиль " +
        `${input.car.make}${input.car.model}, \n` +
        `${input.car.modelYear} года выпуска, цвета ${input.car.color}, гос. номер ${input.car.plateNumber}, \n` +
        `свидетельство о регистрации ТС ${input.car.registrationCertificate} (далее — «ТС»).`,
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
      text: "2.1. Передача и возврат ТС осуществляются по актам приёма-передачи и возврата (Приложения №1 и №2), подписанным обеими сторонами.\n2.2. При передаче ТС стороны фиксируют техническое состояние и осуществляют видеофиксацию имеющихся повреждений.\n2.3. Арендатор обязуется возвратить ТС в том же техническом состоянии с учётом нормального износа.",
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "3. СРОК АРЕНДЫ И ПЛАТА", style: "h2" },
    {
      text:
        "3.1. Арендная плата составляет " +
        input.pricePerDayRub +
        " руб. в сутки. \n" +
        "Общая сумма по договору: " +
        input.totalPriceRub +
        " руб.\n" +
        "3.2. Стоимость дополнительных услуг составляет " +
        input.extrasTotalRub +
        (input.extrasLines.length > 0 ? "\n" + input.extrasLines.map((l) => `- ${l}`).join("\n") : "") +
        "\n" +
        "3.3. Оплата производится авансом, в рублях РФ, наличным расчётом.\n" +
        "3.4. Срок аренды исчисляется с момента подписания акта приёма-передачи.\n" +
        "3.5. В случае возврата ТС ранее окончания срока аренды удерживается 50% от неиспользованной суммы.\n" +
        "3.6. При превышении срока аренды более чем на 1 час Арендатор оплачивает стоимость аренды за каждые полные сутки.\n" +
        "3.7. Оплата приема или передачи в позднее время, превышения лимита пробега или платы за топливо производится по факту.",
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "4. ТОПЛИВНАЯ ПОЛИТИКА", style: "h2" },
    {
      text: "4.1. ТС предоставляется с полным баком топлива и возвращается с полным баком.\n4.2. При возврате с неполным баком Арендатор компенсирует стоимость недостающего топлива по тарифам Арендодателя.",
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "5. ПРАВА И ОБЯЗАННОСТИ СТОРОН", style: "h2" },
    {
      text:
        "5.1. Арендодатель обязан:\n" +
        "- предоставить ТС в исправном состоянии с необходимыми документами;\n" +
        "- обеспечивать возможность использования ТС в рамках договора.\n" +
        "5.2. Арендодатель вправе:\n" +
        "- требовать расторжения договора и возмещения убытков при нарушении условий аренды;\n" +
        "- удерживать 50% оставшейся суммы аренды при досрочном возврате.\n" +
        "5.3. Арендатор обязан:\n" +
        "- использовать ТС бережно и по назначению;\n" +
        "- за свой счет оплачивать топливо, парковку, штрафы и иные взыскания;\n" +
        "- своевременно сообщать Арендодателю о поломках и ДТП;\n" +
        "- вернуть ТС чистым, с полным баком, в исправном состоянии, со всеми документами;\n" +
        "- соблюдать лимит пробега 200 км/сутки. При превышении — 5 руб. за каждый км;\n" +
        "- не передавать управление третьим лицам.",
      style: "small",
      margin: [0, 0, 0, 6],
    },
    {
      text:
        "5.3.7. Арендатор обязуется не использовать ТС в следующих случаях:\n" +
        "• для перевозки запрещённых, опасных, взрывоопасных или токсичных грузов;\n" +
        "• для перевозки пассажиров с целью получения прибыли (такси, курьерская служба и т. п.);\n" +
        "• для обучения вождению других лиц;\n" +
        "• для участия в гонках, соревнованиях, испытаниях или иных спортивных мероприятиях;\n" +
        "• для буксировки или транспортировки других ТС, прицепов, механизмов без согласия Арендодателя;\n" +
        "• в случае неисправности или аварийного состояния ТС;\n" +
        "• в состоянии алкогольного, наркотического или иного токсического опьянения;\n" +
        "• при отсутствии водительского удостоверения соответствующей категории;\n" +
        "• за пределами территории Республики Абхазия без письменного разрешения Арендодателя;\n" +
        "• на маршрутах, указанных в разделе 8 «Запрещённые маршруты».",
      style: "small",
      margin: [0, 0, 0, 4],
    },
    {
      text:
        "5.3.8. В случае дорожно-транспортного происшествия (включая угон, попытку угона, акт вандализма, пожар), Арендатор обязан:\n" +
        "• немедленно вызвать представителей ГАИ;\n" +
        "• получить копию протокола ГАИ с указанием обстоятельств и повреждений;\n" +
        "• зафиксировать свидетелей (при их наличии);\n" +
        "• незамедлительно известить Арендодателя по телефону и письменно;\n" +
        "• действовать строго в соответствии с требованиями законодательства и указаниями ГАИ.",
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "6. ЗАЛОГ", style: "h2" },
    {
      text:
        "6.1. При получении автомобиля Арендатор оставляет у Арендодателя залог в размере 15 000 рублей.\n" +
        "6.2. Если по вине Арендатора произойдёт авария или другой страховой случай, и сумма ущерба не превышает 15 000 рублей, то Арендодатель возвращает Арендатору разницу между суммой ущерба и залогом.\n" +
        "6.3. Если сумма ущерба больше 50 000 рублей, то Арендатор доплачивает Арендодателю разницу.\n" +
        "6.4. Если за время аренды страховых случаев не было, залог полностью возвращается Арендатору при возврате автомобиля.",
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "7. ДОСРОЧНОЕ РАСТОРЖЕНИЕ", style: "h2" },
    {
      text: "7.1. Арендодатель вправе расторгнуть договор при существенных нарушениях условий аренды.\n7.2. Арендатор вправе требовать расторжения при непредоставлении ТС, препятствиях в пользовании, скрытых неисправностях или непригодности ТС.",
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "8. ЗАПРЕЩЁННЫЕ МАРШРУТЫ", style: "h2" },
    {
      text: "8.1. Гегский водопад.\n8.2. Перевал Пыв.\n8.3. Заброшенный город Акармара.\n8.4. Опасные горные маршруты и водопады.\n8.5. Песчаные пляжи",
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

    { text: "", pageBreak: "before" },

    { text: "Приложение №1. Акт приёма-передачи ТС", style: "h2" },
    { text: `г. Сухум, «${String(input.issuedAt.getUTCDate()).padStart(2, "0")}» ${input.issuedAt.toLocaleDateString("ru-RU", { month: "long", timeZone: "UTC" })} ${input.issuedAt.getUTCFullYear()} г.`, style: "small", margin: [0, 0, 0, 4] },
    {
      text:
        "Мы, нижеподписавшиеся, Арендодатель __________ и Арендатор __________ составили настоящий акт о том, что:\n" +
        "1. Арендодатель передал, а Арендатор принял ТС: ______________________.\n" +
        "2. Состояние ТС: ___________________________.\n" +
        "3. Документы: ___________________________.\n" +
        "4. Стороны произвели осмотр и согласовали имеющиеся повреждения.",
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "Подписи сторон:", style: "h2" },
    signLinesBlock(),

    { text: "Приложение №2. Акт возврата ТС", style: "h2", margin: [0, 10, 0, 4] },
    { text: `г. Сухум, «${String(input.issuedAt.getUTCDate()).padStart(2, "0")}» ${input.issuedAt.toLocaleDateString("ru-RU", { month: "long", timeZone: "UTC" })} ${input.issuedAt.getUTCFullYear()} г.`, style: "small", margin: [0, 0, 0, 4] },
    {
      text:
        "Мы, нижеподписавшиеся, Арендодатель __________ и Арендатор __________ составили настоящий акт о том, что:\n" +
        "1. Арендатор возвратил, а Арендодатель принял ТС: ______________________.\n" +
        "2. Состояние ТС при возврате: ___________________________.\n" +
        "3. Комплект документов: ___________________________.\n" +
        "4. Претензии: ______________________________________.",
      style: "small",
      margin: [0, 0, 0, 6],
    },
    { text: "Подписи сторон:", style: "h2" },
    signLinesBlock(),
  ];

  return {
    pageSize: "A4" as const,
    pageMargins: [28, 28, 28, 28] as [number, number, number, number],
    defaultStyle: {
      font: "Roboto",
      fontSize: 8,
      lineHeight: 1.1,
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
