import { ChevronDown } from "lucide-react";
import { VibeForm } from "@/components/curate/vibe-form";
import { SocialFeed } from "@/components/social/social-feed";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ vibe?: string }>;
}) {
  const { vibe } = await searchParams;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-16 sm:px-6">
        <div className="pt-16 pb-12 text-center">
          <h1 className="font-heading mb-4 text-5xl font-bold tracking-tight sm:text-6xl">
            Groove
          </h1>
          <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
            Your AI DJ agent. Describe a vibe, and Groove curates a flow-optimized
            playlist from your own Spotify library.
          </p>
        </div>
        <VibeForm initialVibe={vibe} />
        <div className="flex flex-col items-center gap-1.5 pt-10 pb-4 text-muted-foreground/60">
          <span className="text-xs">Scroll down for what the community is sharing</span>
          <ChevronDown className="size-4 animate-bounce" />
        </div>
      </div>
      <div id="community" className="mx-auto w-full max-w-4xl scroll-mt-20 px-5 pb-24 sm:px-6">
        <SocialFeed />
      </div>
    </div>
  );
}
