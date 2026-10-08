function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safeUrl(raw: string): string | null {
  const value = raw.trim();
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
  } catch {
    return null;
  }
  return null;
}

/** Ham HTML kabul etmez. Kaçıştan sonra sınırlı markdown uygulanır. */
export function renderMarkdown(source: string): string {
  const escaped = escapeHtml(source.replace(/\r\n/g, '\n'));
  const withInline = escaped
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_match, alt: string, href: string) => {
      const url = safeUrl(href);
      if (!url) return alt;
      return `<img src="${url}" alt="${alt}" loading="lazy" />`;
    })
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) => {
      const url = safeUrl(href);
      if (!url) return label;
      const external = url.startsWith('http');
      const rel = external ? ' rel="noopener noreferrer"' : '';
      const target = external ? ' target="_blank"' : '';
      return `<a href="${url}"${target}${rel}>${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$)/g, '$1<em>$2</em>');

  const blocks = withInline.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((line) => line.startsWith('- '))) {
        const items = lines.map((line) => `<li>${line.slice(2)}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      if (lines[0]?.startsWith('### ')) return `<h3>${lines[0].slice(4)}</h3>`;
      if (lines[0]?.startsWith('## ')) return `<h2>${lines[0].slice(3)}</h2>`;
      if (lines[0]?.startsWith('# ')) return `<h2>${lines[0].slice(2)}</h2>`;
      return `<p>${lines.join('<br />')}</p>`;
    })
    .join('');
}

export type VideoEmbed =
  | { kind: 'youtube'; id: string }
  | { kind: 'vimeo'; id: string }
  | { kind: 'mp4'; url: string };

export function parseVideo(url: string | null | undefined): VideoEmbed | null {
  if (!url) return null;
  const value = url.trim();
  const youtube = value.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  if (youtube?.[1]) return { kind: 'youtube', id: youtube[1] };
  const vimeo = value.match(/vimeo\.com\/(\d{6,})/);
  if (vimeo?.[1]) return { kind: 'vimeo', id: vimeo[1] };
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' && parsed.pathname.toLowerCase().endsWith('.mp4')) {
      return { kind: 'mp4', url: parsed.toString() };
    }
  } catch {
    return null;
  }
  return null;
}
