"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SpotifyIcon } from "@/components/spotify-icon";
import { BACKEND_URL } from "@/lib/backend";
import type { PlaylistSummaryDTO, ShareResult } from "@/lib/types";

async function unsharePlaylist(id: string): Promise<ShareResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/playlist/${id}/unshare`, {
      method: "POST",
      credentials: "include",
    });
    return (await res.json()) as ShareResult;
  } catch {
    return { ok: false, error: "unknown" };
  }
}

function PlaylistRow({
  playlist,
  onUnshared,
}: {
  playlist: PlaylistSummaryDTO;
  onUnshared: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleUnshare() {
    startTransition(async () => {
      const result = await unsharePlaylist(playlist.id);
      if (result.ok) {
        onUnshared(playlist.id);
        toast.success("Removed from the Groove social feed");
      } else {
        toast.error("Couldn't remove this playlist from social. Please try again.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-base font-semibold tracking-tight">{playlist.title}</h3>
          <Badge variant={playlist.isShared ? "default" : "outline"} className="shrink-0">
            {playlist.isShared ? "Shared" : "Private"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{playlist.description}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-primary/25 bg-primary/15 text-primary">
            {playlist.moodParameters.energy} energy
          </Badge>
          {playlist.moodParameters.descriptors.slice(0, 3).map((descriptor) => (
            <Badge key={descriptor} variant="outline">
              {descriptor}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {playlist.trackCount} track{playlist.trackCount === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            {playlist.isShared && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUnshare}
                disabled={isPending}
                className="text-muted-foreground"
              >
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                Remove from social
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              className="rounded-full"
              render={<a href={playlist.spotifyUrl} target="_blank" rel="noopener noreferrer" />}
            >
              <SpotifyIcon size={12} />
              Open in Spotify
              <ArrowUpRight className="size-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MyPlaylists({ playlists }: { playlists: PlaylistSummaryDTO[] }) {
  const [items, setItems] = useState(playlists);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You haven&apos;t curated any playlists yet — describe a vibe on the home page to get started.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((playlist) => (
        <PlaylistRow
          key={playlist.id}
          playlist={playlist}
          onUnshared={(id) =>
            setItems((prev) => prev.map((p) => (p.id === id ? { ...p, isShared: false } : p)))
          }
        />
      ))}
    </div>
  );
}
