"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

import { createCarAction, updateCarAction, type CarFormPayload } from "@/app/actions/admin-cars";

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  fontSize: "var(--text-base)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
};

export type CarFormInitial = {
  slug: string;
  make: string;
  model: string;
  description: string;
  pricePerDayRub: number;
  active: boolean;
  images: { url: string; alt: string }[];
};

type CarFormProps =
  | { mode: "create"; carId?: undefined; initial?: undefined }
  | { mode: "edit"; carId: string; initial: CarFormInitial };

/** Превью по адресу фото (локальный путь или https). */
function ImageUrlPreview({ url }: { url: string }) {
  const trimmed = url.trim();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [trimmed]);

  if (!trimmed) return null;

  if (failed) {
    return (
      <div
        role="status"
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
          padding: "0.65rem",
          background: "var(--color-border)",
          borderRadius: "var(--radius-md)",
          maxWidth: "280px",
        }}
      >
        Не удалось загрузить превью — проверьте URL.
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- превью в админке без next/image
    <img
      src={trimmed}
      alt=""
      onError={() => setFailed(true)}
      style={{
        display: "block",
        width: "100%",
        maxWidth: "280px",
        height: "auto",
        maxHeight: "168px",
        objectFit: "cover",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--color-border)",
        background: "var(--color-border)",
      }}
    />
  );
}

export function CarForm(props: CarFormProps) {
  const router = useRouter();
  const initial = props.mode === "edit" ? props.initial : undefined;

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [make, setMake] = useState(initial?.make ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [pricePerDayRub, setPricePerDayRub] = useState(String(initial?.pricePerDayRub ?? ""));
  const [active, setActive] = useState(initial?.active ?? true);
  const [images, setImages] = useState<{ url: string; alt: string }[]>(
    initial?.images?.length ? initial.images : [{ url: "", alt: "" }],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function addImageRow() {
    setImages((prev) => [...prev, { url: "", alt: "" }]);
  }

  function removeImageRow(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function setImageRow(index: number, field: "url" | "alt", value: string) {
    setImages((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: value };
      next[index] = row;
      return next;
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const price = Number(pricePerDayRub);
    const payload: CarFormPayload = {
      slug,
      make,
      model,
      description,
      pricePerDayRub: price,
      active,
      images: images.map((i) => ({ url: i.url.trim(), alt: i.alt.trim() })),
    };
    setPending(true);
    const res =
      props.mode === "create"
        ? await createCarAction(payload)
        : await updateCarAction(props.carId, payload);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/admin-panel/cars");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "36rem" }}>
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
        Рекомендуемый способ: положите файлы в папку{" "}
        <code style={{ fontSize: "0.85em" }}>public/cars/&lt;slug&gt;/</code> (slug совпадает с полем ниже), например{" "}
        <code style={{ fontSize: "0.85em" }}>public/cars/toyota-camry/1.jpg</code>. В каждой строке фото укажите путь как
        на сайте: <code style={{ fontSize: "0.85em" }}>/cars/toyota-camry/1.jpg</code>. Допустимы jpg, png, webp, svg.
        Альтернатива — внешняя <code style={{ fontSize: "0.85em" }}>https://</code> ссылка; тогда домен добавьте в{" "}
        <code style={{ fontSize: "0.85em" }}>next.config.ts</code> → <code style={{ fontSize: "0.85em" }}>images.remotePatterns</code>.
      </p>

      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Slug (URL)
        <input
          name="slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="toyota-camry"
          style={fieldStyle}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Марка
        <input name="make" required value={make} onChange={(e) => setMake(e.target.value)} style={fieldStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Модель
        <input name="model" required value={model} onChange={(e) => setModel(e.target.value)} style={fieldStyle} />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Описание
        <textarea
          name="description"
          required
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...fieldStyle, resize: "vertical", minHeight: "6rem" }}
        />
      </label>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" }}>
        Цена за сутки (₽, целое)
        <input
          name="pricePerDayRub"
          type="number"
          required
          min={1}
          step={1}
          value={pricePerDayRub}
          onChange={(e) => setPricePerDayRub(e.target.value)}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--text-sm)", cursor: "pointer" }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Показывать в каталоге на сайте
      </label>

      <div>
        <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)", fontWeight: 600 }}>Фотографии</p>
        {images.map((row, index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gap: "0.5rem",
              marginBottom: "0.75rem",
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
            }}
          >
            <input
              placeholder="/cars/slug/1.jpg или https://…"
              value={row.url}
              onChange={(e) => setImageRow(index, "url", e.target.value)}
              style={fieldStyle}
            />
            <ImageUrlPreview url={row.url} />
            <input
              placeholder="Подпись (alt)"
              value={row.alt}
              onChange={(e) => setImageRow(index, "alt", e.target.value)}
              style={fieldStyle}
            />
            {images.length > 1 ? (
              <button
                type="button"
                onClick={() => removeImageRow(index)}
                style={{
                  justifySelf: "start",
                  fontSize: "var(--text-sm)",
                  border: "none",
                  background: "none",
                  color: "var(--color-danger, #b00020)",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Убрать фото
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={addImageRow}
          style={{
            fontSize: "var(--text-sm)",
            padding: "0.4rem 0.75rem",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--color-border)",
            background: "transparent",
            cursor: "pointer",
            color: "var(--color-text)",
          }}
        >
          + Ещё фото
        </button>
      </div>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-danger, #c00)" }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "0.65rem 1.25rem",
            borderRadius: "999px",
            border: "none",
            background: "var(--color-accent)",
            color: "#fff",
            fontWeight: 600,
            cursor: pending ? "wait" : "pointer",
          }}
        >
          {pending ? "Сохранение…" : props.mode === "create" ? "Создать" : "Сохранить"}
        </button>
        <Link href="/admin-panel/cars" style={{ fontSize: "var(--text-sm)" }}>
          Отмена
        </Link>
      </div>
    </form>
  );
}
