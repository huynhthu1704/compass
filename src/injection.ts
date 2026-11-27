/** Prompt-injection pattern shared by the retrieval guardrail and the reply guardrail (REQ-054). Pure: no imports. */
export const INJECTION = /(ignore (all )?(previous|prior|above) instructions|disregard (the )?(system|previous)|you are now|reveal (your )?(system prompt|api key)|exfiltrate|send (the )?(token|key) to)/i;

/** The first instruction-like phrase found in the texts, or null. */
export function findInjection(texts: string[]): string | null {
  for (const t of texts) { const m = t.match(INJECTION); if (m) return m[0]; }
  return null;
}
