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
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
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
