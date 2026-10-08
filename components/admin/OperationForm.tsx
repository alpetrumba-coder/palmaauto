"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createOperationAction, updateOperationAction, type OperationInput } from "@/app/actions/accounting";

export type OpAccount = { id: string; name: string; responsible: string | null };
export type OpCategory = { id: string; name: string; kind: "INCOME" | "EXPENSE"; nature: "VARIABLE" | "FIXED" };
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

const TYPE_BUTTONS: { type: OperationInput["type"]; label: string }[] = [
  { type: "INCOME", label: "Приход" },
  { type: "EXPENSE", label: "Расход" },
  { type: "TRANSFER", label: "Перемещение" },
  { type: "HANDOVER", label: "Сдано в Рубин" },
];

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

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "34rem" }}>
      <div role="group" aria-label="Вид операции" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
        {TYPE_BUTTONS.map((b) => (
          <button
            key={b.type}
            type="button"
            onClick={() => changeType(b.type)}
            aria-pressed={v.type === b.type}
            style={{
              padding: "0.8rem 0.5rem",
              borderRadius: "var(--radius-md)",
              border: v.type === b.type ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
              background: v.type === b.type ? "var(--color-surface)" : "transparent",
              color: "var(--color-text)",
              fontWeight: v.type === b.type ? 700 : 400,
              fontSize: "var(--text-base)",
              cursor: "pointer",
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

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
            <select value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)} style={fieldStyle}>
              <option value="">— выберите статью —</option>
              {v.type === "EXPENSE" ? (
                <>
                  <optgroup label="К заезду / аренде">
                    {cats.filter((c) => c.nature === "VARIABLE").map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Постоянные">
                    {cats.filter((c) => c.nature === "FIXED").map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                </>
              ) : (
                cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </label>

          <label style={labelStyle}>
            Объект
            <select value={v.assetId} onChange={(e) => setV((p) => ({ ...p, assetId: e.target.value, dealId: "" }))} disabled={dealLocked} style={fieldStyle}>
              <option value="">— без объекта (общий) —</option>
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
            {asset?.kind === "CAR" ? "Аренда" : "Заезд"} (необязательно)
            <select value={v.dealId} onChange={(e) => changeDeal(e.target.value)} style={fieldStyle}>
              <option value="">— не привязывать —</option>
              {dealsForAsset.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      <label style={labelStyle}>
        Дата *
        <input type="date" value={v.date} onChange={(e) => set("date", e.target.value)} style={fieldStyle} />
      </label>

      <label style={labelStyle}>
        Комментарий
        <textarea rows={2} value={v.comment} onChange={(e) => set("comment", e.target.value)} style={{ ...fieldStyle, resize: "vertical" }} />
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
