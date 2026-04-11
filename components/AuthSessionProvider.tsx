"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

/** Обёртка для useSession в клиентских компонентах (шапка, формы входа). */
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
