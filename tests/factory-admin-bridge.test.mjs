import assert from "node:assert/strict";
import { createPublicKey, verify } from "node:crypto";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { test } from "node:test";
import {
  FACTORY_EDITOR_PREFIX,
  createFactoryAdminHandler,
  gatewayRequestOptions,
  signGatewayRequest,
  sendGatewayRequest,
} from "../lib/factory-admin-bridge.ts";

const prefix = "/admin-panel/ai-editor";
const secret = "synthetic-auth-secret-for-factory-tests-only";
const owner = { role: "OWNER", staffId: "env", name: "Владелец" };
const request = (suffix = "/", init) => new Request("https://palmaauto.ru" + prefix + suffix, init);
const response = (overrides = {}) => ({ status: 200, headers: { "content-type": "text/html; charset=utf-8" }, body: Buffer.from("editor"), ...overrides });
const handler = (options = {}) => createFactoryAdminHandler({ getSession: async () => owner, authSecret: () => secret, transport: async () => response(), ...options });

const chatId = '11111111-1111-4111-8111-111111111111';
const attachmentId = '22222222-2222-4222-8222-222222222222';
const post = body => ({ method: 'POST', headers: { origin: 'https://palmaauto.ru', 'content-type': 'application/x-www-form-urlencoded' }, body });
test('chat request sizes apply only to exact upload and message routes', async () => {
  let calls=0;
  const run=handler({transport:async()=>{calls++;return response({status:202,headers:{'content-type':'application/json'},body:Buffer.from('{}')});}});
  assert.equal((await run(request('/chat/'+chatId+'/attachments',post('x'.repeat(65537))))).status,202);
  assert.equal((await run(request('/chat/'+chatId+'/messages',post('x'.repeat(256*1024))))).status,202);
  assert.equal((await run(request('/chat/'+chatId+'/messages',post('x'.repeat(256*1024+1))))).status,413);
  assert.equal((await run(request('/chat/bad/attachments',post('x'.repeat(65537))))).status,413);
  assert.equal((await run(request('/audit',post('x'.repeat(65537))))).status,413);
  assert.equal(calls,2);
});

test('bridge preserves inert attachment disposition and owner microphone policy only', async () => {
  const attachment='/chat/'+chatId+'/attachments/'+attachmentId;
  const headers={'content-type':'application/octet-stream','content-disposition':'attachment; filename="report.pdf"',
    'permissions-policy':'microphone=(), camera=(), geolocation=()','x-private':'secret'};
  const run=handler({transport:async()=>response({headers,body:Buffer.alloc(3*1024*1024)})});
  const result=await run(request(attachment));
  assert.equal(result.status,200);assert.equal(result.headers.get('content-disposition'),headers['content-disposition']);
  assert.equal(result.headers.get('permissions-policy'),headers['permissions-policy']);
  assert.equal(result.headers.get('x-private'),null);
  assert.equal((await run(request('/'))).status,503);
  const microphone=await handler({transport:async()=>response({headers:{'permissions-policy':'microphone=(self), camera=(), geolocation=()'}})})(request());
  assert.equal(microphone.headers.get('permissions-policy'),'microphone=(self), camera=(), geolocation=()');
  assert.equal((await handler({transport:async()=>response({headers:{...headers,'content-disposition':'inline'}})})(request(attachment))).status,503);
});

test('upstream upload validation statuses remain explicit',async()=>{
  for(const status of [413,415])assert.equal((await handler({transport:async()=>response({status})})(request('/chat/'+chatId+'/attachments',post('csrf=x')))).status,status);
});

test('signed uploads and transport retain exact sixteen and ten MiB scoped limits',async()=>{
  const input={method:'POST',path:prefix+'/chat/'+chatId+'/attachments',body:Buffer.alloc(16*1024*1024),ownerCookie:'',staffId:'env',authSecret:secret};
  assert.doesNotThrow(()=>signGatewayRequest(input));
  assert.throws(()=>signGatewayRequest({...input,body:Buffer.alloc(16*1024*1024+1)}));
  assert.throws(()=>signGatewayRequest({...input,path:input.path+'/extra'}));
  const download={...input,method:'GET',path:input.path+'/'+attachmentId,body:Buffer.alloc(0)};
  let size=10*1024*1024;
  const fake=fakeTransport(callback=>{const stream=Readable.from([Buffer.alloc(size)]);stream.statusCode=200;stream.headers={};callback(stream);});
  assert.equal((await sendGatewayRequest(signGatewayRequest(download),{ca:'CA',request:fake.request,timeoutMs:1000})).body.length,size);
  size++;await assert.rejects(sendGatewayRequest(signGatewayRequest(download),{ca:'CA',request:fake.request,timeoutMs:1000}));
  size=3*1024*1024;await assert.rejects(sendGatewayRequest(signGatewayRequest({...download,path:prefix+'/chat/'+chatId+'/state'}),{ca:'CA',request:fake.request,timeoutMs:1000}));
});

test('bridge rejects executable MIME and permissions outside their exact chat owner routes',async()=>{
  for(const [suffix,type] of [['/audit','application/javascript'],['/audit','application/json'],['/chat/bad/state','application/json'],['/audit','text/css']]){
    assert.equal((await handler({transport:async()=>response({headers:{'content-type':type}})})(request(suffix))).status,503);
  }
  for(const [suffix,type] of [['/chat-client.js','application/javascript; charset=utf-8'],['/chat-style.css','text/css; charset=utf-8'],['/chat/'+chatId+'/state','application/json; charset=utf-8']]){
    assert.equal((await handler({transport:async()=>response({headers:{'content-type':type}})})(request(suffix))).status,200);
  }
  const policy="default-src 'none'; script-src 'none'; form-action 'none'; sandbox";
  assert.equal((await handler({transport:async()=>response({headers:{'content-security-policy':policy,'permissions-policy':'microphone=(self), camera=(), geolocation=()'}})})(request('/preview/mission/run/'))).status,503);
  const disposition='attachment; filename="attachment"; filename*=UTF-8\'\'%D1%84%D0%B0%D0%B9%D0%BB.pdf';
  const result=await handler({transport:async()=>response({headers:{'content-type':'application/octet-stream','content-disposition':disposition}})})(request('/chat/'+chatId+'/attachments/'+attachmentId));
  assert.equal(result.status,200);assert.equal(result.headers.get('content-disposition'),disposition);assert.match(result.headers.get('content-security-policy'),/sandbox/);
});

test('bridge upload bodies get thirty seconds while ordinary bodies keep five',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  for(const [suffix,deadline] of [['/audit',5000],['/chat/'+chatId+'/attachments',30000]]){
    let cancelled=false;let settled=false;
    const stream=new ReadableStream({cancel(){cancelled=true;}});
    const pending=handler()(request(suffix,{...post(stream),duplex:'half'})).then(value=>{settled=true;return value;});
    await Promise.resolve();await Promise.resolve();
    t.mock.timers.tick(deadline-1);await Promise.resolve();assert.equal(settled,false);
    t.mock.timers.tick(1);assert.equal((await pending).status,408);assert.equal(cancelled,true);
  }
});

test("route binds the existing active staff session check and runtime", async () => {
  const { readFile } = await import("node:fs/promises");
  const route = await readFile(new URL("../app/admin-panel/ai-editor/[[...path]]/route.ts", import.meta.url), "utf8");
  assert.match(route, /getSession:\s*getAdminPanelSession/);
  assert.match(route, /runtime\s*=\s*["']nodejs["']/);
  assert.match(route, /dynamic\s*=\s*["']force-dynamic["']/);
});

test("absent or deactivated staff session redirects without contacting Factory", async () => {
  let calls = 0;
  const run = handler({ getSession: async () => null, transport: async () => { calls++; return response(); } });
  const result = await run(request());
  assert.equal(result.status, 303);
  assert.equal(result.headers.get("location"), "/admin-panel/login");
  assert.equal(calls, 0);
});

test("operator cannot access any editor request", async () => {
  let calls = 0;
  const run = handler({ getSession: async () => ({ ...owner, role: "OPERATOR" }), transport: async () => { calls++; return response(); } });
  const result = await run(request("/audit", { method: "POST", headers: { origin: "https://palmaauto.ru", "content-type": "application/x-www-form-urlencoded" }, body: "csrf=abc" }));
  assert.equal(result.status, 403);
  assert.equal(calls, 0);
});

test("owner gets the editor without transmitting customer authentication", async () => {
  let sent;
  const result = await handler({ transport: async (value) => { sent = value; return response(); } })(request("/", { headers: { cookie: "admin_panel_session=PRIVATE_ADMIN_TOKEN; factory_editor_session=" + "a".repeat(64), authorization: "Bearer PRIVATE", "x-forwarded-for": "evil" } }));
  assert.equal(result.status, 200);
  assert.equal(await result.text(), "editor");
  assert.equal(sent.path, prefix + "/");
  assert.equal(sent.headers["x-factory-owner"], "a".repeat(64));
  assert.equal(sent.headers["x-factory-user"], "env");
  assert.equal(Object.keys(sent.headers).some((key) => /cookie|authorization|forwarded/i.test(key)), false);
  assert.equal(JSON.stringify(sent).includes("PRIVATE"), false);
  assert.equal(result.headers.get("cache-control"), "no-store");
});

test("POST requires exact public origin and form content type", async () => {
  let calls = 0;
  const run = handler({ transport: async () => { calls++; return response(); } });
  for (const headers of [{ "content-type": "application/x-www-form-urlencoded" }, { origin: "https://evil.test", "content-type": "application/x-www-form-urlencoded" }, { origin: "null", "content-type": "application/x-www-form-urlencoded" }, { origin: "https://palmaauto.ru", "content-type": "application/json" }]) {
    const result = await run(request("/audit", { method: "POST", headers, body: "csrf=abc" }));
    assert.equal(result.status, 403);
  }
  assert.equal(calls, 0);
});

test("valid POST preserves body and forwards only normalized form type", async () => {
  let sent;
  const result = await handler({ transport: async (value) => { sent = value; return response({ status: 303, headers: { location: prefix + "/reports/abc" } }); } })(request("/audit", { method: "POST", headers: { origin: "https://palmaauto.ru", "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }, body: "csrf=abcdef&confirmed=yes" }));
  assert.equal(result.status, 303);
  assert.equal(sent.body.toString(), "csrf=abcdef&confirmed=yes");
  assert.equal(sent.headers["content-type"], "application/x-www-form-urlencoded");
  assert.equal(result.headers.get("location"), prefix + "/reports/abc");
});

test("unsafe paths, query strings and methods fail closed", async () => {
  const run = handler();
  for (const suffix of ["/?next=x", "/%2faudit", "//audit", "/audit?x=1", "/audit%5cpath"]) {
    assert.equal((await run(request(suffix))).status, 400);
  }
  assert.equal((await run(request("/", { method: "DELETE" }))).status, 405);
  assert.equal((await run(new Request("https://palmaauto.ru/not-editor"))).status, 400);
});

test("GET bodies and oversize POST bodies are rejected", async () => {
  const run = handler();
  assert.equal((await run(request("/", { headers: { "content-length": "1" } }))).status, 400);
  assert.equal((await run(request("/audit", { method: "POST", headers: { origin: "https://palmaauto.ru", "content-type": "application/x-www-form-urlencoded" }, body: "x".repeat(65537) }))).status, 413);
  assert.equal((await run(request("/audit", { method: "POST", headers: { origin: "https://palmaauto.ru", "content-type": "application/x-www-form-urlencoded", "content-length": "999999" }, body: "x" }))).status, 413);
});

test("slow request bodies expire and cancel without reaching the gateway", { timeout: 200 }, async () => {
  let cancelled = false;
  let calls = 0;
  const stream = new ReadableStream({ cancel() { cancelled = true; } });
  const run = handler({ bodyTimeoutMs: 10, transport: async () => { calls++; return response(); } });
  const result = await run(request("/audit", { method: "POST", duplex: "half", headers: { origin: "https://palmaauto.ru", "content-type": "application/x-www-form-urlencoded" }, body: stream }));
  assert.equal(result.status, 408);
  assert.equal(calls, 0);
  assert.equal(cancelled, true);
});

test("anonymous and operator traffic cannot consume the OWNER gateway budget", async () => {
  let session = null;
  let calls = 0;
  const run = handler({ getSession: async () => session, transport: async () => { calls++; return response(); } });
  for (let index = 0; index < 120; index++) assert.equal((await run(request())).status, 303);
  session = { ...owner, role: "OPERATOR" };
  for (let index = 0; index < 120; index++) assert.equal((await run(request())).status, 403);
  session = owner;
  assert.equal((await run(request())).status, 200);
  assert.equal(calls, 1);
});

test("authorized requests still have a bounded gateway budget and fresh session checks", async () => {
  let checked = 0;
  let calls = 0;
  const run = handler({ getSession: async () => { checked++; return owner; }, transport: async () => { calls++; return response(); } });
  for (let index = 0; index < 120; index++) assert.equal((await run(request())).status, 200);
  assert.equal((await run(request())).status, 429);
  assert.equal(checked, 121);
  assert.equal(calls, 120);
});

test("malformed or duplicate owner cookies cannot be forwarded", async () => {
  const run = handler();
  for (const cookie of ["factory_editor_session=bad", "factory_editor_session=" + "a".repeat(64) + "; factory_editor_session=" + "b".repeat(64)]) {
    assert.equal((await run(request("/", { headers: { cookie } }))).status, 403);
  }
});

test("signature authenticates method, path, time, nonce, body, owner and staff", () => {
  const signed = signGatewayRequest({ method: "POST", path: prefix + "/audit", body: Buffer.from("csrf=abc"), ownerCookie: "a".repeat(64), staffId: "env", authSecret: secret, now: 1792770000000, nonce: "b".repeat(32) });
  assert.equal(signed.headers["x-factory-time"], "1792770000000");
  assert.equal(signed.headers["x-factory-nonce"], "b".repeat(32));
  assert.equal(signed.headers["x-factory-signature"].length, 86);
  assert.equal(verify(null, Buffer.from(signed.message), createPublicKey(signed.publicKey), Buffer.from(signed.headers["x-factory-signature"], "base64url")), true);
  assert.equal(verify(null, Buffer.from(signed.message.replace("/audit", "/apply")), createPublicKey(signed.publicKey), Buffer.from(signed.headers["x-factory-signature"], "base64url")), false);
  assert.equal(signed.message.endsWith("\nenv"), true);
  assert.equal(signed.message.endsWith("\n"), false);
});

test("weak secret or malformed staff identity cannot create signed request", () => {
  const input = { method: "GET", path: prefix + "/", body: Buffer.alloc(0), ownerCookie: "", staffId: "env", authSecret: secret };
  assert.throws(() => signGatewayRequest({ ...input, authSecret: "" }));
  assert.throws(() => signGatewayRequest({ ...input, staffId: "bad\nowner" }));
});

test("response cookies and redirects remain inside editor namespace", async () => {
  const expected = "factory_editor_session=" + "f".repeat(64) + "; Path=" + prefix + "; HttpOnly; Secure; SameSite=Strict; Max-Age=28800";
  const run = handler({ transport: async () => response({ status: 303, headers: { location: prefix + "/", "set-cookie": expected, "x-leak": "private" } }) });
  const result = await run(request());
  assert.equal(result.headers.get("set-cookie"), expected);
  assert.equal(result.headers.get("x-leak"), null);
  assert.equal((await handler({ transport: async () => response({ status: 303, headers: { location: "https://evil.test/" } }) })(request())).status, 503);
  assert.equal((await handler({ transport: async () => response({ headers: { "set-cookie": "admin_panel_session=oops; Path=/" } }) })(request())).status, 503);
});

test("preview sandbox security headers survive the site proxy", async () => {
  const policy = "default-src 'none'; script-src 'none'; form-action 'none'; sandbox";
  const result = await handler({ transport: async () => response({ headers: { "content-type": "text/html", "content-security-policy": policy, "x-content-type-options": "nosniff" } }) })(request("/preview/mission/run/"));
  assert.equal(result.headers.get("content-security-policy"), policy);
  assert.equal(result.headers.get("x-content-type-options"), "nosniff");
});

test("network/auth failures have no leaked error, credentials or response headers", async () => {
  for (const options of [{ transport: async () => { throw Error("PRIVATE_TOKEN timeout"); } }, { getSession: async () => { throw Error("PRIVATE_DATABASE_URL"); } }, { authSecret: () => undefined }]) {
    const result = await handler(options)(request());
    assert.equal(result.status, 503);
    const text = await result.text();
    assert.match(text, /Редактор временно недоступен/);
    assert.equal(text.includes("PRIVATE"), false);
  }
});

test("transport pins the exact TLS server, CA and request headers", () => {
  const input = signGatewayRequest({ method: "GET", path: prefix + "/", body: Buffer.alloc(0), ownerCookie: "", staffId: "env", authSecret: secret });
  const options = gatewayRequestOptions(input, "PUBLIC_TEST_CA");
  assert.equal(options.hostname, "151.243.225.140");
  assert.equal(options.port, 18443);
  assert.equal(options.ca, "PUBLIC_TEST_CA");
  assert.equal(options.rejectUnauthorized, true);
  assert.equal(options.path, prefix + "/");
});

function fakeTransport(responseFactory) {
  let outgoing;
  return { get outgoing() { return outgoing; }, request(options, callback) {
    outgoing = new EventEmitter();
    outgoing.destroy = (error) => { outgoing.emit("error", error); return outgoing; };
    outgoing.end = (body) => { outgoing.body = body; queueMicrotask(() => responseFactory(callback, outgoing, options)); return outgoing; };
    return outgoing;
  } };
}

test("transport reads bounded response without following a redirect", async () => {
  const input = signGatewayRequest({ method: "GET", path: prefix + "/", body: Buffer.alloc(0), ownerCookie: "", staffId: "env", authSecret: secret });
  const fake = fakeTransport((callback) => { const r = Readable.from([Buffer.from("editor")]); r.statusCode = 303; r.headers = { location: prefix + "/" }; callback(r); });
  const result = await sendGatewayRequest(input, { ca: "CA", request: fake.request, timeoutMs: 100 });
  assert.equal(result.status, 303);
  assert.equal(result.body.toString(), "editor");
});

test("transport aborts oversized responses, network failures and timeouts", async () => {
  const input = signGatewayRequest({ method: "GET", path: prefix + "/", body: Buffer.alloc(0), ownerCookie: "", staffId: "env", authSecret: secret });
  const huge = fakeTransport((callback) => { const r = Readable.from([Buffer.alloc(2097153)]); r.statusCode = 200; r.headers = {}; callback(r); });
  await assert.rejects(sendGatewayRequest(input, { ca: "CA", request: huge.request, timeoutMs: 100 }));
  const failure = fakeTransport((_callback, req) => req.emit("error", Error("private")));
  await assert.rejects(sendGatewayRequest(input, { ca: "CA", request: failure.request, timeoutMs: 100 }));
  const timeout = fakeTransport(() => {});
  await assert.rejects(sendGatewayRequest(input, { ca: "CA", request: timeout.request, timeoutMs: 10 }));
});

test("nav keeps editor entry OWNER-only and uses a full-page same-origin link", async () => {
  const { readFile } = await import("node:fs/promises");
  const nav = await readFile(new URL("../components/admin/AdminPanelNav.tsx", import.meta.url), "utf8");
  assert.equal(FACTORY_EDITOR_PREFIX, prefix);
  assert.match(nav, /isOwner\s*\?\s*\([\s\S]*?<a[\s\S]*?href="\/admin-panel\/ai-editor\/"/);
  assert.match(nav, /ИИ-редактор/);
});
test('bridge allows exact read-only chat history cursor JSON',async()=>{
  const route='/chat/'+chatId+'/history/'+attachmentId;
  const run=handler({transport:async()=>response({headers:{'content-type':'application/json'},body:Buffer.from('{"messages":[]}')})});
  assert.equal((await run(request(route))).status,200);
  assert.equal((await run(request(route+'/extra'))).status,503);
  assert.equal((await run(request(route,post('csrf=x')))).status,503);
});
test('bridge permits preparation JSON only on an exact POST cursor',async()=>{
  const route='/chat/'+chatId+'/prepare/'+attachmentId;
  const run=handler({transport:async()=>response({headers:{'content-type':'application/json'},body:Buffer.from('{}')})});
  assert.equal((await run(request(route,post('csrf=x')))).status,200);
  assert.equal((await run(request(route))).status,503);
  assert.equal((await run(request(route+'/extra',post('csrf=x')))).status,503);
});
