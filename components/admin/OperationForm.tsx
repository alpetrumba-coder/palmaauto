"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createOperationAction, updateOperationAction, type OperationInput } from "@/app/actions/accounting";

export type OpAccount = { id: string; name: string; responsible: string | null };
/** binding — к чему статья обязательно привязывается (свод правил): deal — к заезду, object — к объекту, general — общий, null — как удобно. */
export type OpCategory = { id: string; name: string; kind: "INCOME" | "EXPENSE"; binding: string | null };
export type OpAsset = { id: string; name: string; kind: "APARTMENT" | "CAR" };
export type OpDeal = { id: string; label: string; assetId: string };

type Props = {
  accounts: OpAccount[];
  categories: OpCategory[];
  assets: OpAsset[];
  deals: OpDeal[];
  /** Для правки: id операции и текущие значения. */
  operationId?: string;
  initial?: OperationInput;
  defaultType?: OperationInput["type"];
  /** Заранее выбранный заезд/аренда (например, из карточки заезда). */
  presetDealId?: string;
  doneHref: string;
};

// Перемещение между кассами — отдельный вид операции (не доход и не расход).
// HANDOVER («Сдано в Рубин») — старый тип, показывается только при правке старых записей (см. visibleTypeButtons ниже).
const TYPE_BUTTONS: { type: OperationInput["type"]; label: string }[] = [
  { type: "INCOME", label: "Приход" },
  { type: "EXPENSE", label: "Расход" },
  { type: "TRANSFER", label: "Перемещение" },
  { type: "HANDOVER", label: "Сдано в Рубин (старое)" },
];

const BINDING_GROUPS: { binding: string | null; label: string }[] = [
  { binding: "deal", label: "К заезду / аренде" },
  { binding: "object", label: "К объекту" },
  { binding: "general", label: "Общие" },
  { binding: null, label: "Другие" },
];

const BINDING_HINT: Record<string, string> = {
  deal: "Эта статья всегда привязывается к заезду (брони) — выберите его ниже.",
  object: "Эта статья привязывается к объекту — выберите квартиру или машину.",
  general: "Общая статья: объект не нужен, в комментарии коротко напишите, на что.",
};

const TYPE_HINT: Record<OperationInput["type"], string> = {
  INCOME: "Деньги пришли в кассу: оплата от гостя, аренда авто и т.п.",
  EXPENSE: "Деньги ушли из кассы: уборка, стирка, закупка, коммуналка и т.п.",
  TRANSFER: "Переложили деньги из одной кассы в другую: из первой спишется, во вторую придёт; в отчётах это не расход. Сдача наличных в Рубин — кассой-получателем выберите «Касса Рубина».",
  HANDOVER: "Старый вид операции (до объединения с кассой «Касса Рубина») — для новых записей используйте «Перемещение».",
};

const ACCOUNT_LABEL: Record<OperationInput["type"], string> = {
  INCOME: "Куда пришли деньги",
  EXPENSE: "Из какой кассы",
  TRANSFER: "Из кассы",
  HANDOVER: "Из какой кассы сдано",
};

const LAST_ACCOUNT_KEY = "pa_last_account";

const fieldStyle: React.CSSProperties = {
  padding: "0.7rem 0.8rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  font: "inherit",
  fontSize: "16px",
  width: "100%",
};

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "var(--text-sm)" };
const hintStyle: React.CSSProperties = { fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" };

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function OperationForm({ accounts, categories, assets, deals, operationId, initial, defaultType, presetDealId, doneHref }: Props) {
  const router = useRouter();
  const presetDeal = presetDealId ? deals.find((d) => d.id === presetDealId) : undefined;

  const [v, setV] = useState<OperationInput>(
    initial ?? {
      date: localToday(),
      type: defaultType ?? "INCOME",
      amount: "",
      accountId: "",
      toAccountId: "",
      categoryId: "",
      assetId: presetDeal?.assetId ?? "",
      dealId: presetDeal?.id ?? "",
      comment: "",
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Подставляем последнюю использованную кассу (только для новой операции).
  useEffect(() => {
    if (initial) return;
    try {
      const last = localStorage.getItem(LAST_ACCOUNT_KEY);
      if (last && accounts.some((a) => a.id === last)) setV((p) => (p.accountId ? p : { ...p, accountId: last }));
    } catch {
      /* localStorage недоступен — не страшно */
    }
  }, [accounts, initial]);

  const set = <K extends keyof OperationInput>(k: K, val: OperationInput[K]) => setV((p) => ({ ...p, [k]: val }));

  const isMoney = v.type === "INCOME" || v.type === "EXPENSE";
  const kind = v.type === "INCOME" ? "INCOME" : "EXPENSE";
  const cats = categories.filter((c) => c.kind === kind);
  const dealsForAsset = deals.filter((d) => !v.assetId || d.assetId === v.assetId);
  const dealLocked = !!v.dealId;
  const binding = isMoney ? (categories.find((c) => c.id === v.categoryId)?.binding ?? null) : null;
  const isGeneral = binding === "general";
  // общий (без объекта) — просим пояснение; для статей «к заезду / к объекту» вместо этого нужна привязка
  const generalNote = isMoney && !v.assetId && binding !== "deal" && binding !== "object";

  function changeCategory(categoryId: string) {
    const b = categories.find((c) => c.id === categoryId)?.binding;
    // общая статья — ни к чему не привязывается
    setV((p) => ({ ...p, categoryId, ...(b === "general" ? { assetId: "", dealId: "" } : {}) }));
  }

  function changeType(t: OperationInput["type"]) {
    setV((p) => ({
      ...p,
      type: t,
      categoryId: categories.find((c) => c.id === p.categoryId)?.kind === (t === "INCOME" ? "INCOME" : "EXPENSE") ? p.categoryId : "",
      toAccountId: t === "TRANSFER" ? p.toAccountId : "",
      assetId: t === "INCOME" || t === "EXPENSE" ? p.assetId : "",
      dealId: t === "INCOME" || t === "EXPENSE" ? p.dealId : "",
    }));
  }

  function changeDeal(dealId: string) {
    const deal = deals.find((d) => d.id === dealId);
    setV((p) => ({ ...p, dealId, assetId: deal ? deal.assetId : p.assetId }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = operationId ? await updateOperationAction(operationId, v) : await createOperationAction(v);
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    try {
      localStorage.setItem(LAST_ACCOUNT_KEY, v.accountId);
    } catch {
      /* ignore */
    }
    router.push(doneHref);
    router.refresh();
  }

  const asset = assets.find((a) => a.id === v.assetId);
  // HANDOVER предлагаем только если это уже сохранённая операция такого типа (правка старой записи).
  const visibleTypeButtons = TYPE_BUTTONS.filter((b) => b.type !== "HANDOVER" || v.type === "HANDOVER");
  const isSelected = (t: OperationInput["type"]) => v.type === t;

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "34rem" }}>
      <div role="group" aria-label="Вид операции" style={{ display: "grid", gridTemplateColumns: `repeat(${visibleTypeButtons.length}, 1fr)`, gap: "2px", padding: "3px", borderRadius: "calc(var(--radius-md) - 2px)", background: "var(--color-border)" }}>
        {visibleTypeButtons.map((b) => (
          <button
            key={b.type}
            type="button"
            onClick={() => changeType(b.type)}
            aria-pressed={isSelected(b.type)}
            style={{
              padding: "0.6rem 0.5rem",
              borderRadius: "calc(var(--radius-md) - 4px)",
              border: "none",
              background: isSelected(b.type) ? "var(--color-surface)" : "transparent",
              boxShadow: isSelected(b.type) ? "0 1px 3px rgba(0,0,0,0.12)" : undefined,
              color: "var(--color-text)",
              fontWeight: isSelected(b.type) ? 600 : 400,
              fontSize: "var(--text-base)",
              cursor: "pointer",
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
      <p style={{ margin: "-0.6rem 0 0", fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>{TYPE_HINT[v.type]}</p>

      <label style={labelStyle}>
        Сумма, ₽ *
        <input
          inputMode="decimal"
          autoComplete="off"
          placeholder="например 3500 или 3500,50"
          value={v.amount}
          onChange={(e) => set("amount", e.target.value)}
          style={{ ...fieldStyle, fontSize: "20px", fontWeight: 600 }}
        />
      </label>

      <label style={labelStyle}>
        {ACCOUNT_LABEL[v.type]} *
        <select value={v.accountId} onChange={(e) => set("accountId", e.target.value)} style={fieldStyle}>
          <option value="">— выберите кассу —</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.responsible ? ` (${a.responsible})` : ""}
            </option>
          ))}
        </select>
      </label>

      {v.type === "TRANSFER" ? (
        <label style={labelStyle}>
          В кассу *
          <select value={v.toAccountId} onChange={(e) => set("toAccountId", e.target.value)} style={fieldStyle}>
            <option value="">— выберите кассу —</option>
            {accounts
              .filter((a) => a.id !== v.accountId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </label>
      ) : null}

      {isMoney ? (
        <>
          <label style={labelStyle}>
            Статья *
            <select value={v.categoryId} onChange={(e) => changeCategory(e.target.value)} style={fieldStyle}>
              <option value="">— выберите статью —</option>
              {v.type === "EXPENSE"
                ? BINDING_GROUPS.map((g) => {
                    const list = cats.filter((c) => c.binding === g.binding);
                    return list.length ? (
                      <optgroup key={g.label} label={g.label}>
                        {list.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null;
                  })
                : cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
            </select>
            {binding && BINDING_HINT[binding] ? <span style={hintStyle}>{BINDING_HINT[binding]}</span> : null}
          </label>
        </>
      ) : null}

      {isMoney && !isGeneral ? (
        <>
          <label style={labelStyle}>
            {binding === "object" ? "Объект *" : "Объект"}
            <select value={v.assetId} onChange={(e) => setV((p) => ({ ...p, assetId: e.target.value, dealId: "" }))} disabled={dealLocked} style={fieldStyle}>
              <option value="">{binding === "object" ? "— выберите объект —" : binding === "deal" ? "— все объекты —" : "— без объекта (общий) —"}</option>
              <optgroup label="Квартиры и дома">
                {assets.filter((a) => a.kind === "APARTMENT").map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Автомобили">
                {assets.filter((a) => a.kind === "CAR").map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <label style={labelStyle}>
            {asset?.kind === "CAR" ? "Аренда" : "Заезд"}
            {binding === "deal" ? " *" : " (необязательно)"}
            <select value={v.dealId} onChange={(e) => changeDeal(e.target.value)} style={fieldStyle}>
              <option value="">{binding === "deal" ? "— выберите бронь —" : "— не привязывать —"}</option>
              {dealsForAsset.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
              Нет нужной брони? Сначала заведите её на <a href="/admin-panel/bookings?tab=apts">шахматке</a> (или в боте: «новая бронь…»), потом вернитесь сюда.
            </span>
          </label>
        </>
      ) : null}

      <label style={labelStyle}>
        Дата *
        <input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} style={fieldStyle} />
      </label>

      <label style={labelStyle}>
        {generalNote ? "Комментарий — на что распределяется этот общий расход? *" : "Комментарий"}
        <textarea
          rows={2}
          value={v.comment}
          onChange={(e) => set("comment", e.target.value)}
          placeholder={generalNote ? "например: поровну на все 14 квартир, октябрь 2026" : undefined}
          style={{ ...fieldStyle, resize: "vertical" }}
        />
        {generalNote ? (
          <span style={hintStyle}>
            Без объекта операция считается общей (на несколько объектов или за период) — коротко опишите здесь, как она распределяется.
            Эта запись одна, дублировать по объектам не нужно.
          </span>
        ) : null}
      </label>

      {error ? (
        <p role="alert" style={{ margin: 0, color: "var(--color-danger, #b00020)", fontSize: "var(--text-sm)" }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="submit"
          disabled={pending}
          className="nav-tap-target"
          style={{
            padding: "0.8rem 1.6rem",
            borderRadius: "999px",
            background: "var(--color-accent)",
            color: "#fff",
            fontWeight: 700,
            border: "none",
            fontSize: "var(--text-base)",
            cursor: pending ? "wait" : "pointer",
          }}
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={() => router.push(doneHref)}
          className="nav-tap-target"
          style={{ padding: "0.8rem 1.4rem", borderRadius: "999px", border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text)", cursor: "pointer", fontSize: "var(--text-base)" }}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
