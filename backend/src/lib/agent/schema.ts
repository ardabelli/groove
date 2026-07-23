import { z } from "zod";

export const CuratorResponseSchema = z.object({
  curator_note: z.string().min(1).max(600),
  playlist_title: z.string().min(1).max(60),
  playlist_description: z.string().min(1).max(300),
  search_queries: z.array(z.string().min(1)).min(8).max(12),
  mood_parameters: z.object({
    energy: z.enum(["low", "medium", "high"]),
    descriptors: z.array(z.string()).max(6),
    ordering_intent: z.string(),
  }),
});

export type CuratorResponse = z.infer<typeof CuratorResponseSchema>;
