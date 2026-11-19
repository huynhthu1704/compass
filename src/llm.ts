/** Claude Messages API with tool use, called directly from the browser with the user's key. */
import type { Settings } from './types';

export interface ToolDef { name: string; description: string; input_schema: Record<string, unknown> }
export type Block = { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
export type Msg = { role: 'user' | 'assistant'; content: string | unknown[] };

export async function claude(settings: Settings, system: string, messages: Msg[], tools?: ToolDef[], maxTokens = 4096) {
  if (!settings.apiKey) throw new Error('No Anthropic API key — add it in Connections, or use demo mode.');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': settings.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: settings.model, max_tokens: maxTokens, system, messages, ...(tools ? { tools } : {}) }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 240)}`);
  const data = await res.json();
  return { content: data.content as Block[], stop: data.stop_reason as string, tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) };
}
