import { z } from 'zod';

export const ConversationStarterLlmSchema = z.object({
  opener: z.string().min(1).max(200),
});

export type ConversationStarterLlmPayload = z.infer<
  typeof ConversationStarterLlmSchema
>;
