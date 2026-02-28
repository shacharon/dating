/**
 * Env-based LLM config. Model map: modelKey -> { provider, modelName }.
 * Format LLM_MODELS: 'key1:modelName1;key2:modelName2' (provider defaults to openai for now).
 */
export interface LLMModelEntry {
  provider: string;
  modelName: string;
}

const DEFAULT_MODELS = 'default:gpt-4o-mini';

function parseModelsEnv(
  envValue: string | undefined,
): Map<string, LLMModelEntry> {
  const raw = envValue?.trim() || DEFAULT_MODELS;
  const map = new Map<string, LLMModelEntry>();
  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const modelKey = trimmed.slice(0, colon).trim();
    const modelName = trimmed.slice(colon + 1).trim();
    if (modelKey && modelName) {
      map.set(modelKey, { provider: 'openai', modelName });
    }
  }
  return map;
}

export interface LLMConfig {
  openai: {
    apiKey: string;
    baseURL?: string;
  };
  models: Map<string, LLMModelEntry>;
}

export function loadLLMConfig(env: NodeJS.ProcessEnv = process.env): LLMConfig {
  const apiKey = env.OPENAI_API_KEY?.trim() ?? '';
  const baseURL = env.OPENAI_BASE_URL?.trim();
  return {
    openai: { apiKey, baseURL: baseURL || undefined },
    models: parseModelsEnv(env.LLM_MODELS),
  };
}
