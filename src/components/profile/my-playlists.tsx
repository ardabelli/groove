"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SpotifyIcon } from "@/components/spotify-icon";
import { BACKEND_URL } from "@/lib/backend";
import type { PlaylistSummaryDTO, ShareResult } from "@/lib/types";

async function setPlaylistShared(id: string, shared: boolean): Promise<ShareResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/playlist/${id}/${shared ? "share" : "unshare"}`, {
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
  onSharedChange,
}: {
  playlist: PlaylistSummaryDTO;
  onSharedChange: (id: string, isShared: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggleShared() {
    const nextShared = !playlist.isShared;
    startTransition(async () => {
      const result = await setPlaylistShared(playlist.id, nextShared);
      if (result.ok) {
        onSharedChange(playlist.id, nextShared);
        toast.success(nextShared ? "Shared to the Groove social feed" : "Removed from the Groove social feed");
      } else {
        toast.error("Couldn't update sharing for this playlist. Please try again.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-base font-semibold tracking-tight">{playlist.title}</h3>
          <Badge
            variant={playlist.isShared ? "default" : "outline"}
            className="shrink-0 cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
            render={
              <button
                type="button"
                onClick={handleToggleShared}
                disabled={isPending}
                aria-label={playlist.isShared ? "Stop sharing this playlist" : "Share this playlist"}
              />
            }
          >
            {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
            {playlist.isShared ? "Shared" : "Not shared"}
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
          onSharedChange={(id, isShared) =>
            setItems((prev) => prev.map((p) => (p.id === id ? { ...p, isShared } : p)))
          }
        />
      ))}
    </div>
  );
}
