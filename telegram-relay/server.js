// Мини-прокси к api.telegram.org. Без зависимостей (голый Node).
// Пускает запрос дальше, только если в заголовке X-Relay-Secret пришёл правильный секрет (переменная RELAY_SECRET).
// /health отвечает без секрета — для проверки, что сам прокси жив.
"use strict";
const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 3000;
const SECRET = process.env.RELAY_SECRET || "";

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (!SECRET || req.headers["x-relay-secret"] !== SECRET) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
    return;
  }

  const chunks = [];
  let size = 0;
  req.on("data", (c) => {
    size += c.length;
    if (size <= 8_000_000) chunks.push(c);
  });
  req.on("end", async () => {
    const body = Buffer.concat(chunks);

    // POST /stt: тело — голосовое Telegram (Ogg Opus), ответ {"text": "..."} — распознавание через OpenAI.
    // Ключ OPENAI_API_KEY хранится только на этом сервере; модель — STT_MODEL (по умолчанию whisper-1).
    if (req.url === "/stt" && req.method === "POST") {
      const json = (code, obj) => {
        res.writeHead(code, { "Content-Type": "application/json" });
        res.end(JSON.stringify(obj));
      };
      const key = process.env.OPENAI_API_KEY;
      if (!key) return json(500, { error: "на прокси не задан OPENAI_API_KEY" });
      if (size > 8_000_000 || body.length === 0) return json(400, { error: "пустое или слишком большое аудио" });
      try {
        const form = new FormData();
        form.append("file", new Blob([body], { type: "audio/ogg" }), "voice.ogg");
        form.append("model", process.env.STT_MODEL || "whisper-1");
        form.append("language", "ru");
        form.append("temperature", "0");
        form.append("prompt", "Учёт квартир и машин: расход, приход, оплата, перемещение, уборка, стирка, ремонт, Рио, Мансарда, Африка, Муха, Домик, Матисс, Полёт, Маркиза, Дольче Вита, Эшерская, Касса Ева, Карта Х, Рубин.");
        const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: "Bearer " + key },
          body: form,
          signal: AbortSignal.timeout(22000),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return json(502, { error: "OpenAI " + r.status + ": " + String((j.error && j.error.message) || "").slice(0, 150) });
        return json(200, { text: j.text || "" });
      } catch (e) {
        return json(502, { error: String(e && e.message ? e.message : e) });
      }
    }
    const headers = { ...req.headers, host: "api.telegram.org" };
    delete headers["x-relay-secret"];

    const upstream = https.request(
      { hostname: "api.telegram.org", path: req.url, method: req.method, headers },
      (upRes) => {
        res.writeHead(upRes.statusCode || 502, upRes.headers);
        upRes.pipe(res);
      },
    );
    upstream.on("error", (e) => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) }));
    });
    upstream.end(body);
  });
});

server.listen(PORT, () => console.log("telegram-relay listening on " + PORT));
