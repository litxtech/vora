import Link from 'next/link';
import { createSessionClient } from '@/lib/supabase';
import { requireProfile } from '@/lib/session';

type ConversationRow = {
  conversation_id: string;
  title: string | null;
  other_full_name: string | null;
  other_username: string | null;
  last_message_preview: string | null;
  unread_count: number | null;
};

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireProfile();
  const { error } = await searchParams;
  const supabase = await createSessionClient();
  const { data, error: rpcError } = await supabase!.rpc('get_user_conversations', { p_archived_only: false });
  const rows = (rpcError ? [] : (data ?? [])) as ConversationRow[];
  return (
    <>
      <h1>Mesajlar</h1>
      {error ? <p className="form-error">Sohbet açılamadı.</p> : null}
      {rows.length === 0 ? (
        <p className="empty">Henüz sohbet yok. Bir profili açıp mesaj gönderebilirsin.</p>
      ) : (
        <div className="stack">
          {rows.map((row) => (
            <Link className="person-row" key={row.conversation_id} href={`/app/messages/${row.conversation_id}`}>
              <span className="feed-avatar">{(row.other_full_name || row.other_username || 'S').slice(0, 1).toUpperCase()}</span>
              <span>
                <strong>{row.title || row.other_full_name || (row.other_username ? `@${row.other_username}` : 'Sohbet')}</strong>
                <small>
                  {row.last_message_preview || 'Yeni sohbet'}
                  {row.unread_count ? ` · ${row.unread_count}` : ''}
                </small>
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
