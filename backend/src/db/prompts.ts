import { and, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { promptHistory } from "./schema";

export async function createPromptRecord({ userId, vibe }: { userId: string; vibe: string }) {
  const [row] = await db.insert(promptHistory).values({ userId, vibe }).returning();
  return row;
}

export async function getPromptsByUser(userId: string) {
  return db
    .select()
    .from(promptHistory)
    .where(eq(promptHistory.userId, userId))
    .orderBy(desc(promptHistory.createdAt));
}

export async function deletePrompt(id: string, userId: string) {
  const [row] = await db
    .delete(promptHistory)
    .where(and(eq(promptHistory.id, id), eq(promptHistory.userId, userId)))
    .returning({ id: promptHistory.id });
  return row ?? null;
}
