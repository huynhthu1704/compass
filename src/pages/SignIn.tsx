// F-015 SCR-1 "Sign in to Compass" and SCR-2 "You have no access yet" (REQ-032). Design: compass/design/F-015.md.
import { useState, type ReactNode } from 'react';
import { reloadAccess, signInWithGoogle, signOut } from '../firebase';
import { Button } from '../ui';

// Google's "G" keeps its official colours (Google sign-in branding), so it lives in public/ outside the colour tokens.
const GoogleIcon = () => <img src={`${import.meta.env.BASE_URL}google-g.svg`} width={18} height={18} alt="" aria-hidden />;

function Card({ logo, children }: { logo: ReactNode; children: ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px 16px' }}>
      <section className="card pad-xl stack gap-lg" style={{ width: '100%', maxWidth: 440 }}>
        <div className="brand">{logo}<div className="brand-text">Compass</div></div>
        {children}
      </section>
    </main>
  );
}

/** SCR-1: the only screen a signed-out person sees when Firebase is configured. */
export function SignInPage({ logo, error }: { logo: ReactNode; error?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | undefined>();
  const go = async () => {
    setBusy(true); setErr(undefined);
    try { await signInWithGoogle(); } catch (e) {
      const code = (e as { code?: string }).code || '';
      setErr(code.includes('popup-closed') ? 'Sign-in was cancelled.' : code.includes('popup-blocked') ? 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.' : (e as Error).message);
    } finally { setBusy(false); }
  };
  return (
    <Card logo={logo}>
      <h1 className="h1">Sign in to Compass</h1>
      <p className="body t-secondary">Use the Google account your admin added to your project. Compass matches it by email.</p>
      <Button variant="secondary" onClick={go} disabled={busy} style={{ width: '100%', justifyContent: 'center', gap: 10 }}>
        <GoogleIcon />{busy ? 'Signing in…' : 'Sign in with Google'}
      </Button>
      {(err || error) && <p className="body-sm t-danger" role="alert">{err || error}</p>}
      <div className="stack gap-xs" style={{ background: 'var(--color-bg-subtle)', borderRadius: 8, padding: '12px 14px' }}>
        <strong className="body-sm">No account yet?</strong>
        <span className="body-sm t-secondary">Ask your project Admin to add your email on the Team page, then sign in here.</span>
      </div>
    </Card>
  );
}

/** SCR-2: a signed-in Google account that is on no team and is not the super admin. Shows no project data. */
export function NoAccessPage({ logo, email, error }: { logo: ReactNode; email?: string; error?: string }) {
  const [busy, setBusy] = useState(false);
  const reload = async () => { setBusy(true); try { await reloadAccess(); } finally { setBusy(false); } };
  return (
    <Card logo={logo}>
      <h1 className="h1">You have no access yet</h1>
      <div className="row gap-sm wrap" style={{ background: 'var(--color-bg-brand-subtle)', borderRadius: 8, padding: '10px 12px' }}>
        <span className="body-sm t-secondary">Signed in as</span><strong className="body-sm">{email || '—'}</strong>
      </div>
      <p className="body t-secondary">This Google account is not on any project team. Ask your admin to add this email to a project, then reload the page.</p>
      {error && <p className="body-sm t-danger" role="alert">{error}</p>}
      <div className="row gap-sm wrap">
        <Button variant="accent" onClick={reload} disabled={busy}>{busy ? 'Reloading…' : 'Reload'}</Button>
        <Button variant="secondary" onClick={() => void signOut()}>Sign out</Button>
      </div>
      <p className="body-sm t-tertiary">No project names or data are shown on this screen.</p>
    </Card>
  );
}
