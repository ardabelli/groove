"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BACKEND_URL } from "@/lib/backend";
import type { DeletePromptResult, PromptHistoryDTO } from "@/lib/types";

async function deletePrompt(id: string): Promise<DeletePromptResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/prompts/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return (await res.json()) as DeletePromptResult;
  } catch {
    return { ok: false, error: "unknown" };
  }
}

function PromptRow({ prompt, onDeleted }: { prompt: PromptHistoryDTO; onDeleted: (id: string) => void }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePrompt(prompt.id);
      if (result.ok) {
        onDeleted(prompt.id);
      } else {
        toast.error("Couldn't delete this prompt. Please try again.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm">{prompt.vibe}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(prompt.createdAt).toLocaleString()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          title="Reuse this vibe"
          nativeButton={false}
          render={<Link href={`/?vibe=${encodeURIComponent(prompt.vibe)}`} />}
        >
          <Wand2 className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          title="Delete"
          onClick={handleDelete}
          disabled={isPending}
          className="text-muted-foreground hover:text-destructive"
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export function PromptHistory({ prompts }: { prompts: PromptHistoryDTO[] }) {
  const [items, setItems] = useState(prompts);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">You haven&apos;t entered any prompts yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((prompt) => (
        <PromptRow
          key={prompt.id}
          prompt={prompt}
          onDeleted={(id) => setItems((prev) => prev.filter((p) => p.id !== id))}
        />
      ))}
    </div>
  );
}
