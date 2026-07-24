"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifyIcon } from "@/components/spotify-icon";
import { BACKEND_URL } from "@/lib/backend";
import type { CreatePlaylistResult, MoodParameters, TrackDTO } from "@/lib/types";

async function createGroovePlaylist(body: {
  playlistTitle: string;
  playlistDescription: string;
  curatorNote: string;
  moodParameters: MoodParameters;
  tracks: TrackDTO[];
}): Promise<CreatePlaylistResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/playlist`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as CreatePlaylistResult;
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export function PlaylistCta({
  playlistTitle,
  playlistDescription,
  curatorNote,
  moodParameters,
  tracks,
}: {
  playlistTitle: string;
  playlistDescription: string;
  curatorNote: string;
  moodParameters: MoodParameters;
  tracks: TrackDTO[];
}) {
  const [isPending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ id: string | null; playlistName: string; externalUrl: string } | null>(
    null
  );

  function handleCreate() {
    startTransition(async () => {
      const result = await createGroovePlaylist({
        playlistTitle,
        playlistDescription,
        curatorNote,
        moodParameters,
        tracks,
      });
      if (result.ok) {
        setCreated(result.data);
        toast.success(`Created "${result.data.playlistName}" in Spotify and shared it to Groove`);
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
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          nativeButton={false}
          className="rounded-full hover:bg-[#1ed760]"
          render={<a href={created.externalUrl} target="_blank" rel="noopener noreferrer" />}
        >
          <SpotifyIcon size={14} />
          Open in Spotify
          <ArrowUpRight className="size-3.5" />
        </Button>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <div className="flex size-4 items-center justify-center rounded-full bg-primary/15">
            <Check className="size-2.5 text-primary" />
          </div>
          Created &amp; shared &quot;{created.playlistName}&quot; to Groove
        </div>
      </div>
    );
  }

  return (
    <Button
      size="lg"
      onClick={handleCreate}
      disabled={isPending}
      className="rounded-full hover:bg-[#1ed760]"
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Creating playlist…
        </>
      ) : (
        <>
          <SpotifyIcon size={14} />
          Create in Spotify
        </>
      )}
    </Button>
  );
}
