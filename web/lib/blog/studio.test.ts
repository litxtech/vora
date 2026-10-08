import assert from 'node:assert/strict';
import test from 'node:test';
import { applyAiPatch, emptyDraft, keepRealLinks, scoreArticle, slugifyTr, tokenOverlap } from './studio';

test('slug normalizes Turkish text', () => {
  assert.equal(slugifyTr('Trabzon’da Yeni İnsanlarla Tanışmanın En İyi Yolları'), 'trabzonda-yeni-insanlarla-tanisma-yollari');
});

test('manual title survives a content rewrite', () => {
  const draft = emptyDraft();
  draft.title = 'Elle yazılan başlık';
  draft.fieldModes.title = 'manual';
  draft.content = 'eski';
  const next = applyAiPatch(draft, { title: 'AI başlığı', content: 'yeni metin' }, 'rewrite', false);
  assert.equal(next.title, 'Elle yazılan başlık');
  assert.equal(next.content, 'yeni metin');
});

test('regenerate all requires confirmation', () => {
  const draft = emptyDraft();
  draft.title = 'Eski';
  draft.fieldModes.title = 'manual';
  const blocked = applyAiPatch(draft, { title: 'Yeni' }, 'regenerate_all', false);
  const allowed = applyAiPatch(draft, { title: 'Yeni' }, 'regenerate_all', true);
  assert.equal(blocked.title, 'Eski');
  assert.equal(allowed.title, 'Yeni');
});

test('invented internal links are dropped', () => {
  const kept = keepRealLinks(
    [
      { href: '/city/trabzon', label: 'Trabzon' },
      { href: '/uydurma-sayfa', label: 'Yok' },
    ],
    new Set(['/city/trabzon']),
  );
  assert.equal(kept.length, 1);
});

test('similar titles overlap', () => {
  const score = tokenOverlap('Trabzon’da yapılacak şeyler', 'Trabzon’da yapılabilecek aktiviteler');
  assert.ok(score >= 0.3);
});

test('seo score does not claim a ranking', () => {
  const draft = emptyDraft();
  draft.title = 'Trabzon’da yeni insanlarla tanışmak';
  draft.slug = 'trabzonda-yeni-insanlarla-tanismak';
  draft.seoTitle = 'Trabzon’da yeni insanlarla tanışmak';
  draft.seoDescription = 'Trabzon’da yeni bir çevre kurmak için şehir odası, etkinlikler ve herkese açık profiller nasıl kullanılır.';
  draft.content = `${'Trabzon’da yeni insanlarla tanışmak zaman ister. '.repeat(40)}\n\n## Nereden başlanır\n\nŞehir sayfasına bak.`;
  draft.coverImageUrl = 'https://vora.app/cover.webp';
  draft.coverImageAlt = 'Trabzon sahili';
  draft.faqs = [{ question: 'Nereden başlanır?', answer: 'Şehir sayfasından.' }];
  draft.links = [{ href: '/city/trabzon', label: 'Trabzon' }];
  const result = scoreArticle(draft);
  assert.ok(result.score >= 80);
  assert.equal(JSON.stringify(result).includes('1. sıra'), false);
});
