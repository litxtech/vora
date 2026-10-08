'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { countH1, readabilityNotes, scoreArticle, type ArticleDraft, type FieldMode } from '@/lib/blog/studio';

type Choice = { id: string; name: string };
type SaveResult = { id?: string; updatedAt?: string; error?: string; warnings?: string[]; similar?: { id: string; title: string; slug: string }[] };

const ACTIONS: { id: string; label: string; confirm?: boolean }[] = [
  { id: 'rewrite', label: 'İçeriği yeniden yaz' },
  { id: 'expand', label: 'Genişlet' },
  { id: 'shorten', label: 'Kısalt' },
  { id: 'faq', label: 'SSS üret' },
  { id: 'excerpt', label: 'Özet' },
  { id: 'titles', label: 'Başlık üret' },
  { id: 'slug', label: 'Slug' },
  { id: 'meta_description', label: 'Meta açıklama' },
  { id: 'alt_text', label: 'Alt metin' },
  { id: 'og', label: 'OG metin' },
  { id: 'seo_fields', label: 'SEO alanlarını yenile', confirm: true },
  { id: 'proofread', label: 'Yazım' },
  { id: 'natural_turkish', label: 'Doğal Türkçe' },
  { id: 'translate', label: 'Çevir' },
  { id: 'regenerate_all', label: 'Her şeyi yeniden oluştur', confirm: true },
];

function badge(mode: FieldMode | undefined) {
  if (mode === 'manual') return 'Manual';
  if (mode === 'auto') return 'AI Generated';
  return '';
}

export function StudioEditor({
  initial,
  categories,
  cities,
  links,
}: {
  initial: ArticleDraft;
  categories: Choice[];
  cities: Choice[];
  links: { href: string; label: string }[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState('Saved');
  const [notice, setNotice] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [localBackup, setLocalBackup] = useState<ArticleDraft | null>(null);
  const [similar, setSimilar] = useState<SaveResult['similar']>([]);
  const [selection, setSelection] = useState('');
  const [chat, setChat] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | null>(null);
  const storageKey = `vora-blog:${initial.id ?? 'new'}`;

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as ArticleDraft;
      if (saved.content !== initial.content || saved.title !== initial.title) setLocalBackup(saved);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [initial.content, initial.title, storageKey]);

  useEffect(() => {
    const apply = () => {
      const viewport = window.visualViewport;
      const inset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      document.documentElement.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`);
    };
    apply();
    window.visualViewport?.addEventListener('resize', apply);
    window.visualViewport?.addEventListener('scroll', apply);
    return () => {
      window.visualViewport?.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('scroll', apply);
    };
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void persist(draft);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function edit<K extends keyof ArticleDraft>(field: K, value: ArticleDraft[K], manual = true) {
    setDraft((current) => ({
      ...current,
      [field]: value,
      fieldModes: manual ? { ...current.fieldModes, [field]: 'manual' as FieldMode } : current.fieldModes,
    }));
    setDirty(true);
    setState('Unsaved changes');
    const next = {
      ...draft,
      [field]: value,
      fieldModes: manual ? { ...draft.fieldModes, [field]: 'manual' as FieldMode } : draft.fieldModes,
    };
    localStorage.setItem(storageKey, JSON.stringify(next));
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void persist(next), 2000);
  }

  async function persist(current: ArticleDraft, status = current.status, source?: string): Promise<SaveResult | null> {
    setState('Saving…');
    const response = await fetch('/api/admin/blog/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: { ...current, status }, source }),
    });
    const result = (await response.json()) as SaveResult;
    if (!response.ok) {
      setState('Unsaved changes');
      setNotice(result.error || 'Kayıt başarısız. Metin tarayıcıda duruyor.');
      return null;
    }
    if (result.id && result.id !== current.id) {
      const saved = { ...current, id: result.id, status, updatedAt: result.updatedAt ?? null };
      setDraft(saved);
      localStorage.setItem(`vora-blog:${result.id}`, JSON.stringify(saved));
      router.replace(`/admin/blog/${result.id}`);
    } else {
      setDraft((item) => ({ ...item, status, updatedAt: result.updatedAt ?? item.updatedAt }));
    }
    setSimilar(result.similar ?? []);
    setDirty(false);
    setState('Saved just now');
    setNotice((result.warnings ?? []).length ? `Eksik: ${(result.warnings ?? []).join(', ')}` : '');
    return result;
  }

  async function runAi(action: string, extra?: { selection?: string; topic?: string; confirm?: boolean }) {
    setAiBusy(true);
    setNotice('');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch('/api/admin/blog/ai', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, draft, confirm: extra?.confirm, selection: extra?.selection, topic: extra?.topic || chat, language: draft.language }),
      });
      const result = (await response.json()) as { article?: ArticleDraft; patch?: { selection?: string }; error?: string; redirectId?: string };
      if (result.redirectId) {
        router.push(`/admin/blog/${result.redirectId}`);
        return;
      }
      if (!response.ok || !result.article) {
        setNotice(result.error || 'AI şu anda kullanılamıyor.');
        return;
      }
      let article = result.article;
      if (action === 'improve_selection' && extra?.selection && result.patch?.selection && contentRef.current) {
        const area = contentRef.current;
        const start = area.selectionStart ?? 0;
        const end = area.selectionEnd ?? start;
        article = { ...article, content: `${draft.content.slice(0, start)}${result.patch.selection}${draft.content.slice(end)}` };
      }
      article.status = draft.status === 'published' ? draft.status : 'draft';
      setDraft(article);
      localStorage.setItem(storageKey, JSON.stringify(article));
      setDirty(true);
      setState('Unsaved changes');
      window.setTimeout(() => void persist(article, article.status, 'ai'), 400);
    } catch (error) {
      if ((error as { name?: string }).name !== 'AbortError') setNotice('AI şu anda kullanılamıyor. Mevcut metin duruyor.');
    } finally {
      setAiBusy(false);
      abortRef.current = null;
    }
  }

  const scored = useMemo(() => scoreArticle(draft), [draft]);
  const reading = readabilityNotes(draft.content);
  const h1s = countH1(draft.content);
  const previewTitle = draft.seoTitle || draft.title || 'Başlık';
  const previewDesc = draft.seoDescription || draft.excerpt || 'Açıklama';

  function insert(snippet: string) {
    const area = contentRef.current;
    if (!area) {
      edit('content', `${draft.content}\n\n${snippet}`);
      return;
    }
    const start = area.selectionStart ?? draft.content.length;
    const end = area.selectionEnd ?? start;
    const content = `${draft.content.slice(0, start)}${snippet}${draft.content.slice(end)}`;
    edit('content', content);
  }

  return (
    <div className="studio">
      <header className="studio-top">
        <div>
          <p className="meta">Blog Studio</p>
          <strong>{draft.title || 'Adsız taslak'}</strong>
          <span className="meta"> {draft.status} · {state}</span>
        </div>
        <div className="studio-actions">
          <button type="button" onClick={() => void persist({ ...draft, status: 'draft' })}>Save Draft</button>
          <a href={draft.id ? `/admin/preview/blog/${draft.id}` : '#'}>Preview</a>
          {draft.id ? <a href={`/admin/studio/revisions/${draft.id}`}>Sürümler</a> : null}
          <button type="button" onClick={() => void persist(draft, 'published')}>Publish</button>
        </div>
      </header>
      {localBackup ? (
        <p className="studio-note">
          Unsaved local changes found.
          <button type="button" onClick={() => { setDraft(localBackup); setLocalBackup(null); setDirty(true); }}>Restore</button>
          <button type="button" onClick={() => { localStorage.removeItem(storageKey); setLocalBackup(null); }}>Discard</button>
        </p>
      ) : null}
      {notice ? <p className="studio-note">{notice}</p> : null}
      {aiBusy ? (
        <p className="studio-note">
          Vora AI yazıyor…
          <button type="button" onClick={() => abortRef.current?.abort()}>Cancel</button>
        </p>
      ) : null}
      <div className="studio-grid">
        <div>
          <label htmlFor="title">Başlık <em>{badge(draft.fieldModes.title)}</em></label>
          <input id="title" value={draft.title} onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center' })} onChange={(event) => edit('title', event.target.value)} />
          <div className="studio-tools">
            <button type="button" onClick={() => insert('\n\n## ')}>H2</button>
            <button type="button" onClick={() => insert('\n\n### ')}>H3</button>
            <button type="button" onClick={() => insert('\n\n#### ')}>H4</button>
            <button type="button" onClick={() => insert('**kalın**')}>Bold</button>
            <button type="button" onClick={() => insert('*italik*')}>Italic</button>
            <button type="button" onClick={() => insert('\n\n- ')}>Liste</button>
            <button type="button" onClick={() => insert('\n\n1. ')}>Sıralı</button>
            <button type="button" onClick={() => insert('\n\n> ')}>Alıntı</button>
            <button type="button" onClick={() => insert('\n\n---\n\n')}>Ayraç</button>
          </div>
          <label htmlFor="content">İçerik <em>{badge(draft.fieldModes.content)}</em></label>
          <textarea
            id="content"
            ref={contentRef}
            className="studio-content"
            value={draft.content}
            onSelect={(event) => {
              const area = event.currentTarget;
              setSelection(area.value.slice(area.selectionStart, area.selectionEnd));
            }}
            onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center' })}
            onChange={(event) => edit('content', event.target.value)}
          />
          {h1s > 0 ? <p className="studio-note">İçerikte {h1s} adet H1 var. H1 yalnızca yazı başlığıdır.</p> : null}
          {selection ? (
            <p className="studio-actions">
              <button type="button" onClick={() => void runAi('improve_selection', { selection })}>AI Improve</button>
              <button type="button" onClick={() => void runAi('rewrite', { selection })}>AI Rewrite</button>
              <button type="button" onClick={() => void runAi('shorten', { selection })}>AI Shorten</button>
              <button type="button" onClick={() => void runAi('expand', { selection })}>AI Expand</button>
            </p>
          ) : null}
          <label htmlFor="excerpt">Özet <em>{badge(draft.fieldModes.excerpt)}</em></label>
          <textarea id="excerpt" value={draft.excerpt} onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center' })} onChange={(event) => edit('excerpt', event.target.value)} />
          <label htmlFor="slug">Slug <em>{badge(draft.fieldModes.slug)}</em></label>
          <input id="slug" value={draft.slug} onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center' })} onChange={(event) => edit('slug', event.target.value)} />
          <label htmlFor="language">Dil</label>
          <select id="language" value={draft.language} onChange={(event) => edit('language', event.target.value)}>
            {['tr', 'en', 'de', 'fr', 'es', 'ar'].map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
          <label htmlFor="category">Kategori</label>
          <select id="category" value={draft.categoryId} onChange={(event) => edit('categoryId', event.target.value)}>
            <option value="">Seçilmedi</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <label htmlFor="city">Şehir</label>
          <select id="city" value={draft.citySlug} onChange={(event) => edit('citySlug', event.target.value)}>
            <option value="">Yok</option>
            {cities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <label htmlFor="tags">Etiketler</label>
          <input id="tags" value={draft.tags} onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center' })} onChange={(event) => edit('tags', event.target.value)} />
          <label htmlFor="cover">Kapak görseli</label>
          <input id="cover" value={draft.coverImageUrl} onChange={(event) => edit('coverImageUrl', event.target.value)} />
          <label htmlFor="alt">Alt metin <em>{badge(draft.fieldModes.coverImageAlt)}</em></label>
          <input id="alt" value={draft.coverImageAlt} onChange={(event) => edit('coverImageAlt', event.target.value)} />
          <label htmlFor="video">Video</label>
          <input id="video" value={draft.videoUrl} onChange={(event) => edit('videoUrl', event.target.value)} />
          <h2>SSS</h2>
          {draft.faqs.map((item, index) => (
            <div key={`${item.question}-${index}`}>
              <input value={item.question} aria-label="Soru" onChange={(event) => {
                const faqs = draft.faqs.map((faq, faqIndex) => faqIndex === index ? { ...faq, question: event.target.value } : faq);
                edit('faqs', faqs);
              }} />
              <textarea value={item.answer} aria-label="Cevap" onChange={(event) => {
                const faqs = draft.faqs.map((faq, faqIndex) => faqIndex === index ? { ...faq, answer: event.target.value } : faq);
                edit('faqs', faqs);
              }} />
            </div>
          ))}
          <button type="button" onClick={() => edit('faqs', [...draft.faqs, { question: '', answer: '' }])}>Add Question</button>
          <button type="button" onClick={() => void runAi('faq')}>AI Generate FAQ</button>
          <h2>İç bağlantı önerileri</h2>
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                {link.label}
                <button type="button" onClick={() => edit('links', [...draft.links, link])}>Insert</button>
              </li>
            ))}
          </ul>
          <label htmlFor="schedule">Yayın zamanı (İstanbul)</label>
          <input id="schedule" type="datetime-local" onChange={(event) => edit('scheduledAt', event.target.value ? new Date(`${event.target.value}:00+03:00`).toISOString() : '')} />
          <button type="button" onClick={() => void persist(draft, 'scheduled')}>Schedule</button>
          <label htmlFor="status">Durum</label>
          <select id="status" value={draft.status} onChange={(event) => edit('status', event.target.value, false)}>
            <option value="draft">Taslak</option>
            <option value="review">İnceleme</option>
            <option value="scheduled">Zamanlandı</option>
            <option value="published">Yayında</option>
            <option value="archived">Arşiv</option>
            <option value="trash">Çöp</option>
          </select>
        </div>
        <aside className="studio-side">
          <h2>SEO Score</h2>
          <p>{scored.score} / 100</p>
          <p className="meta">Bu skor bir sıralama vaadi değildir.</p>
          <ul>
            {scored.checks.map((check) => <li key={check.id}>{check.ok ? '✓' : '⚠'} {check.label}</li>)}
          </ul>
          <h2>Readability</h2>
          {reading.length === 0 ? <p>Paragraflar ve başlıklar dengeli görünüyor.</p> : <ul>{reading.map((note) => <li key={note}>{note}</li>)}</ul>}
          <h2>Google Search Preview</h2>
          <p><strong>{previewTitle}</strong></p>
          <p className="meta">vora.app/blog/{draft.slug || 'slug'}</p>
          <p>{previewDesc}</p>
          <h2>Facebook / X Preview</h2>
          <p>{draft.ogTitle || previewTitle}</p>
          <p>{draft.ogDescription || previewDesc}</p>
          <label htmlFor="seoTitle">SEO Title <em>{badge(draft.fieldModes.seoTitle)}</em></label>
          <input id="seoTitle" value={draft.seoTitle} onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center' })} onChange={(event) => edit('seoTitle', event.target.value)} />
          <label htmlFor="seoDescription">Meta description <em>{badge(draft.fieldModes.seoDescription)}</em></label>
          <textarea id="seoDescription" value={draft.seoDescription} onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center' })} onChange={(event) => edit('seoDescription', event.target.value)} />
          <label htmlFor="canonical">Canonical</label>
          <input id="canonical" value={draft.canonical} onChange={(event) => edit('canonical', event.target.value)} />
          <h2>Vora AI</h2>
          <textarea id="ai-prompt" value={chat} placeholder="Bu yazıyı daha profesyonel yap" onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center' })} onChange={(event) => setChat(event.target.value)} />
          <button type="button" onClick={() => void runAi('rewrite', { topic: chat })}>Uygula</button>
          <div className="studio-actions">
            {ACTIONS.map((action) => (
              <button key={action.id} type="button" onClick={() => (action.confirm ? setConfirmAction(action.id) : void runAi(action.id))}>{action.label}</button>
            ))}
          </div>
          {draft.factualNotes.length > 0 ? (
            <>
              <h2>Doğrulama</h2>
              <ul>{draft.factualNotes.map((note) => <li key={note}>{note}</li>)}</ul>
            </>
          ) : null}
          {similar && similar.length > 0 ? (
            <>
              <h2>Similar article</h2>
              <ul>{similar.map((item) => <li key={item.id}>{item.title}</li>)}</ul>
            </>
          ) : null}
        </aside>
      </div>
      {confirmAction ? (
        <div className="studio-modal" role="dialog" aria-modal="true">
          <p>{confirmAction === 'regenerate_all' ? 'Bu işlem başlık dahil mevcut alanları değiştirebilir.' : 'Bu işlem mevcut SEO title, description ve slug değerlerini değiştirebilir.'}</p>
          <button type="button" onClick={() => setConfirmAction(null)}>İptal</button>
          <button type="button" onClick={() => { const action = confirmAction; setConfirmAction(null); void runAi(action, { confirm: true }); }}>Devam Et</button>
        </div>
      ) : null}
      <div className="studio-bar">
        <span>{state}</span>
        <button type="button" onClick={() => void persist(draft)}>Save</button>
        <a href={draft.id ? `/admin/preview/blog/${draft.id}` : '#'}>Preview</a>
        <button type="button" onClick={() => void persist(draft, 'published')}>Publish</button>
      </div>
    </div>
  );
}
