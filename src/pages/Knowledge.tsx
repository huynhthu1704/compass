import { useState } from 'react';
import { ACTIONS, PHASE_INFO, ROLE_INFO } from '../catalog';
import { useStore } from '../store';
import { PHASES } from '../types';
import { Badge, PageHead, PhaseChip } from '../ui';

export function KnowledgePage() {
  const { settings } = useStore();
  const [q, setQ] = useState('');
  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());
  return (
    <div className="stack gap-xl">
      <PageHead over="Knowledge · BABOK v3 in practice" title="Technique library" sub="Every action Compass can suggest — what it is, when to use it, who owns it and what it produces." right={<input className="input" style={{ width: 260 }} placeholder="Search techniques…" value={q} onChange={(e) => setQ(e.target.value)} />} />
      {PHASES.map((ph) => {
        const list = ACTIONS.filter((a) => a.phase === ph && (!q || match(a.title + a.babok + a.when + a.output)));
        if (!list.length) return null;
        return (
          <section key={ph} className="stack gap-md">
            <div className="row gap-sm wrap"><PhaseChip phase={ph} /><span className="body-sm t-secondary">{PHASE_INFO[ph].goal}</span>{settings.lang === 'vi' && <Badge>{PHASE_INFO[ph].vi}</Badge>}</div>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead><tr><th style={{ width: '22%' }}>Technique / action</th><th style={{ width: '30%' }}>When to use</th><th>Produces</th><th>Owner</th><th>BABOK</th></tr></thead>
                <tbody>{list.map((a) => (
                  <tr key={a.id}><td><strong>{a.title}</strong><div className="body-sm t-tertiary">{a.effort}{a.heavy ? ' · heavy' : ''}</div></td><td>{a.when}</td><td>{a.output}</td><td>{a.owners.map((o) => <div key={o} className="body-sm">{ROLE_INFO[o].name}</div>)}</td><td className="mono-sm">{a.babok}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
