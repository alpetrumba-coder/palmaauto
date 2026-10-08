"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { saveDictionaryItemAction, type DictValues } from "@/app/actions/admin-dictionaries";
import type { DictEntity, DictSpec, FieldSpec } from "@/lib/dictionaries";
import { formatKop, kopToInput } from "@/lib/money";

export type DictRow = Record<string, string | number | boolean | null> & { id: string };

type Props = {
  entity: DictEntity;
  spec: DictSpec;
  rows: DictRow[];
  projects: { value: string; label: string }[];
  canEdit: boolean;
};

const fieldStyle: React.CSSProperties = {
  padding: "0.5rem 0.65rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  font: "inherit",
  width: "100%",
};

const cell: React.CSSProperties = { padding: "0.55rem 0.75rem", borderBottom: "1px solid var(--color-border)", verticalAlign: "top" };

function optionsFor(f: FieldSpec, projects: Props["projects"]) {
  return f.dynamicOptions === "projects" ? projects : (f.options ?? []);
}

function display(f: FieldSpec, row: DictRow, projects: Props["projects"]): string {
  const v = row[f.key];
  if (f.type === "checkbox") return v ? "да" : "нет";
  if (f.type === "money") return formatKop(Number(v ?? 0));
  if (v === null || v === undefined || v === "") return "—";
  if (f.type === "select") return optionsFor(f, projects).find((o) => o.value === v)?.label ?? String(v);
  return String(v);
}

function emptyValues(fields: FieldSpec[]): DictValues {
  const v: DictValues = {};
  for (const f of fields) {
    if (f.type === "checkbox") v[f.key] = true;
    else if (f.key === "ownerSharePct") v[f.key] = "65";
    else if (f.key.startsWith("commission")) v[f.key] = "0";
    else if (f.key === "sortOrder") v[f.key] = "0";
    else v[f.key] = "";
  }
  return v;
}

function valuesFromRow(fields: FieldSpec[], row: DictRow): DictValues {
  const v: DictValues = {};
  for (const f of fields) {
    const x = row[f.key];
    v[f.key] =
      f.type === "checkbox"
        ? x === true
        : f.type === "money"
          ? kopToInput(Number(x ?? 0))
          : x === null || x === undefined
            ? ""
            : String(x);
  }
  return v;
}

export function DictionaryTable({ entity, spec, rows, projects, canEdit }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [values, setValues] = useState<DictValues>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const listFields = spec.fields.filter((f) => f.inList);

  function startNew() {
    setValues(emptyValues(spec.fields));
    setEditingId("new");
    setError(null);
  }

  function startEdit(row: DictRow) {
    setValues(valuesFromRow(spec.fields, row));
    setEditingId(row.id);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await saveDictionaryItemAction(entity, editingId === "new" ? null : editingId, values);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <div>
      {canEdit && editingId === null ? (
        <button type="button" onClick={startNew} className="nav-tap-target" style={addBtn}>
          Добавить
        </button>
      ) : null}

      {editingId !== null ? (
        <form
          onSubmit={onSubmit}
          style={{
            margin: "0 0 1.25rem",
            padding: "1rem",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            gap: "0.85rem",
            background: "var(--color-surface)",
          }}
        >
          {spec.fields.map((f) => (
            <label
              key={f.key}
              style={{
                display: "flex",
                flexDirection: f.type === "checkbox" ? "row" : "column",
                alignItems: f.type === "checkbox" ? "center" : "stretch",
                gap: "0.35rem",
                fontSize: "var(--text-sm)",
              }}
            >
              {f.type === "checkbox" ? (
                <input
                  type="checkbox"
                  checked={values[f.key] === true}
                  onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.checked }))}
                />
              ) : null}
              <span>
                {f.label}
                {f.required ? " *" : ""}
              </span>
              {f.type === "money" ? (
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                  style={fieldStyle}
                />
              ) : null}
              {f.type === "text" || f.type === "number" ? (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  min={f.type === "number" ? 0 : undefined}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                  style={fieldStyle}
                />
              ) : null}
              {f.type === "textarea" ? (
                <textarea
                  rows={2}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                  style={{ ...fieldStyle, resize: "vertical" }}
                />
              ) : null}
              {f.type === "select" ? (
                <select
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                  style={fieldStyle}
                >
                  <option value="">{f.required ? "— выберите —" : "— нет —"}</option>
                  {optionsFor(f, projects).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : null}
              {f.hint && f.type !== "checkbox" ? (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{f.hint}</span>
              ) : null}
            </label>
          ))}
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" disabled={pending} className="nav-tap-target" style={addBtn}>
              {pending ? "Сохранение…" : "Сохранить"}
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="nav-tap-target" style={cancelBtn}>
              Отмена
            </button>
            {error ? (
              <span role="alert" style={{ color: "var(--color-danger, #b00020)", fontSize: "var(--text-sm)" }}>
                {error}
              </span>
            ) : null}
          </div>
        </form>
      ) : null}

      {rows.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)" }}>Пока пусто.</p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: editingId === null ? "1rem" : 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}>
            <thead>
              <tr style={{ background: "var(--color-surface)", textAlign: "left" }}>
                {listFields.map((f) => (
                  <th key={f.key} style={{ ...cell, fontWeight: 600 }}>
                    {f.label}
                  </th>
                ))}
                {canEdit ? <th style={cell} /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ opacity: row.active === false ? 0.5 : 1 }}>
                  {listFields.map((f) => (
                    <td key={f.key} style={cell}>
                      {display(f, row, projects)}
                    </td>
                  ))}
                  {canEdit ? (
                    <td style={{ ...cell, whiteSpace: "nowrap" }}>
                      <button type="button" onClick={() => startEdit(row)} style={linkBtn}>
                        Изменить
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const addBtn: React.CSSProperties = {
  display: "inline-flex",
  padding: "0.55rem 1.1rem",
  borderRadius: "999px",
  background: "var(--color-accent)",
  color: "#fff",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  fontSize: "var(--text-sm)",
};

const cancelBtn: React.CSSProperties = {
  padding: "0.55rem 1.1rem",
  borderRadius: "999px",
  border: "1px solid var(--color-border)",
  background: "transparent",
  color: "var(--color-text)",
  cursor: "pointer",
  fontSize: "var(--text-sm)",
};

const linkBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  font: "inherit",
  fontWeight: 600,
  color: "var(--color-accent)",
  cursor: "pointer",
  textDecoration: "underline",
};
