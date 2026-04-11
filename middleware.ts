import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Защита /staff: только STAFF и ADMIN.
 * JWT через getToken — без импорта Prisma в Edge.
 */
export async function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith("/staff")) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const token = await getToken({ req, secret });
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const role = token.role as string | undefined;
  if (role !== "STAFF" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/staff/:path*"],
};
