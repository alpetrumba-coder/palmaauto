import { buildVkVideoEmbedSrc, parseVkVideoUrl } from "@/lib/vk-video";

type CarVkVideoEmbedProps = {
  videoUrl: string;
  title: string;
};

const mediaFrameStyle = {
  position: "relative" as const,
  borderRadius: "var(--radius-lg)",
  overflow: "hidden" as const,
  border: "1px solid var(--color-border)",
  boxShadow: "var(--shadow-soft)",
  aspectRatio: "16 / 10",
  maxHeight: "min(70vh, 520px)",
  background: "var(--color-border)",
};

/** Встроенный плеер ВКонтакте (16∶10, как фото в карточке). */
export function CarVkVideoEmbed({ videoUrl, title }: CarVkVideoEmbedProps) {
  const embed = parseVkVideoUrl(videoUrl);
  if (!embed) return null;

  return (
    <div className="car-detail-video" style={mediaFrameStyle}>
      <iframe
        src={buildVkVideoEmbedSrc(embed)}
        title={`Видео: ${title}`}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          border: 0,
        }}
      />
    </div>
  );
}
