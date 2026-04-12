import sharp from "sharp";

/** Выход: 16:10, горизонтальный стандарт каталога (как у карточек). */
const OUT_W = 1600;
const OUT_H = 1000;
const RATIO = OUT_W / OUT_H;

/**
 * Поворот по EXIF, центральная обрезка под 16:10, ресайз, JPEG.
 * Вертикальные и квадратные кадры обрезаются по центру до горизонтали.
 */
export async function processCarPhotoBuffer(input: Buffer): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) {
    throw new Error("Не удалось прочитать размеры изображения");
  }
  if (meta.format === "svg") {
    throw new Error("SVG не поддерживается — загрузите JPG, PNG или WebP");
  }

  let left = 0;
  let top = 0;
  let cw = w;
  let ch = h;
  const r = w / h;
  if (r > RATIO) {
    cw = Math.round(h * RATIO);
    left = Math.floor((w - cw) / 2);
  } else if (r < RATIO) {
    ch = Math.round(w / RATIO);
    top = Math.floor((h - ch) / 2);
  }

  return sharp(input)
    .rotate()
    .extract({ left, top, width: cw, height: ch })
    .resize(OUT_W, OUT_H, { fit: "fill" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
