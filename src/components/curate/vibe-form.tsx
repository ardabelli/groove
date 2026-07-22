"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CuratorNoteCard } from "@/components/curate/curator-note-card";
import { TrackList } from "@/components/curate/track-list";
import { PlaylistCta } from "@/components/curate/playlist-cta";
import { BACKEND_URL, fetchMe } from "@/lib/backend";
import type { CurateResult } from "@/lib/types";

const ERROR_MESSAGES: Record<string, string> = {
  unauthenticated: "Your session expired — please sign in again.",
  agent_failed: "The curator agent couldn't come up with a set. Try rephrasing the vibe.",
  no_tracks_found: "Couldn't find matching tracks on Spotify. Try a broader vibe.",
  spotify_rate_limited: "Spotify is rate limiting us right now — try again shortly.",
  unknown: "Something went wrong. Please try again.",
};

export function VibeForm({ initialVibe }: { initialVibe?: string }) {
  const [vibe, setVibe] = useState(initialVibe ?? "");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetchMe().then((me) => setIsAuthenticated(me.authenticated));
  }, []);

  async function submitVibe(
    _prevState: CurateResult | undefined,
    formData: FormData
  ): Promise<CurateResult | undefined> {
    const submittedVibe = formData.get("vibe")?.toString() ?? "";

    if (!isAuthenticated) {
      window.location.href = `${BACKEND_URL}/api/auth/login?vibe=${encodeURIComponent(submittedVibe)}`;
      return undefined;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/curate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe: submittedVibe }),
      });
      return (await res.json()) as CurateResult;
    } catch {
      return { ok: false, error: "unknown" };
    }
  }

  const [state, formAction, isPending] = useActionState(submitVibe, undefined);

  useEffect(() => {
    if (state && !state.ok && state.error !== "invalid_vibe") {
      toast.error(ERROR_MESSAGES[state.error] ?? ERROR_MESSAGES.unknown);
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-8">
      <form action={formAction} className="flex flex-col gap-3">
        <Textarea
          name="vibe"
          placeholder="e.g. Deep work, melodic techno, low energy"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          rows={3}
          required
        />
        {state && !state.ok && state.error === "invalid_vibe" && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
        <Button type="submit" disabled={isPending} className="self-start">
          {isPending
            ? isAuthenticated
              ? "Curating…"
              : "Redirecting to Spotify…"
            : isAuthenticated
              ? "Curate my set"
              : "Sign in & curate my set"}
        </Button>
      </form>

      {state?.ok && (
        <div className="flex flex-col gap-6">
          <CuratorNoteCard
            curatorNote={state.data.curatorNote}
            moodParameters={state.data.moodParameters}
            usedPersonalization={state.data.usedPersonalization}
          />
          <TrackList tracks={state.data.tracks} />
          <PlaylistCta
            vibe={vibe}
            curatorNote={state.data.curatorNote}
            trackUris={state.data.tracks.map((t) => t.uri)}
          />
        </div>
      )}
    </div>
  );
}
