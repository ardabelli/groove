"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BACKEND_URL } from "@/lib/backend";
import type { CreatePlaylistResult } from "@/lib/types";

async function createGroovePlaylist(
  playlistTitle: string,
  playlistDescription: string,
  trackUris: string[]
): Promise<CreatePlaylistResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/playlist`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistTitle, playlistDescription, trackUris }),
    });
    return (await res.json()) as CreatePlaylistResult;
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export function PlaylistCta({
  playlistTitle,
  playlistDescription,
  trackUris,
}: {
  playlistTitle: string;
  playlistDescription: string;
  trackUris: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ playlistName: string; externalUrl: string } | null>(null);

  function handleCreate() {
    startTransition(async () => {
      const result = await createGroovePlaylist(playlistTitle, playlistDescription, trackUris);
      if (result.ok) {
        setCreated(result.data);
        toast.success(`Created "${result.data.playlistName}" in Spotify`);
      } else if (result.error === "spotify_rate_limited") {
        toast.error(`Spotify is rate limiting us — try again in ${result.retryAfterSeconds ?? "a few"}s`);
      } else if (result.error === "unauthenticated") {
        toast.error("Your session expired — please sign in again.");
      } else {
        toast.error("Couldn't create the playlist. Please try again.");
      }
    });
  }

  if (created) {
    return (
      <Button
        size="lg"
        nativeButton={false}
        render={<a href={created.externalUrl} target="_blank" rel="noopener noreferrer" />}
      >
        Open in Spotify
      </Button>
    );
  }

  return (
    <Button size="lg" onClick={handleCreate} disabled={isPending}>
      {isPending ? "Creating playlist…" : "Create in Spotify"}
    </Button>
  );
}
