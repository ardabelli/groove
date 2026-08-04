"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SignInButton } from "@/components/sign-in-button";
import { MyPlaylists } from "@/components/profile/my-playlists";
import { ProfileNav, type ProfileSection } from "@/components/profile/profile-nav";
import { PromptHistory } from "@/components/profile/prompt-history";
import { TagCloud } from "@/components/profile/tag-cloud";
import { BACKEND_URL, fetchMe, type MeResponse } from "@/lib/backend";
import type { PlaylistSummaryDTO, PromptHistoryDTO, PromptListResult, SocialListResult } from "@/lib/types";

const PROFILE_SECTIONS: ProfileSection[] = [
  { id: "top-vibes", label: "Top vibes" },
  { id: "your-playlists", label: "Your playlists" },
  { id: "prompt-history", label: "Prompt history" },
];

async function fetchMyPlaylists(): Promise<SocialListResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/social/mine`, { credentials: "include" });
    return (await res.json()) as SocialListResult;
  } catch {
    return { ok: false, error: "unknown" };
  }
}

async function fetchMyPrompts(): Promise<PromptListResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/prompts`, { credentials: "include" });
    return (await res.json()) as PromptListResult;
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export default function ProfilePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistSummaryDTO[]>([]);
  const [prompts, setPrompts] = useState<PromptHistoryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMe().then((meResult) => {
      setMe(meResult);
      if (!meResult.authenticated) {
        setIsLoading(false);
        return;
      }
      Promise.all([fetchMyPlaylists(), fetchMyPrompts()]).then(([playlistsResult, promptsResult]) => {
        if (playlistsResult.ok) setPlaylists(playlistsResult.data.playlists);
        if (promptsResult.ok) setPrompts(promptsResult.data.prompts);
        setIsLoading(false);
      });
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!me?.authenticated || !me.user) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 py-24 text-center">
        <p className="text-sm text-muted-foreground">Sign in to see your profile.</p>
        <SignInButton />
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl flex-1 px-5 pt-16 pb-24 sm:px-6">
      <aside className="fixed top-24 left-6 hidden w-40 md:block lg:left-12 xl:left-24">
        <ProfileNav sections={PROFILE_SECTIONS} />
      </aside>

      <div className="flex flex-col gap-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar size="lg">
            <AvatarImage src={me.user.imageUrl ?? undefined} alt={me.user.displayName ?? "User"} />
            <AvatarFallback>{me.user.displayName?.[0] ?? "U"}</AvatarFallback>
          </Avatar>
          <h1 className="font-heading text-2xl font-bold tracking-tight">{me.user.displayName}</h1>
        </div>

        <section id="top-vibes" className="flex scroll-mt-24 flex-col gap-2">
          <h2 className="font-heading text-xl font-semibold tracking-tight">Your top vibes</h2>
          <TagCloud playlists={playlists} />
        </section>

        <section id="your-playlists" className="flex scroll-mt-24 flex-col gap-4">
          <h2 className="font-heading text-xl font-semibold tracking-tight">Your playlists</h2>
          <MyPlaylists playlists={playlists} />
        </section>

        <section id="prompt-history" className="flex scroll-mt-24 flex-col gap-4">
          <h2 className="font-heading text-xl font-semibold tracking-tight">Prompt history</h2>
          <PromptHistory prompts={prompts} />
        </section>
      </div>
    </div>
  );
}
