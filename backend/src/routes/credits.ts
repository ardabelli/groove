import { Router } from "express";
import { z } from "zod";
import { getSessionUser } from "../lib/session";
import { getUserById, addCredits } from "../db/users";
import { createAdReward, redeemAdReward } from "../db/ads";
import { AD_REWARD_CREDITS, AD_MIN_WATCH_SECONDS } from "../lib/credits/types";
import type { CreditsResult, AdStartResult, AdCompleteResult } from "../lib/credits/types";

export const creditsRouter = Router();

creditsRouter.get("/", async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) {
    res.json({ ok: false, error: "unauthenticated" } satisfies CreditsResult);
    return;
  }

  try {
    const user = await getUserById(sessionUser.id);
    res.json({ ok: true, data: { credits: user?.credits ?? 0 } } satisfies CreditsResult);
  } catch (err) {
    console.error("[GET /api/credits]", err);
    res.json({ ok: false, error: "unknown" } satisfies CreditsResult);
  }
});

// Issues a one-time token before an ad plays. Mirrors the "start impression" step
// most rewarded-ad networks require before they'll confirm a completed view.
creditsRouter.post("/ad/start", async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) {
    res.json({ ok: false, error: "unauthenticated" } satisfies AdStartResult);
    return;
  }

  try {
    const reward = await createAdReward(sessionUser.id);
    res.json({
      ok: true,
      data: { token: reward.id, minWatchSeconds: AD_MIN_WATCH_SECONDS },
    } satisfies AdStartResult);
  } catch (err) {
    console.error("[POST /api/credits/ad/start]", err);
    res.json({ ok: false, error: "unknown" } satisfies AdStartResult);
  }
});

const CompleteSchema = z.object({ token: z.string().min(1) });

// Redeems a token issued by /ad/start. Today this is called directly by the client
// once the (placeholder) ad finishes; when a real ad network is wired in, prefer
// having its server-to-server reward postback call this instead of trusting the client.
creditsRouter.post("/ad/complete", async (req, res) => {
  const sessionUser = getSessionUser(req);
  if (!sessionUser) {
    res.json({ ok: false, error: "unauthenticated" } satisfies AdCompleteResult);
    return;
  }

  const parsed = CompleteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.json({ ok: false, error: "invalid_token" } satisfies AdCompleteResult);
    return;
  }

  try {
    const redeemed = await redeemAdReward(parsed.data.token, sessionUser.id);
    if (!redeemed) {
      res.json({ ok: false, error: "invalid_token" } satisfies AdCompleteResult);
      return;
    }

    const credits = await addCredits(sessionUser.id, AD_REWARD_CREDITS);
    res.json({
      ok: true,
      data: { credits: credits ?? AD_REWARD_CREDITS, creditsAwarded: AD_REWARD_CREDITS },
    } satisfies AdCompleteResult);
  } catch (err) {
    console.error("[POST /api/credits/ad/complete]", err);
    res.json({ ok: false, error: "unknown" } satisfies AdCompleteResult);
  }
});
