import { z } from "zod";

const TrackSelectionSchema = z.object({
  artist: z.string().min(1),
  title: z.string().min(1),
});

export const CuratorResponseSchema = z.object({
  tracks: z.array(TrackSelectionSchema).min(8).max(12),
  curator_note: z.string().min(1).max(600),
  playlist_title: z.string().min(1).max(60),
  playlist_description: z.string().min(1).max(300),
  mood_parameters: z.object({
    energy: z.enum(["low", "medium", "high"]),
    descriptors: z.array(z.string()).max(6),
    ordering_intent: z.string(),
  }),
});

export type CuratorResponse = z.infer<typeof CuratorResponseSchema>;
export type TrackSelection = z.infer<typeof TrackSelectionSchema>;
