"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Preview = { total: number; alreadyThere: number; toCreate: number; needsReview: number; byType: Record<string, number>; missing: string[] };

const TYPE_LABEL: Record<string, string> = { INCOME: "приходов", EXPENSE: "расходов", HANDOVER: "сдач в Рубин", TRANSFER: "перемещений" };

/** Загрузка истории: сначала предпросмотр (ничего не пишется), затем подтверждение. */
export function ImportHistory() {
  const router = useRouter();
  const [rows, setRows] = useState<unknown[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function post(dryRun: boolean, data: unknown[]) {
    const res = await fetch(`/admin-panel/import-history${dryRun ? "?dryRun=1" : ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `Ошибка ${res.status}`);
    return json;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ""; // чтобы тот же файл можно было выбрать повторно
    setPreview(null);
    setMessage(null);
    setError(null);
    setRows(null);
    if (!file) return;
    setFileName(file.name);
    setPending(true);
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error("В файле должен быть список операций.");
      setRows(data);
      const json = await post(true, data);
      setPreview(json.preview as Preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось прочитать файл.");
    } finally {
      setPending(false);
    }
  }

  async function onConfirm() {
    if (!rows) return;
    setPending(true);
    setError(null);
    try {
      const json = await post(false, rows);
      setMessage(`Готово: создано ${json.result.created}, уже было ${json.result.alreadyThere}, всего в файле ${json.result.total}.`);
      setPreview(null);
      setRows(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "40rem" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "var(--text-sm)" }}>
        Файл истории (JSON, подготовленный нормализатором)
        <input type="file" accept=".json,application/json" onChange={onFile} disabled={pending} />
      </label>

      {pending ? <p style={{ margin: 0 }}>Обработка…</p> : null}

      {preview ? (
        <div style={{ padding: "0.9rem 1rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-surface)", fontSize: "var(--text-sm)" }}>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>Предпросмотр: {fileName}</p>
          <p style={{ margin: "0 0 0.25rem" }}>
            Строк в файле: <strong>{preview.total}</strong> · будет создано: <strong>{preview.toCreate}</strong> · уже есть: <strong>{preview.alreadyThere}</strong> · «проверить»: {preview.needsReview}
          </p>
          <p style={{ margin: "0 0 0.5rem", color: "var(--color-text-secondary)" }}>
            {Object.entries(preview.byType)
              .map(([k, v]) => `${v} ${TYPE_LABEL[k] ?? k}`)
              .join(" · ")}
          </p>
          {preview.missing.length > 0 ? (
            <p role="alert" style={{ margin: 0, color: "var(--color-danger, #b00020)" }}>
              В справочниках не найдено: {preview.missing.join(", ")}. Сначала нажмите «Справочники → Заполнить стартовыми данными».
            </p>
          ) : preview.toCreate === 0 ? (
            <p style={{ margin: 0 }}>Всё уже загружено, делать нечего.</p>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="nav-tap-target"
              style={{ padding: "0.7rem 1.4rem", borderRadius: "999px", background: "var(--color-accent)", color: "#fff", fontWeight: 700, border: "none", cursor: pending ? "wait" : "pointer" }}
            >
              Загрузить {preview.toCreate} операций
            </button>
          )}
        </div>
      ) : null}

      {message ? <p role="status" style={{ margin: 0, fontWeight: 600 }}>{message}</p> : null}
      {error ? <p role="alert" style={{ margin: 0, color: "var(--color-danger, #b00020)" }}>{error}</p> : null}
    </div>
  );
}
