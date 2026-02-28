# LLM Module

NestJS LLM integration with SOLID boundaries and model routing via DI. Business code depends only on the `LLMClient` interface; the router resolves `modelKey` to provider and model from config.

## Config (env)

- `OPENAI_API_KEY` – required for OpenAI.
- `OPENAI_BASE_URL` – optional override (e.g. proxy).
- `LLM_MODELS` – model key → model name mapping, e.g.  
  `LLM_MODELS=mini:gpt-4o-mini;sonnet:gpt-4o`  
  Format: `key1:modelName1;key2:modelName2`. Provider defaults to `openai` for all keys.

## Usage

Inject `LLMRouterService` and call `completeJSON` with a `modelKey` and a Zod schema. The router looks up the model and delegates to the right client.

```ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { LLMRouterService } from '../llm/llm-router.service';

const ReplySchema = z.object({
  answer: z.string(),
  score: z.number(),
});

@Injectable()
export class MyService {
  constructor(private readonly llm: LLMRouterService) {}

  async ask() {
    const { value } = await this.llm.completeJSON({
      modelKey: 'mini',
      system: 'You are a helpful assistant.',
      user: 'What is 2+2? Reply with JSON: { "answer": "...", "score": 0-10 }',
      schema: ReplySchema,
      requestId: 'req-1',
      purpose: 'demo',
    });
    return value; // { answer: string, score: number }
  }
}
```

Import `LlmModule` in your feature module (or `AppModule`) so `LLMRouterService` is available:

```ts
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  // ...
})
export class MyModule {}
```

## Behavior

- **Timeout**: Enforced via `AbortController`; default 30s, overridable with `timeoutMs`.
- **Retries**: Only when schema/JSON validation fails; at most one retry with lower temperature.
- **Logging**: One info log per call (requestId, purpose, model, provider, latencyMs, ok/fail). Prompts and user text are never logged.

## Adding providers

Register new clients under `LLM_CLIENTS_MAP` in `llm.module.ts` and extend `llm.config.ts` so `modelKey` can resolve to the new provider.
