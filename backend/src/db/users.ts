
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

export async function upsertUser({
  id,
  email,
  displayName,
  imageUrl,
}: {
  id: string;
  email: string | null;
  displayName: string | null;
  imageUrl: string | null;
}) {
  await db
    .insert(users)
    .values({ id, email, displayName, imageUrl })
    .onConflictDoUpdate({
      target: users.id,
      set: { email, displayName, imageUrl, updatedAt: new Date() },
    });
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}

/** Atomically spends one credit if the user has any left. Returns the new balance, or null if they had none. */
export async function spendCredit(id: string): Promise<number | null> {
  const [row] = await db
    .update(users)
    .set({ credits: sql`${users.credits} - 1`, updatedAt: new Date() })
    .where(and(eq(users.id, id), gt(users.credits, 0)))
    .returning({ credits: users.credits });
  return row?.credits ?? null;
}

export async function addCredits(id: string, amount: number): Promise<number | null> {
  const [row] = await db
    .update(users)
    .set({ credits: sql`${users.credits} + ${amount}`, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning({ credits: users.credits });
  return row?.credits ?? null;
}
