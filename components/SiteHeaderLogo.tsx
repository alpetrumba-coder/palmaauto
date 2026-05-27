"use client";

import { usePathname } from "next/navigation";

import { PalmaAutoLogo } from "@/components/PalmaAutoLogo";

/** Логотип в шапке: на главной без SVG, на остальных страницах — полный. */
export function SiteHeaderLogo() {
  const pathname = usePathname();
  return <PalmaAutoLogo showImage={pathname !== "/"} />;
}
