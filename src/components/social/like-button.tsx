"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BACKEND_URL } from "@/lib/backend";
import type { LikeResult } from "@/lib/types";
import { cn } from "@/lib/utils";

async function toggleLike(playlistId: string): Promise<LikeResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/playlist/${playlistId}/like`, {
      method: "POST",
      credentials: "include",
    });
    return (await res.json()) as LikeResult;
  } catch {
    return { ok: false, error: "unknown" };
  }
}

export function LikeButton({
  playlistId,
  initialLiked,
  initialCount,
  isAuthenticated,
}: {
  playlistId: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthenticated: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Button
        size="sm"
        variant="ghost"
        disabled
        title="Sign in to like this playlist"
        className="gap-1.5 text-muted-foreground"
      >
        <Heart className="size-3.5" />
        {count}
      </Button>
    );
  }

  function handleClick() {
    const optimisticLiked = !liked;
    const optimisticCount = count + (optimisticLiked ? 1 : -1);
    setLiked(optimisticLiked);
    setCount(optimisticCount);

    startTransition(async () => {
      const result = await toggleLike(playlistId);
      if (result.ok) {
        setLiked(result.data.liked);
        setCount(result.data.likeCount);
      } else {
        setLiked(!optimisticLiked);
        setCount(count);
        toast.error("Couldn't update your like. Please try again.");
      }
    });
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleClick}
      disabled={isPending}
      className={cn("gap-1.5", liked && "text-primary")}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Heart className={cn("size-3.5", liked && "fill-current")} />
      )}
      {count}
    </Button>
  );
}
