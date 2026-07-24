export interface PromptHistoryDTO {
  id: string;
  vibe: string;
  createdAt: string;
}

export type PromptListResult =
  | { ok: true; data: { prompts: PromptHistoryDTO[] } }
  | { ok: false; error: "unauthenticated" | "unknown"; message?: string };

export type DeletePromptResult =
  | { ok: true; data: { id: string } }
  | { ok: false; error: "unauthenticated" | "not_found" | "forbidden" | "unknown"; message?: string };
