import { Router } from "express";
import { getSessionUser } from "../lib/session";
import { getPromptsByUser, deletePrompt } from "../db/prompts";
import type { PromptListResult, DeletePromptResult } from "../lib/prompts/types";

export const promptsRouter = Router();

promptsRouter.get("/", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.json({ ok: false, error: "unauthenticated" } satisfies PromptListResult);
    return;
  }

  try {
    const rows = await getPromptsByUser(user.id);
    res.json({
      ok: true,
      data: {
        prompts: rows.map((row) => ({
          id: row.id,
          vibe: row.vibe,
          createdAt: row.createdAt.toISOString(),
        })),
      },
    } satisfies PromptListResult);
  } catch (err) {
    console.error("[GET /api/prompts]", err);
    res.json({ ok: false, error: "unknown" } satisfies PromptListResult);
  }
});

promptsRouter.delete("/:id", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    res.json({ ok: false, error: "unauthenticated" } satisfies DeletePromptResult);
    return;
  }

  const { id } = req.params;
  try {
    const deleted = await deletePrompt(id, user.id);
    if (!deleted) {
      res.json({ ok: false, error: "not_found" } satisfies DeletePromptResult);
      return;
    }
    res.json({ ok: true, data: { id: deleted.id } } satisfies DeletePromptResult);
  } catch (err) {
    console.error("[DELETE /api/prompts/:id]", err);
    res.json({ ok: false, error: "unknown" } satisfies DeletePromptResult);
  }
});
