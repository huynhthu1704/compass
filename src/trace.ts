// F-017 Collapsible agent trace (REQ-045): pure helpers for the trace card of an agent run.
// Types-only imports, so Node's test runner can import this file directly (tests/trace.test.mjs).
import type { Run, TraceStep } from './types';

/** Open while the agent is working; folded once it waits for approval or has finished. */
export function traceDefaultOpen(status: Run['status']): boolean {
  return status === 'running';
}

/** The Product Owner's own toggle (true/false) wins over the default; null = she has not used it. */
export function traceOpen(status: Run['status'], manual: boolean | null): boolean {
  return manual ?? traceDefaultOpen(status);
}

/** A failed step is one RunView paints red: marked not ok, or an error step not marked ok. */
export function traceSummary(steps: TraceStep[]) {
  const failed = steps.filter((s) => s.ok === false || (s.kind === 'error' && s.ok !== true)).length;
  const count = `${steps.length} step${steps.length === 1 ? '' : 's'}`;
  return { steps: steps.length, failed, text: failed ? `${count} · ${failed} failed` : count };
}

export function traceToggleLabel(open: boolean): string {
  return open ? 'Hide steps' : 'Show steps';
}
