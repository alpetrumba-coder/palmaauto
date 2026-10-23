import { createHash, createPrivateKey, createPublicKey, hkdfSync, randomBytes, sign } from "node:crypto";
import { request as httpsRequest, type RequestOptions } from "node:https";
import type { ClientRequest, IncomingMessage } from "node:http";

export const FACTORY_EDITOR_PREFIX = "/admin-panel/ai-editor";
const SITE_ORIGIN = "https://palmaauto.ru";
const COOKIE_NAME = "factory_editor_session";
const MAX_REQUEST = 65536;
const MAX_RESPONSE = 2097152;
const MAX_UPLOAD_REQUEST = 16 * 1024 * 1024;
const MAX_ATTACHMENT_RESPONSE = 10 * 1024 * 1024;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const CHAT = FACTORY_EDITOR_PREFIX + '/chat/';
const uploadRequest = (method: string, path: string) => method === 'POST' && new RegExp('^' + CHAT + UUID + '/attachments$').test(path);
const attachmentRequest = (method: string, path: string) => method === 'GET' && new RegExp('^' + CHAT + UUID + '/attachments/' + UUID + '$').test(path);
const responseLimit = (method: string, path: string) => attachmentRequest(method, path) ? MAX_ATTACHMENT_RESPONSE : MAX_RESPONSE;
function requestLimit(method: string, path: string): number {
  if (uploadRequest(method, path)) return MAX_UPLOAD_REQUEST;
  return method === 'POST' && new RegExp('^' + CHAT + UUID + '/messages$').test(path) ? 256 * 1024 : MAX_REQUEST;
}
function chatJsonRequest(method: string, path: string): boolean {
  return method === 'GET' ? new RegExp('^' + CHAT + UUID + '/(?:state|history/' + UUID + ')$').test(path)
    : method === 'POST' && (path === CHAT + 'new' || new RegExp('^' + CHAT + UUID + '/(?:messages|attachments|prepare/' + UUID + ')$').test(path));
}
const HEX_SESSION = /^[a-f0-9]{64}$/;
const FORM_TYPE = /^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i;
const SECURITY = { "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };
const OWNER_CSP = "default-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
type Session = Readonly<{ role: string; staffId: string }>;
type RawHeaders = Readonly<Record<string, string | string[] | undefined>>;
type GatewayResponse = Readonly<{ status: number; headers: RawHeaders; body: Buffer }>;
type SigningInput = Readonly<{
  method: "GET" | "POST"; path: string; body: Buffer; ownerCookie: string; staffId: string;
  authSecret: string; now?: number; nonce?: string;
}>;
export type GatewayRequest = Readonly<{
  method: "GET" | "POST"; path: string; body: Buffer; headers: Readonly<Record<string, string>>;
  message: string; publicKey: string;
}>;
type RequestFactory = (options: RequestOptions, callback: (response: IncomingMessage) => void) => ClientRequest;
type TransportOptions = Readonly<{ ca?: string; request?: RequestFactory; timeoutMs?: number }>;
type HandlerOptions = Readonly<{
  getSession: () => Promise<Session | null>; authSecret?: () => string | undefined;
  transport?: (request: GatewayRequest) => Promise<GatewayResponse>;
  bodyTimeoutMs?: number;
}>;
class BridgeFailure extends Error {
  readonly status: number;
  constructor(status: number) { super("Factory editor request rejected"); this.status = status; }
}
function fail(status: number): never { throw new BridgeFailure(status); }

function canonicalPath(path: string): boolean {
  return path.length <= 2048 && path.startsWith(FACTORY_EDITOR_PREFIX)
    && /^\/admin-panel\/ai-editor(?:\/[A-Za-z0-9_.-]+)*\/?$/.test(path)
    && !path.split("/").some((part) => part === "." || part === "..");
}
function requestPath(request: Request): string {
  const url = new URL(request.url);
  if (url.search || url.hash || !canonicalPath(url.pathname)) fail(400);
  return url.pathname;
}
function ownerCookie(request: Request): string {
  const raw = request.headers.get("cookie") ?? "";
  if (raw.length > 16384) fail(403);
  const values = raw.split(";").map((part) => part.trim()).filter((part) => part.startsWith(COOKIE_NAME + "="));
  if (values.length > 1) fail(403);
  const value = values[0]?.slice(COOKIE_NAME.length + 1) ?? "";
  if (values.length && !HEX_SESSION.test(value)) fail(403);
  return value;
}
function requestLength(request: Request): number | undefined {
  const raw = request.headers.get("content-length");
  if (raw === null) return undefined;
  if (!/^\d{1,10}$/.test(raw)) fail(400);
  return Number(raw);
}
async function readBody(reader: ReadableStreamDefaultReader<Uint8Array>, limit: number, length?: number): Promise<Buffer> {
  let size = 0; let chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > limit) fail(413);
    chunks = [...chunks, part.value];
  }
  if (length !== undefined && length !== size) fail(400);
  return Buffer.concat(chunks);
}
async function bodyBytes(request: Request, path: string, timeoutMs: number): Promise<Buffer> {
  const length = requestLength(request);
  if (request.method === "GET") {
    if ((length !== undefined && length !== 0) || request.body) fail(400);
    return Buffer.alloc(0);
  }
  if (request.headers.get("origin") !== SITE_ORIGIN || !FORM_TYPE.test(request.headers.get("content-type") ?? "")) fail(403);
  const limit = requestLimit(request.method, path);
  if (length !== undefined && length > limit) fail(413);
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new BridgeFailure(408)), timeoutMs); });
    return await Promise.race([readBody(reader, limit, length), deadline]);
  } finally { clearTimeout(timer); void reader.cancel().catch(() => {}); }
}

/** Domain-separated signing key. AUTH_SECRET never crosses the site boundary. */
export function signGatewayRequest(input: SigningInput): GatewayRequest {
  if (input.authSecret.length < 16 || input.authSecret.length > 4096
    || !/^[A-Za-z0-9_-]{1,128}$/.test(input.staffId) || !canonicalPath(input.path)
    || (input.ownerCookie !== "" && !HEX_SESSION.test(input.ownerCookie))
    || !["GET", "POST"].includes(input.method) || input.body.length > requestLimit(input.method, input.path)) fail(403);
  const time = String(input.now ?? Date.now());
  const nonce = input.nonce ?? randomBytes(24).toString("base64url");
  if (!/^\d{13}$/.test(time) || !/^[A-Za-z0-9_-]{32}$/.test(nonce)) fail(403);
  const seed = Buffer.from(hkdfSync("sha256", input.authSecret, "palmaauto.ru", "owner-gateway-signing", 32));
  const key = createPrivateKey({ key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]), format: "der", type: "pkcs8" });
  const digest = createHash("sha256").update(input.body).digest("hex");
  const message = ["FACTORY-ADMIN/1", input.method, input.path, time, nonce, digest, input.ownerCookie, input.staffId].join("\n");
  const signature = sign(null, Buffer.from(message), key).toString("base64url");
  const headers = { "x-factory-time": time, "x-factory-nonce": nonce, "x-factory-owner": input.ownerCookie,
    "x-factory-user": input.staffId, "x-factory-signature": signature,
    ...(input.method === "POST" ? { "content-type": "application/x-www-form-urlencoded" } : {}) };
  return Object.freeze({ method: input.method, path: input.path, body: input.body, headers: Object.freeze(headers), message,
    publicKey: createPublicKey(key).export({ type: "spki", format: "pem" }).toString() });
}

export function gatewayRequestOptions(input: GatewayRequest, ca: string): RequestOptions {
  return { hostname: "151.243.225.140", port: 18443, method: input.method, path: input.path,
    ca, rejectUnauthorized: true, agent: false, maxHeaderSize: 16384,
    headers: { ...input.headers, accept: "*/*", "content-length": String(input.body.length) } };
}
function readResponse(response: IncomingMessage, limit: number): Promise<GatewayResponse> {
  return new Promise((resolve, reject) => {
    let size = 0; let chunks: Buffer[] = [];
    response.on("data", (value: Buffer) => {
      size += value.length;
      if (size > limit) { response.destroy(); reject(new Error("Factory response unavailable")); return; }
      chunks = [...chunks, value];
    });
    response.once("end", () => resolve({ status: response.statusCode ?? 503, headers: response.headers, body: Buffer.concat(chunks) }));
    response.once("error", reject);
    response.once("aborted", () => reject(new Error("Factory response unavailable")));
  });
}
/** Fixed TLS destination, exact public CA, one request and no redirect/retry. */
export async function sendGatewayRequest(input: GatewayRequest, options: TransportOptions = {}): Promise<GatewayResponse> {
  const ca = options.ca ?? (await import("./factory-admin-ca")).FACTORY_ADMIN_CA;
  const request = options.request ?? httpsRequest;
  const timeout = options.timeoutMs ?? (input.path.startsWith(FACTORY_EDITOR_PREFIX + "/preview/") ? 95000 : 45000);
  return new Promise((resolve, reject) => {
    const done = (error?: unknown, result?: GatewayResponse) => {
      clearTimeout(timer);
      if (error) reject(new Error("Factory connection unavailable")); else resolve(result!);
    };
    const outgoing = request(gatewayRequestOptions(input, ca), (response) => {
      void readResponse(response, responseLimit(input.method, input.path)).then((result) => done(undefined, result), done);
    });
    outgoing.once("error", done);
    const timer = setTimeout(() => outgoing.destroy(new Error("Factory deadline exceeded")), timeout);
    outgoing.end(input.body);
  });
}

function singleHeader(headers: RawHeaders, key: string): string | undefined {
  const value = headers[key];
  if (value === undefined) return undefined;
  if (Array.isArray(value)) { if (value.length !== 1) fail(503); return value[0]; }
  return value;
}
function responseHeaders(response: GatewayResponse, preview: boolean, method: string, path: string): Headers {
  const result = new Headers(SECURITY);
  const download = attachmentRequest(method, path);
  const permissions = `microphone=${preview || download ? '()' : '(self)'}, camera=(), geolocation=()`;
  const suppliedPermissions = singleHeader(response.headers, 'permissions-policy');
  if (suppliedPermissions !== undefined && suppliedPermissions !== permissions) fail(503);
  result.set('permissions-policy', permissions);
  for (const key of ["content-type", "content-security-policy"]) {
    const value = singleHeader(response.headers, key);
    if (value !== undefined) {
      if (value.length > 4096 || /[\r\n\0]/.test(value)) fail(503);
      result.set(key, value);
    }
  }
  const policy = result.get("content-security-policy") ?? OWNER_CSP;
  if (preview && (!/(?:^|;)\s*sandbox\s*(?:;|$)/.test(policy)
    || !policy.includes("script-src 'none'") || !policy.includes("form-action 'none'") || policy.includes("allow-same-origin"))) fail(503);
  result.set("content-security-policy", policy);
  const type = (result.get('content-type') ?? '').toLowerCase();
  if (download && response.status === 200) {
    const disposition = singleHeader(response.headers, 'content-disposition');
    if (type !== 'application/octet-stream' || !disposition || disposition.length > 2048
      || !/^attachment; filename="[A-Za-z0-9._ -]{1,180}"(?:; filename\*=UTF-8''(?:[A-Za-z0-9!#$&+.^_`|~-]|%[0-9A-Fa-f]{2}){1,1800})?$/.test(disposition)) fail(503);
    result.set('content-disposition', disposition);
    result.set('content-security-policy', "default-src 'none'; script-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'; sandbox");
  } else {
    if (/^(?:application|text)\/(?:javascript|ecmascript)(?:;|$)/.test(type)
      && !(method === 'GET' && path === FACTORY_EDITOR_PREFIX + '/chat-client.js' && /^(?:application\/javascript)(?:; charset=utf-8)?$/.test(type))) fail(503);
    if (/^application\/json(?:;|$)/.test(type) && !chatJsonRequest(method, path)) fail(503);
    if (/^text\/css(?:;|$)/.test(type) && !preview
      && !(method === 'GET' && [FACTORY_EDITOR_PREFIX + '/style.css', FACTORY_EDITOR_PREFIX + '/chat-style.css'].includes(path))) fail(503);
  }
  const location = singleHeader(response.headers, "location");
  if (location !== undefined) { if (!canonicalPath(location)) fail(503); result.set("location", location); }
  const cookie = singleHeader(response.headers, "set-cookie");
  if (cookie !== undefined) {
    const pattern = /^factory_editor_session=(?:[a-f0-9]{64})?; Path=\/admin-panel\/ai-editor; HttpOnly; Secure; SameSite=Strict; Max-Age=(?:0|28800)$/;
    if (!pattern.test(cookie)) fail(503);
    result.set("set-cookie", cookie);
  }
  return result;
}
function errorResponse(status: number): Response {
  const title = status === 403 ? "Доступ только для владельца" : status === 503 ? "Редактор временно недоступен" : "Не удалось выполнить запрос";
  const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui,sans-serif;margin:2rem;color:#20252b"><h1>${title}</h1><p>Вернитесь в админ-панель и откройте редактор ещё раз.</p><a href="/admin-panel">В админ-панель</a></body></html>`;
  return new Response(html, { status, headers: { ...SECURITY, "content-type": "text/html; charset=utf-8", "content-security-policy": OWNER_CSP } });
}

/** Every request rechecks the site's active OWNER session before signing. */
export function createFactoryAdminHandler(options: HandlerOptions): (request: Request) => Promise<Response> {
  let rateStarted = Date.now(); let rateCount = 0;
  return async (request) => {
    try {
      if (request.method !== "GET" && request.method !== "POST") return errorResponse(405);
      const session = await options.getSession();
      if (!session) return new Response(null, { status: 303, headers: { ...SECURITY, location: "/admin-panel/login" } });
      if (session.role !== "OWNER") return errorResponse(403);
      if (Date.now() - rateStarted >= 60000) { rateStarted = Date.now(); rateCount = 0; }
      if (++rateCount > 120) return errorResponse(429);
      const path = requestPath(request);
      const body = await bodyBytes(request, path, options.bodyTimeoutMs ?? (uploadRequest(request.method, path) ? 30000 : 5000));
      const authSecret = (options.authSecret ?? (() => process.env.AUTH_SECRET))();
      if (!authSecret) return errorResponse(503);
      const signed = signGatewayRequest({ method: request.method, path, body, ownerCookie: ownerCookie(request), staffId: session.staffId, authSecret });
      const response = await (options.transport ?? sendGatewayRequest)(signed);
      if (![200, 202, 303, 400, 401, 403, 404, 408, 409, 413, 415, 429, 500, 503].includes(response.status)
        || !Buffer.isBuffer(response.body) || response.body.length > responseLimit(request.method, path)) fail(503);
      return new Response(new Uint8Array(response.body), { status: response.status,
        headers: responseHeaders(response, path.startsWith(FACTORY_EDITOR_PREFIX + "/preview/"), request.method, path) });
    } catch (error) { return errorResponse(error instanceof BridgeFailure ? error.status : 503); }
  };
}
