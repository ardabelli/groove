"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { startAdReward, completeAdReward } from "@/lib/backend";

type Phase = "loading" | "playing" | "error";

export function RewardedAdModal({
  open,
  onOpenChange,
  onRewarded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRewarded: (credits: number) => void;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const redeemedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    redeemedRef.current = false;
    // Resets the modal's internal state for a fresh ad each time it's reopened on the same instance.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase("loading");
    setToken(null);
    startAdReward().then((res) => {
      if (!res.ok) {
        setPhase("error");
        return;
      }
      setToken(res.data.token);
      setTotalSeconds(res.data.minWatchSeconds);
      setSecondsLeft(res.data.minWatchSeconds);
      setPhase("playing");
    });
  }, [open]);

  useEffect(() => {
    if (phase !== "playing" || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft]);

  // Placeholder ad player: this timed countdown stands in for a real rewarded-ad SDK.
  // Swap it for the ad network's play call, redeeming the token on its reward callback.
  useEffect(() => {
    if (phase !== "playing" || secondsLeft > 0 || !token || redeemedRef.current) return;
    redeemedRef.current = true;
    completeAdReward(token).then((res) => {
      if (!res.ok) {
        setPhase("error");
        return;
      }
      onRewarded(res.data.credits);
      toast.success(`+${res.data.creditsAwarded} prompt credit earned`);
      onOpenChange(false);
    });
  }, [phase, secondsLeft, token, onRewarded, onOpenChange]);

  const granting = phase === "playing" && secondsLeft <= 0;
  const progress = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Watch an ad for +1 prompt</DialogTitle>
          <DialogDescription>
            {phase === "error"
              ? "Couldn't load an ad right now — try again in a moment."
              : "Stick around while this plays — your credit lands the moment it finishes."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border bg-muted/30 py-10">
          {phase === "loading" && <p className="text-sm text-muted-foreground">Loading ad…</p>}
          {phase === "playing" && (
            <>
              <PlayCircle className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {granting ? "Crediting your account…" : `Ad playing — ${secondsLeft}s left`}
              </p>
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
          {phase === "error" && (
            <p className="text-sm text-destructive">Something went wrong. Close this and try again.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
