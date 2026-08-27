"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { SpotifyIcon } from "@/components/spotify-icon";
import { LikeButton } from "@/components/social/like-button";
import { BACKEND_URL } from "@/lib/backend";
import type { PlaylistSummaryDTO, ShareResult } from "@/lib/types";

async function adminRemoveFromFeed(id: string): Promise<ShareResult> {
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

export function PlaylistCard({
  playlist,
  isAuthenticated,
  isAdmin = false,
  onRemoved,
}: {
  playlist: PlaylistSummaryDTO;
  isAuthenticated: boolean;
  isAdmin?: boolean;
  onRemoved?: (id: string) => void;
}) {
  const [isRemoving, startRemoving] = useTransition();
  const [removed, setRemoved] = useState(false);

  function handleRemove() {
    if (!window.confirm(`Remove "${playlist.title}" from the social feed?`)) return;
    startRemoving(async () => {
      const result = await adminRemoveFromFeed(playlist.id);
      if (result.ok) {
        setRemoved(true);
        onRemoved?.(playlist.id);
        toast.success("Removed from the social feed");
      } else {
        toast.error("Couldn't remove this playlist. Please try again.");
      }
    });
  }

  if (removed) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarImage src={playlist.owner.imageUrl ?? undefined} alt={playlist.owner.displayName ?? "User"} />
              <AvatarFallback>{playlist.owner.displayName?.[0] ?? "U"}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">{playlist.owner.displayName ?? "A Groove user"}</span>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              disabled={isRemoving}
              title="Remove from social feed (admin)"
              className="text-destructive hover:text-destructive"
            >
              {isRemoving ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            </Button>
          )}
        </div>
        <h3 className="font-heading text-lg font-semibold tracking-tight">{playlist.title}</h3>
        <p className="text-sm text-muted-foreground">{playlist.description}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground italic">&quot;{playlist.curatorNote}&quot;</p>
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
        <div className="flex items-center gap-2">
          <div className="flex -space-x-3">
            {playlist.trackPreview.map((track) =>
              track.albumImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={track.id}
                  src={track.albumImageUrl}
                  alt={track.name}
                  className="size-10 rounded-md ring-2 ring-card object-cover"
                />
              ) : null
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {playlist.trackCount} track{playlist.trackCount === 1 ? "" : "s"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <LikeButton
          playlistId={playlist.id}
          initialLiked={playlist.likedByViewer}
          initialCount={playlist.likeCount}
          isAuthenticated={isAuthenticated}
        />
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
      </CardFooter>
    </Card>
  );
}
