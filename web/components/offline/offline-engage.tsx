'use client';

import { useEffect, useState } from 'react';
import { IconBookmark, IconHeart } from '@/components/app-icons';
import { addComment } from '@/lib/app-actions';
import { enqueueAction, pendingForPost, subscribe } from '@/lib/offline/engine';

function usePending(postId: string, type: 'like' | 'save' | 'comment') {
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = () => {
      void pendingForPost(postId).then((rows) => {
        if (!alive) return;
        setPending(rows.some((row) => row.type === type || (type === 'like' && row.type === 'unlike') || (type === 'save' && row.type === 'unsave')));
      });
    };
    load();
    const stop = subscribe(load);
    return () => {
      alive = false;
      stop();
    };
  }, [postId, type]);
  return pending;
}

async function act(type: 'like' | 'save', postId: string) {
  const queued = await enqueueAction({ type, payload: { postId } });
  if (!queued.ok && queued.message.includes('giriş')) {
    location.href = '/login';
  }
  return queued.message;
}

export function OfflineLike({ postId }: { postId: string }) {
  const pending = usePending(postId, 'like');
  const [note, setNote] = useState('');
  return (
    <button
      type="button"
      className="vora-icon-btn"
      aria-label="Beğen"
      onClick={() => {
        void act('like', postId).then(setNote);
      }}
    >
      <IconHeart />
      {pending ? <span className="vora-pending">Beklemede</span> : null}
      {note && !pending ? <span className="sr-only">{note}</span> : null}
    </button>
  );
}

export function OfflineSave({ postId }: { postId: string }) {
  const pending = usePending(postId, 'save');
  return (
    <button
      type="button"
      className="vora-icon-btn"
      aria-label="Kaydet"
      onClick={() => {
        void act('save', postId);
      }}
    >
      <IconBookmark />
      {pending ? <span className="vora-pending">Beklemede</span> : null}
    </button>
  );
}

export function OfflineCommentForm({ postId }: { postId: string }) {
  const [items, setItems] = useState<{ id: string; content: string; error?: string }[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => {
      void pendingForPost(postId).then((rows) => {
        if (!alive) return;
        setItems(
          rows
            .filter((row) => row.type === 'comment')
            .map((row) => ({ id: row.id, content: String(row.payload.content ?? ''), error: row.lastError })),
        );
      });
    };
    load();
    const stop = subscribe(load);
    return () => {
      alive = false;
      stop();
    };
  }, [postId]);

  return (
    <>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <strong>Sen</strong> {item.content}{' '}
              <span className="vora-pending">{item.error || 'Beklemede'}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="stack"
        action={addComment}
        onSubmit={(event) => {
          if (navigator.onLine) return;
          event.preventDefault();
          const form = event.currentTarget;
          const content = String(new FormData(form).get('content') ?? '').trim();
          if (!content) return;
          void enqueueAction({
            type: 'comment',
            payload: { postId, content, clientNonce: crypto.randomUUID() },
          }).then((result) => {
            if (!result.ok && result.message.includes('giriş')) location.href = '/login';
            else form.reset();
          });
        }}
      >
        <input type="hidden" name="post_id" value={postId} />
        <label htmlFor="comment">Yorum yaz</label>
        <textarea id="comment" name="content" required maxLength={1000} />
        <button className="btn" type="submit">
          Gönder
        </button>
      </form>
    </>
  );
}
