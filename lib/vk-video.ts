/** Параметры для iframe vk.com/video_ext.php */
export type VkVideoEmbed = {
  oid: string;
  id: string;
};

/**
 * Разбирает ссылку на видео ВК (vk.com, vk.ru, vkvideo.ru) или готовый embed-URL.
 * Примеры: https://vk.com/video-123_456, https://vkvideo.ru/video-123_456
 */
export function parseVkVideoUrl(raw: string): VkVideoEmbed | null {
  const input = raw.trim();
  if (!input) return null;

  try {
    const url = input.startsWith("http") ? new URL(input) : new URL(`https://${input}`);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "vk.com" || host === "vk.ru" || host === "m.vk.com" || host === "m.vk.ru") {
      if (url.pathname.includes("video_ext.php")) {
        const oid = url.searchParams.get("oid");
        const id = url.searchParams.get("id");
        if (oid && id) return { oid, id };
      }

      const match = url.pathname.match(/video(-?\d+)_(\d+)/i);
      if (match) return { oid: match[1], id: match[2] };
    }

    if (host === "vkvideo.ru" || host === "m.vkvideo.ru") {
      const match = url.pathname.match(/video(-?\d+)_(\d+)/i);
      if (match) return { oid: match[1], id: match[2] };
    }
  } catch {
    return null;
  }

  return null;
}

export function buildVkVideoEmbedSrc(embed: VkVideoEmbed): string {
  const params = new URLSearchParams({ oid: embed.oid, id: embed.id, hd: "2" });
  return `https://vk.com/video_ext.php?${params.toString()}`;
}

export function isValidVkVideoUrl(raw: string): boolean {
  return parseVkVideoUrl(raw) !== null;
}
