import { Router } from "express";
import { getSessionUser } from "../lib/session";
import { getUserById } from "../db/users";
import type { CreditsResult } from "../lib/credits/types";

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
