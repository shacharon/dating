import { z } from 'zod';

export const MatchNarrativeLlmSchema = z.object({
  narrative: z.string().min(1),
});

export type MatchNarrativeLlmPayload = z.infer<typeof MatchNarrativeLlmSchema>;
