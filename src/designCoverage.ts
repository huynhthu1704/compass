/**
 * Design coverage for compass/design/F-xxx.md (REQ-103, bug #31).
 * A requirement no screen delivers is "not covered", unless its design is "none: <reason>" (the same rule check-spec uses):
 * then it needs no screen and is listed with its reason. Pure, types-only imports, so Node runs it in the tests.
 */
import type { Requirement } from './types.ts';

export interface Coverage { uncovered: Pick<Requirement, 'id'>[]; noScreen: { id: string; reason: string }[] }

export function designCoverage(reqs: Pick<Requirement, 'id' | 'design'>[], screens: { reqIds: string[] }[]): Coverage {
  const notOnScreen = reqs.filter((r) => !screens.some((s) => s.reqIds.includes(r.id)));
  const none = (r: Pick<Requirement, 'design'>) => /^none:\s*(\S.*)$/is.exec(r.design || '');
  return {
    uncovered: notOnScreen.filter((r) => !none(r)),
    noScreen: notOnScreen.flatMap((r) => { const m = none(r); return m ? [{ id: r.id, reason: m[1].trim() }] : []; }),
  };
}
