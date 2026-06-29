/** Параметры для iframe vk.com/video_ext.php */
export type VkVideoEmbed = {
  oid: string;
  id: string;
  hash?: string;
};

const VIDEO_CLIP_ID_RE = /(?:video|clip)(-?\d+)_(\d+)/i;

function parseVideoClipId(text: string): VkVideoEmbed | null {
  const match = text.match(VIDEO_CLIP_ID_RE);
  if (!match) return null;
  return { oid: match[1], id: match[2] };
}

/**
 * Разбирает ссылку на видео или клип ВК (vk.com, vk.ru, vkvideo.ru) или готовый embed-URL.
 * Примеры:
 * - https://vk.com/video-123_456
 * - https://vk.com/clip-230053175_456239212
 * - https://vk.com/clips-74006511?z=clip-74006511_456247211
 */
export function parseVkVideoUrl(raw: string): VkVideoEmbed | null {
  const input = raw.trim();
  if (!input) return null;

  try {
    const url = input.startsWith("http") ? new URL(input) : new URL(`https://${input}`);
    const host = url.hostname.replace(/^www\./, "");
    const hash = url.searchParams.get("hash") ?? undefined;

    const withHash = (embed: VkVideoEmbed): VkVideoEmbed => (hash ? { ...embed, hash } : embed);

    if (host === "vk.com" || host === "vk.ru" || host === "m.vk.com" || host === "m.vk.ru") {
      if (url.pathname.includes("video_ext.php")) {
        const oid = url.searchParams.get("oid");
        const id = url.searchParams.get("id");
        const embedHash = url.searchParams.get("hash") ?? hash;
        if (oid && id) {
          return embedHash ? { oid, id, hash: embedHash } : { oid, id };
        }
      }

      const fromPath = parseVideoClipId(url.pathname);
      if (fromPath) return withHash(fromPath);

      const z = url.searchParams.get("z");
      if (z) {
        const fromZ = parseVideoClipId(z);
        if (fromZ) return withHash(fromZ);
      }
    }

    if (host === "vkvideo.ru" || host === "m.vkvideo.ru") {
      const fromPath = parseVideoClipId(url.pathname);
      if (fromPath) return withHash(fromPath);

      const z = url.searchParams.get("z");
      if (z) {
        const fromZ = parseVideoClipId(z);
        if (fromZ) return withHash(fromZ);
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function buildVkVideoEmbedSrc(embed: VkVideoEmbed): string {
  const params = new URLSearchParams({ oid: embed.oid, id: embed.id, hd: "2" });
  if (embed.hash) params.set("hash", embed.hash);
  return `https://vk.com/video_ext.php?${params.toString()}`;
}

export function isValidVkVideoUrl(raw: string): boolean {
  return parseVkVideoUrl(raw) !== null;
}
