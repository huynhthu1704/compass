/**
 * Minimal GitHub REST client used by the portal and by the agents' tools.
 * Runs in the browser with the user's own fine-grained token (Contents, Pull requests,
 * Issues, Workflows, Administration (for creating repos / enabling Pages) — read & write).
 */
import type { FileChange, RepoRef } from './types';

const API = 'https://api.github.com';

export class GitHubError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

async function gh<T = unknown>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const j = await res.json(); msg = j.message || msg; } catch { /* no body */ }
    const hint = res.status === 401
      ? " — the GitHub token is missing or expired. If it is your own token, reconnect it on Connections; if it is the project's shared token (team access), ask an Admin of the project to replace it on the Team page."
      : res.status === 403 && /personal access token/i.test(msg)
      ? ' — your token lacks a permission for this repo. Edit the token on GitHub: include this repo in Repository access and set Contents, Pull requests, Issues, Workflows (and Actions, Pages) to Read & write.'
      : '';
    throw new GitHubError(res.status, `GitHub ${res.status}: ${msg}${hint}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const enc = (s: string) => { const b = new TextEncoder().encode(s); let bin = ''; b.forEach((x) => (bin += String.fromCharCode(x))); return btoa(bin); };
const dec = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0)));
const rp = (r: RepoRef) => `/repos/${r.owner}/${r.name}`;

interface ApiRepo { name: string; owner: { login: string }; default_branch: string; html_url: string; private: boolean; description: string | null; updated_at: string; has_pages?: boolean }
export const toRef = (r: ApiRepo): RepoRef => ({ owner: r.owner.login, name: r.name, defaultBranch: r.default_branch, htmlUrl: r.html_url, private: r.private });

export const github = {
  me: (t: string) => gh<{ login: string; name: string; avatar_url: string }>(t, '/user'),
  listRepos: (t: string) => gh<ApiRepo[]>(t, '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator'),
  getRepo: (t: string, owner: string, name: string) => gh<ApiRepo>(t, `/repos/${owner}/${name}`),
  createRepo: (t: string, name: string, description: string, priv: boolean) =>
    gh<ApiRepo>(t, '/user/repos', { method: 'POST', body: JSON.stringify({ name, description, private: priv, auto_init: true }) }),

  async tree(t: string, r: RepoRef, ref = r.defaultBranch) {
    const res = await gh<{ tree: { path: string; type: string; size?: number; sha: string }[]; truncated: boolean }>(t, `${rp(r)}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
    return res.tree.filter((x) => x.type === 'blob');
  },

  async file(t: string, r: RepoRef, path: string, ref?: string): Promise<{ content: string; sha: string } | null> {
    try {
      const res = await gh<{ content: string; sha: string; encoding: string }>(t, `${rp(r)}/contents/${path.split('/').map(encodeURIComponent).join('/')}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`);
      return { content: res.encoding === 'base64' ? dec(res.content) : res.content, sha: res.sha };
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return null;
      throw e;
    }
  },

  /** Commit many files in ONE commit on `branch` (created from `base` if missing). */
  async commit(t: string, r: RepoRef, branch: string, message: string, changes: FileChange[], base = r.defaultBranch) {
    let head: string;
    try {
      head = (await gh<{ object: { sha: string } }>(t, `${rp(r)}/git/ref/heads/${encodeURIComponent(branch)}`)).object.sha;
    } catch (e) {
      if (!(e instanceof GitHubError) || e.status !== 404) throw e;
      const baseSha = (await gh<{ object: { sha: string } }>(t, `${rp(r)}/git/ref/heads/${encodeURIComponent(base)}`)).object.sha;
      await gh(t, `${rp(r)}/git/refs`, { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }) });
      head = baseSha;
    }
    const baseTree = (await gh<{ tree: { sha: string } }>(t, `${rp(r)}/git/commits/${head}`)).tree.sha;
    const entries = [];
    for (const c of changes) {
      if (c.action === 'delete') entries.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
      else {
        const blob = await gh<{ sha: string }>(t, `${rp(r)}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: enc(c.content), encoding: 'base64' }) });
        entries.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
      }
    }
    const tree = await gh<{ sha: string }>(t, `${rp(r)}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: baseTree, tree: entries }) });
    const commit = await gh<{ sha: string; html_url: string }>(t, `${rp(r)}/git/commits`, { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [head] }) });
    await gh(t, `${rp(r)}/git/refs/heads/${encodeURIComponent(branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha }) });
    return commit;
  },

  createPR: (t: string, r: RepoRef, title: string, head: string, body: string) =>
    gh<{ number: number; html_url: string; head: { sha: string } }>(t, `${rp(r)}/pulls`, { method: 'POST', body: JSON.stringify({ title, head, base: r.defaultBranch, body }) }),
  getPR: (t: string, r: RepoRef, n: number) => gh<{ number: number; state: string; merged: boolean; mergeable: boolean | null; head: { sha: string; ref: string }; html_url: string; title: string }>(t, `${rp(r)}/pulls/${n}`),
  listPRs: (t: string, r: RepoRef, state = 'open') => gh<{ number: number; title: string; html_url: string; head: { ref: string; sha: string }; user: { login: string }; merged_at: string | null }[]>(t, `${rp(r)}/pulls?state=${state}&per_page=30`),
  mergePR: (t: string, r: RepoRef, n: number, title: string) => gh<{ sha: string; merged: boolean }>(t, `${rp(r)}/pulls/${n}/merge`, { method: 'PUT', body: JSON.stringify({ merge_method: 'squash', commit_title: title }) }),

  /** Open issues (pull requests filtered out), newest first, up to 1000 (F-012). */
  async openIssues(t: string, r: RepoRef) {
    const out: { number: number; title: string; html_url: string; pull_request?: unknown }[] = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await gh<typeof out>(t, `${rp(r)}/issues?state=open&per_page=100&page=${page}`);
      out.push(...batch.filter((i) => !i.pull_request));
      if (batch.length < 100) break;
    }
    return out;
  },
  commentIssue: (t: string, r: RepoRef, n: number, body: string) => gh(t, `${rp(r)}/issues/${n}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  /** Close an issue as "not planned" (never deletes it). */
  closeIssue: (t: string, r: RepoRef, n: number) => gh(t, `${rp(r)}/issues/${n}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'not_planned' }) }),

  async checks(t: string, r: RepoRef, ref: string) {
    const res = await gh<{ check_runs: { name: string; status: string; conclusion: string | null; html_url: string }[] }>(t, `${rp(r)}/commits/${encodeURIComponent(ref)}/check-runs`);
    return res.check_runs;
  },
  workflowRuns: (t: string, r: RepoRef) => gh<{ workflow_runs: { id: number; name: string; status: string; conclusion: string | null; html_url: string; head_branch: string; created_at: string }[] }>(t, `${rp(r)}/actions/runs?per_page=10`).then((x) => x.workflow_runs),
  releases: (t: string, r: RepoRef) => gh<{ tag_name: string; name: string; html_url: string; published_at: string }[]>(t, `${rp(r)}/releases?per_page=20`),
  createRelease: (t: string, r: RepoRef, tag: string, name: string, body: string) =>
    gh<{ html_url: string; tag_name: string; name: string; published_at: string }>(t, `${rp(r)}/releases`, { method: 'POST', body: JSON.stringify({ tag_name: tag, name, body, target_commitish: r.defaultBranch, generate_release_notes: true }) }),

  async enablePages(t: string, r: RepoRef) {
    try { return await gh<{ html_url: string }>(t, `${rp(r)}/pages`, { method: 'POST', body: JSON.stringify({ build_type: 'workflow' }) }); }
    catch (e) {
      if (e instanceof GitHubError && e.status === 409) return gh<{ html_url: string }>(t, `${rp(r)}/pages`);
      throw e;
    }
  },
  async pages(t: string, r: RepoRef) {
    try { return await gh<{ html_url: string; build_type: string }>(t, `${rp(r)}/pages`); } catch { return null; }
  },
};
