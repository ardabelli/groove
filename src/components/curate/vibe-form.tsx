"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
          placeholder="e.g. A playlist that feels like I'm in Miami in the eighties"
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={3}
          required
          disabled={isPending}
          className="rounded-xl border-border bg-card px-4 py-3.5 text-sm placeholder:text-muted-foreground/50 focus-visible:border-primary/50 focus-visible:ring-primary/50"
        />
        {state && !state.ok && state.error === "invalid_vibe" && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
        <Button
          type="submit"
          disabled={isPending}
          className="self-start rounded-full bg-foreground text-background hover:bg-foreground/90"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isPending
            ? isAuthenticated
              ? "Curating…"
              : "Redirecting to Spotify…"
            : isAuthenticated
              ? "Curate my set"
              : "Sign in & curate my set"}
        </Button>
      </form>

      {isPending && isAuthenticated && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="relative size-12">
            <div className="absolute inset-0 rounded-full border-2 border-border" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-t-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Analyzing your vibe and building your set…
          </p>
        </div>
      )}

      {state?.ok && (
        <div className="flex flex-col gap-6">
          <CuratorNoteCard
            curatorNote={state.data.curatorNote}
            moodParameters={state.data.moodParameters}
            usedPersonalization={state.data.usedPersonalization}
          />
          <TrackList tracks={state.data.tracks} />
          <PlaylistCta
            key={state.data.tracks.map((t) => t.id).join("|")}
            playlistTitle={state.data.playlistTitle}
            playlistDescription={state.data.playlistDescription}
            curatorNote={state.data.curatorNote}
            moodParameters={state.data.moodParameters}
            tracks={state.data.tracks}
          />
        </div>
      )}
    </div>
  );
}
