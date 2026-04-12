import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/** Пути, где нужна сессия (список броней). */
const PROTECTED_PREFIXES = ["/moi-broni", "/account"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * JWT в middleware: на HTTPS нужен secureCookie, иначе не читается `__Secure-authjs.session-token`
 * и пользователя ошибочно отправляет на /login.
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (!isProtectedPath(path)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const isHttps =
    req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";

  const token = await getToken({
    req,
    secret,
    secureCookie: isHttps,
  });

  if (!token) {
    const url = new URL("/login", req.url);
    const callback = path.startsWith("/account") ? "/moi-broni" : path;
    url.searchParams.set("callbackUrl", callback);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/moi-broni", "/moi-broni/:path*", "/account", "/account/:path*"],
};
