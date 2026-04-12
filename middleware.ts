import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * /account — любой авторизованный пользователь.
 * JWT через getToken — без импорта Prisma в Edge.
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (!path.startsWith("/account")) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const token = await getToken({ req, secret });

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*"],
};
