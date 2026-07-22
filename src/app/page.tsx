import { VibeForm } from "@/components/curate/vibe-form";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ vibe?: string }>;
}) {
  const { vibe } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Groove</h1>
        <p className="text-lg text-muted-foreground">
          Your AI DJ agent. Describe a vibe, and Groove curates a flow-optimized
          playlist from your own Spotify library.
        </p>
      </div>
      <VibeForm initialVibe={vibe} />
    </div>
  );
}
