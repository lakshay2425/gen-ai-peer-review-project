import type { YoutubeCitation } from "@/features/citations/types";

type YoutubeCitationViewerProps = {
  citation: YoutubeCitation;
};

export default function YoutubeCitationViewer({
  citation,
}: YoutubeCitationViewerProps) {
  const { videoId, startTime } = citation;
  const src = `https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=1`;

  return (
    <div className="flex flex-col gap-3 h-full">
      <p className="text-xs text-gray-500">
        Playing from {Math.floor(startTime / 60)}:
        {String(startTime % 60).padStart(2, "0")}
      </p>
      <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-gray-100 bg-black">
        <iframe
          src={src}
          title="YouTube citation"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
