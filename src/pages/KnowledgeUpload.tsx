import { useRef, useState } from 'react';
import { ACCEPT, newDoc, readFileText } from '../knowledge';
import type { KDoc } from '../types';
import { Button, Field, toast } from '../ui';

/** Drag-and-drop / file picker / paste box that turns inputs into knowledge documents. */
export function KnowledgeUpload({ onAdd, compact }: { onAdd: (docs: KDoc[]) => void; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState('');
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteBody, setPasteBody] = useState('');
  const [showPaste, setShowPaste] = useState(false);

  const files = async (list: FileList | File[]) => {
    const out: KDoc[] = [];
    for (const f of Array.from(list)) {
      setBusy(`Reading ${f.name}…`);
      try {
        const text = await readFileText(f);
        if (text.trim().length < 20) { toast(`${f.name}: no readable text (scanned PDF?)`); continue; }
        out.push(newDoc(f.name.replace(/\.[^.]+$/, ''), text, f.name));
      } catch (e) { toast(`${f.name}: ${(e as Error).message}`); }
    }
    setBusy('');
    if (out.length) { onAdd(out); toast(`Added ${out.length} document(s) to the knowledge base`); }
  };

  return (
    <div className="stack gap-md">
      <div
        className="empty stack gap-sm"
        style={{ alignItems: 'center', borderColor: drag ? 'var(--color-border-brand)' : undefined, background: drag ? 'var(--color-bg-brand-subtle)' : undefined, padding: compact ? 24 : 40, cursor: 'pointer' }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); files(e.dataTransfer.files); }}
        onClick={() => input.current?.click()}
        role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
      >
        <div className="h4" style={{ color: 'var(--color-text-primary)' }}>{busy || 'Drop files here or click to upload'}</div>
        <div className="body-sm">PRDs, specs, user research, analytics exports, SOPs, support summaries, glossaries, release notes</div>
        <div className="mono-sm">PDF · Word (.docx) · Markdown · TXT · CSV · JSON · HTML</div>
        <input ref={input} type="file" multiple accept={ACCEPT} hidden onChange={(e) => e.target.files && files(e.target.files)} />
      </div>
      {!showPaste ? <div><Button variant="ghost" size="sm" onClick={() => setShowPaste(true)}>Or paste text (Confluence page, Notion, email…)</Button></div> : (
        <div className="card stack gap-md">
          <Field label="Title"><input className="input" value={pasteTitle} placeholder="e.g. Checkout SOP" onChange={(e) => setPasteTitle(e.target.value)} /></Field>
          <Field label="Content"><textarea className="textarea" style={{ minHeight: 160 }} value={pasteBody} onChange={(e) => setPasteBody(e.target.value)} placeholder="Paste text or Markdown…" /></Field>
          <div className="row gap-sm">
            <Button size="sm" disabled={!pasteBody.trim()} onClick={() => { onAdd([newDoc(pasteTitle.trim() || pasteBody.trim().split('\n')[0].slice(0, 60), pasteBody)]); setPasteBody(''); setPasteTitle(''); setShowPaste(false); toast('Added to the knowledge base'); }}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowPaste(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
