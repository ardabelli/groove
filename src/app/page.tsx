import { VibeForm } from "@/components/curate/vibe-form";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ vibe?: string }>;
}) {
  const { vibe } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-24 sm:px-6">
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
    </div>
  );
}
