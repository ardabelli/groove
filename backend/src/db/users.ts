
import { eq } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

// Comma-separated Spotify account IDs (see ADMIN_SPOTIFY_IDS in .env) that should be
// promoted to admin on login. This is a one-way promotion: removing an ID from the
// list does not demote an already-admin user, since env config isn't a safe place to
// track a downgrade.
function isAdminSpotifyId(id: string): boolean {
  const configured = (process.env.ADMIN_SPOTIFY_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return configured.includes(id);
}

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
  const promoteToAdmin = isAdminSpotifyId(id);
  await db
    .insert(users)
    .values({ id, email, displayName, imageUrl, ...(promoteToAdmin ? { isAdmin: true } : {}) })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        displayName,
        imageUrl,
        updatedAt: new Date(),
        ...(promoteToAdmin ? { isAdmin: true } : {}),
      },
    });
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
}
