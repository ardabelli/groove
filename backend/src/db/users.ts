
import { eq } from "drizzle-orm";
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
