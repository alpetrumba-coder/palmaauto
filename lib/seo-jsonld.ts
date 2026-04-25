export function jsonLdScriptTag(json: unknown): string {
  return JSON.stringify(json).replace(/</g, "\\u003c");
}

export function buildOrganizationJsonLd(input: { url: string; name: string; email?: string; phone?: string; logoUrl?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: input.url,
    ...(input.logoUrl ? { logo: input.logoUrl } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.phone ? { telephone: input.phone } : {}),
  };
}

export function buildWebSiteJsonLd(input: { url: string; name: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: input.url,
    name: input.name,
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function buildProductJsonLd(input: {
  url: string;
  name: string;
  description?: string;
  image?: string[];
  pricePerDayRub?: number;
  availability?: "https://schema.org/InStock" | "https://schema.org/OutOfStock";
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image?.length ? { image: input.image } : {}),
    ...(typeof input.pricePerDayRub === "number"
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "RUB",
            price: input.pricePerDayRub,
            availability: input.availability ?? "https://schema.org/InStock",
            url: input.url,
          },
        }
      : {}),
  };
}

export function buildFaqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answer },
    })),
  };
}

