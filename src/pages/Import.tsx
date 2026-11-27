import { useEffect, useState } from 'react';
import { go } from '../App';
import { github, toRef } from '../github';
import { rag, loadRepoDocs } from '../rag';
import { newProject, store, useStore } from '../store';
import { ago, Badge, Button, PageHead, toast } from '../ui';

type R = Awaited<ReturnType<typeof github.listRepos>>[number];

/** Imports a GitHub repository as a local project: its spec, Pages URL, releases and an index for the agents. Used by
 *  Import (the person's own token) and by "Shared with you" on the Projects page (the project's shared token). */
export async function importRepo(t: string, r: R, name = r.name) {
  const ref = toRef(r);
  const specFile = await github.file(t, ref, 'compass/spec.json');
  const pages = await github.pages(t, ref);
  let p = newProject({ name, description: r.description || '', repo: { ...ref, pagesUrl: pages?.html_url } });
  if (specFile) p = { ...p, spec: JSON.parse(specFile.content), specSha: specFile.sha, frameworkInstalled: true };
  const rel = await github.releases(t, ref).catch(() => []);
  p.releases = rel.map((x) => ({ tag: x.tag_name, name: x.name || x.tag_name, url: x.html_url, date: x.published_at, prs: [] }));
  store.addProject(p);
  toast('Indexing repository for RAG…');
  // Indexing is a convenience for the agents: a failure must not leave a half-imported project (Re-index on Knowledge).
  try { rag.setRepoDocs(p.id, await loadRepoDocs(t, p)); }
  catch (e) { toast(`Imported, but indexing failed: ${(e as Error).message}`); return p; }
  toast(specFile ? 'Imported — Compass spec found' : 'Imported — install the framework from Overview');
  return p;
}

export function ImportPage() {
  const { settings, projects } = useStore();
  const [repos, setRepos] = useState<R[] | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!settings.githubToken) return;
    github.listRepos(settings.githubToken).then(setRepos).catch((e) => { toast(e.message); setRepos([]); });
  }, [settings.githubToken]);

  const imp = async (r: R) => {
    setBusy(r.name);
    try {
      const ref = toRef(r);
      const existing = projects.find((p) => p.repo?.owner === ref.owner && p.repo?.name === ref.name);
      if (existing) { go(`/p/${existing.id}`); return; }
      const p = await importRepo(settings.githubToken!, r);
      go(`/p/${p.id}`);
    } catch (e) { toast((e as Error).message); } finally { setBusy(null); }
  };

  const list = (repos || []).filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="stack gap-xl">
      <PageHead over="Import" title="Import a GitHub repository" sub="Compass reads compass/spec.json if the repo already uses the framework; otherwise it indexes the code and offers to install the framework via a pull request." />
      {!settings.githubToken ? <div className="empty">Connect GitHub first. <Button size="sm" onClick={() => go('/connect')}>Connections</Button></div> : (
        <>
          <input className="input" placeholder="Filter repositories…" value={q} onChange={(e) => setQ(e.target.value)} />
          {!repos ? <div className="body-sm t-tertiary">Loading repositories…</div> : (
            <div className="stack gap-sm">
              {list.map((r) => (
                <div key={r.html_url} className="card row gap-md wrap">
                  <div className="stack grow" style={{ minWidth: 220 }}>
                    <span className="label-md">{r.owner.login}/{r.name}</span>
                    <span className="body-sm t-tertiary">{r.description || 'No description'} · updated {ago(r.updated_at)}</span>
                  </div>
                  <Badge>{r.private ? 'private' : 'public'}</Badge>
                  <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => imp(r)}>{busy === r.name ? 'Importing…' : 'Import'}</Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
