import type { CSSProperties } from "react";
import type { PlaylistSummaryDTO } from "@/lib/types";

const MAX_TAGS = 12;
const MIN_SIZE = 56;
const MAX_SIZE = 148;

const BUBBLE_COLORS = [
  "bg-[var(--chart-1)]/20 text-[var(--chart-1)] border-[var(--chart-1)]/30",
  "bg-[var(--chart-2)]/20 text-[var(--chart-2)] border-[var(--chart-2)]/30",
  "bg-[var(--chart-3)]/20 text-[var(--chart-3)] border-[var(--chart-3)]/30",
  "bg-[var(--chart-4)]/20 text-[var(--chart-4)] border-[var(--chart-4)]/30",
  "bg-[var(--chart-5)]/20 text-[var(--chart-5)] border-[var(--chart-5)]/30",
];

interface TagStat {
  label: string;
  count: number;
}

function aggregateTags(playlists: PlaylistSummaryDTO[]): TagStat[] {
  const counts = new Map<string, TagStat>();
  for (const playlist of playlists) {
    for (const descriptor of playlist.moodParameters.descriptors) {
      const key = descriptor.trim().toLowerCase();
      if (!key) continue;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label: descriptor.trim(), count: 1 });
      }
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_TAGS);
}

export function TagCloud({ playlists }: { playlists: PlaylistSummaryDTO[] }) {
  const tags = aggregateTags(playlists);

  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Curate a few playlists and your most-used vibes will show up here.
      </p>
    );
  }

  const maxCount = tags[0].count;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-6">
      {tags.map((tag, index) => {
        const ratio = Math.sqrt(tag.count / maxCount);
        const size = Math.round(MIN_SIZE + (MAX_SIZE - MIN_SIZE) * ratio);
        const duration = 4 + (size / MAX_SIZE) * 3.5;
        const delay = (index * 0.37) % 4;
        const drift = 6 + (index % 4) * 3;
        const fontSize = 11 + Math.round(ratio * 8);

        return (
          <div
            key={tag.label}
            title={`${tag.label} · ${tag.count} playlist${tag.count === 1 ? "" : "s"}`}
            className={`flex shrink-0 items-center justify-center rounded-full border text-center leading-tight font-medium ${BUBBLE_COLORS[index % BUBBLE_COLORS.length]}`}
            style={
              {
                width: size,
                height: size,
                fontSize,
                animation: `tag-bubble-float ${duration}s ease-in-out ${delay}s infinite`,
                "--bubble-drift": `-${drift}px`,
              } as CSSProperties
            }
          >
            <span className="px-2">{tag.label}</span>
          </div>
        );
      })}
    </div>
  );
}
