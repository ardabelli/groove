import { ScrollArea } from "@/components/ui/scroll-area";
import type { TrackDTO } from "@/lib/types";

export function TrackList({ tracks }: { tracks: TrackDTO[] }) {
  return (
    <ScrollArea className="h-[520px] rounded-xl border bg-card">
      <div className="flex flex-col gap-2 p-3">
        {tracks.map((track) => (
          <iframe
            key={track.id}
            title={`${track.name} by ${track.artistNames}`}
            src={`https://open.spotify.com/embed/track/${track.id}`}
            width="100%"
            height={80}
            loading="lazy"
            style={{ borderRadius: 12, border: "none" }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        ))}
      </div>
    </ScrollArea>
  );
}
