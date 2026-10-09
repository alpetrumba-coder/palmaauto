"""
Нормализация истории из УК.xlsx (лист «Массив данных») для переноса в учёт ПальмаАвто.

Вход:   УК.xlsx, dictionaries.json (npx tsx scripts/dump-dictionaries.ts), необязательно flags.json {строка_файла: примечание}
Выход:  import_ops.json (операции с именами касс/статей/объектов для scripts/import-operations.ts) и import_report.json (что перенесено/пропущено/почему)

Решения владельца (09.10.2026):
  * основа — файл, поправленный по 1С; спорные строки помечаются «проверить» (flags.json);
  * «зеркальные» строки владельцев (Проект N, Библая, Кизер, Кошман) переносятся один раз: пара в УН — основная;
  * кассы сопоставляются по косвенным признакам, неясное — в служебную кассу;
  * строки, совпавшие с удалёнными/не проведёнными документами 1С, — с пометкой «проверить»;
  * остатки касс историей не считаются (isImported=true исключается из остатков).
"""
import collections
import json
import re
import sys

import openpyxl

sys.stdout.reconfigure(encoding="utf-8")
XLS, DICT, OUT, REPORT = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
FLAGS = json.load(open(sys.argv[5], encoding="utf-8")) if len(sys.argv) > 5 else {}

SERVICE_CASH = "Перенесённая история (не распознано)"
CAT_REFUND, CAT_SERVICE_IN, CAT_OTHER_EXP, CAT_OWNER_PAY = (
    "Возврат клиенту", "Служебное: получение денег (не доход)", "Прочие расходы (не классифицировано)", "Выплата собственнику (аренда помещений)")


def norm(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def key(s):
    return norm(s).lower()


d = json.load(open(DICT, encoding="utf-8"))
asset_by = {}
for a in d["assets"]:
    for al in [a["name"]] + (a["aliases"] or "").split("\n"):
        if norm(al):
            asset_by[key(al)] = a["id"]
cat_by = {}
for c in d["categories"]:
    for al in [c["name"]] + (c["aliases"] or "").split("\n"):
        if norm(al):
            cat_by[key(al)] = c
cat_name = {c["name"]: c for c in d["categories"]}
cash_by = {c["name"]: c["id"] for c in d["cash"]}
asset_name = {a["id"]: a["name"] for a in d["assets"]}
for need in (SERVICE_CASH, CAT_REFUND, CAT_SERVICE_IN, CAT_OTHER_EXP, CAT_OWNER_PAY):
    assert need in cash_by or need in cat_name, f"в справочниках нет «{need}» — запустите seed-accounting на этой базе"

ws = openpyxl.load_workbook(XLS, data_only=True)["Массив данных"]
rows = [(i, r) for i, r in enumerate(ws.iter_rows(min_row=3, values_only=True), start=3) if r[1]]

RENT = "аренда помещений и прочего имущества"
un_keys = collections.defaultdict(list)
for i, r in rows:
    if norm(r[2]) == "УН" and key(r[8]) == RENT and (r[12] or 0) != 0:
        un_keys[(r[1].date(), key(r[3]), round(abs(r[12])))].append(i)


def cash_for(r, op_type):
    """Касса по косвенным признакам: подсказки в тексте, затем плательщик и форма оплаты. Возвращает (имя кассы, причина)."""
    text = key(r[7]) + " " + key(r[13])
    payer, form = norm(r[4]), key(r[6]).replace("\\", "/").replace(".", "/")
    if re.search(r"нестеров", text):
        return "Карта Анны Нестеровой", "текст: Нестерова"
    if "монет" in text:
        return "Монета", "текст: Монета"
    if re.search(r"т-?\s?банк|тинькофф|тбанк", text):
        return "Т-банк", "текст: Т-банк"
    if re.search(r"карт[уаые]\s?х\b|на х\b", text):
        return "Карта Х", "текст: карта Х"
    if payer == "Дмитрий":
        return "Карта Дмитрия Л.", "плательщик: Дмитрий"
    if payer == "Ева":
        if op_type == "HANDOVER":
            return "Наличные Ева", "сдача — наличные Евы"
        if form == "нал":
            return "Наличные Ева", "плательщик Ева + нал"
        if form == "б/нал":
            return "Карта Евы", "плательщик Ева + безнал"
        if "нал" in text:
            return "Наличные Ева", "Ева, форма пуста, в тексте «нал»"
        if "карт" in text:
            return "Карта Евы", "Ева, форма пуста, в тексте «карт»"
    if payer.lower().startswith("фин"):
        return "Т-банк", "плательщик: Фин. служба"
    return SERVICE_CASH, f"не определена (плательщик «{payer}», форма «{form}»)"


ops, skipped, notes = [], [], []
rep = collections.defaultdict(collections.Counter)
rep_sum = collections.defaultdict(float)
unmapped_obj, unmapped_art = collections.Counter(), collections.Counter()


def skip(i, r, reason):
    skipped.append(dict(row=i, date=str(r[1].date()), project=norm(r[2]), obj=norm(r[3]), op=norm(r[5]), article=norm(r[8]), amount=r[12], reason=reason, docno=norm(r[14])))


for i, r in rows:
    project, typ, art, amount = norm(r[2]), norm(r[5]), key(r[8]), r[12] or 0
    if amount == 0:
        skip(i, r, "нулевая сумма")
        continue
    # 1) вторая сторона платежа владельца: пара в УН (дата + объект + сумма, обе статьи — аренда помещений)
    if project != "УН" and art == RENT and un_keys.get((r[1].date(), key(r[3]), round(abs(amount)))):
        skip(i, r, f"зеркало платежа УН (строка {un_keys[(r[1].date(), key(r[3]), round(abs(amount)))][0]}) — перенесён один раз")
        continue
    if project != "УН" and art == RENT:
        skip(i, r, "строка владельца по аренде без пары в УН — не переносится (проверить вручную)")
        continue

    cat = cat_by.get(art)
    review = FLAGS.get(str(i))
    note = None
    comment_hint = key(r[7])
    op_type = category = None

    if art == "подотчет":
        if typ in ("Получение ДС из кассы ТДР", "Получение ДС на карту"):
            op_type, category = "INCOME", cat_name[CAT_SERVICE_IN]
        elif typ == "Возврат за бронирование":
            op_type, category = "EXPENSE", cat_name[CAT_REFUND]
        elif typ == "Сдано в кассу" or "сдача выручки" in comment_hint:
            op_type = "HANDOVER"
        else:
            op_type, category = "EXPENSE", cat_name[CAT_OTHER_EXP]
            review = (review + "; " if review else "") + "статья «Подотчёт» при выбытии: уточнить статью расхода"
    elif cat is None:
        unmapped_art[norm(r[8])] += 1
        skip(i, r, f"статья «{norm(r[8])}» не найдена в справочнике")
        continue
    elif cat["kind"] == "EXPENSE":
        if amount < 0:
            op_type, category = "EXPENSE", cat
            if typ.startswith("Поступление"):
                category = cat_name[CAT_OWNER_PAY] if art == RENT else cat
                review = (review + "; " if review else "") + "в файле тип «Поступление от клиентов», по смыслу расход"
        else:
            skip(i, r, "расходная статья с плюсом: техническая/обратная проводка")
            continue
    else:  # доходная статья
        if amount > 0:
            op_type, category = "INCOME", cat
            if typ.startswith("Выбытие"):
                review = (review + "; " if review else "") + "в файле тип «Выбытие поставщикам» при доходной статье"
        else:
            op_type, category = "EXPENSE", cat_name[CAT_REFUND]
            review = (review + "; " if review else "") + "минус по доходной статье — учтён как возврат клиенту"

    account, why = cash_for(r, op_type)
    # объект
    obj_txt = norm(r[3])
    asset_id = asset_by.get(key(obj_txt))
    prefix = ""
    if asset_id is None and obj_txt and key(obj_txt) not in ("подотчет",):
        if key(obj_txt) == "распределяемые расходы":
            prefix = "[общие расходы] "
        else:
            unmapped_obj[obj_txt] += 1
            prefix = f"[объект: {obj_txt}] "
    parts = [p for p in (norm(r[7]), norm(r[13])) if p]
    tail = f"плательщик: {norm(r[4])}" + (f", № {norm(r[14])}" if r[14] else "") + (f", проект в файле: {project}" if project != "УН" else "")
    comment = (prefix + " · ".join(parts) + (" · " if parts else "") + tail)[:900]

    ops.append(dict(
        sourceRef=f"uk:{i}", date=str(r[1].date()), type=op_type, amountKop=round(abs(amount) * 100),
        account=account, categoryName=category["name"] if category else None, assetName=asset_name.get(asset_id), comment=comment,
        needsReview=bool(review), reviewNote=review, accountReason=why,
    ))
    y = str(r[1].year)
    rep["type"][op_type] += 1
    rep["account"][account] += 1
    rep["year"][y] += 1
    rep_sum[f"{op_type}:{y}"] += abs(amount)
    if account == SERVICE_CASH:
        rep["service_reason"][why] += 1
    if review:
        rep["review"][review.split(";")[0][:60]] += 1

for o in ops:
    o["accountName"] = o.pop("account")  # имена, а не ID: один и тот же файл грузится и в тестовую, и в боевую базу

json.dump(ops, open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
skip_c = collections.Counter(re.sub(r"\(строка \d+\)", "", s["reason"]) for s in skipped)
report = dict(
    source_rows=len(rows), imported=len(ops), skipped=len(skipped),
    by_type=dict(rep["type"]), by_account=dict(rep["account"]), by_year=dict(rep["year"]), review=dict(rep["review"]),
    service_reasons=dict(rep["service_reason"].most_common(8)), skip_reasons=dict(skip_c),
    unmapped_objects=dict(unmapped_obj), unmapped_articles=dict(unmapped_art),
    sums_rub={k: round(v, 2) for k, v in sorted(rep_sum.items())}, skipped_rows=skipped,
)
json.dump(report, open(REPORT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"строк в файле {len(rows)}: к импорту {len(ops)}, пропущено {len(skipped)}")
print("типы:", dict(rep["type"]))
print("кассы:", dict(rep["account"]))
print("пропуски:", dict(skip_c))
print("с пометкой «проверить»:", sum(rep["review"].values()), dict(rep["review"]))
print("не найденные объекты:", dict(unmapped_obj), "| статьи:", dict(unmapped_art))
