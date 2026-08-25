import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "./index";
import { adRewards } from "./schema";

const AD_REWARD_TTL_MS = 5 * 60 * 1000;

export async function createAdReward(userId: string) {
  const [row] = await db
    .insert(adRewards)
    .values({ userId, expiresAt: new Date(Date.now() + AD_REWARD_TTL_MS) })
    .returning();
  return row;
}

/** Atomically marks a pending, unexpired ad reward as redeemed. Returns false if it was missing, already redeemed, expired, or owned by another user. */
export async function redeemAdReward(id: string, userId: string): Promise<boolean> {
  const [row] = await db
    .update(adRewards)
    .set({ redeemedAt: new Date() })
    .where(
      and(
        eq(adRewards.id, id),
        eq(adRewards.userId, userId),
        isNull(adRewards.redeemedAt),
        gt(adRewards.expiresAt, new Date())
      )
    )
    .returning({ id: adRewards.id });
  return row !== undefined;
}
