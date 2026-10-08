import { notFound } from 'next/navigation';
import { sendChat } from '@/lib/app-actions';
import { createSessionClient } from '@/lib/supabase';
import { requireProfile } from '@/lib/session';

type MessageRow = {
  id: string;
  content: string | null;
  sender_id: string;
  created_at: string;
};

export default async function MessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireProfile();
  const supabase = await createSessionClient();
  const { data, error } = await supabase!
    .from('messages')
    .select('id, content, sender_id, created_at')
    .eq('conversation_id', id)
    .eq('deleted_for_all', false)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) notFound();
  const messages = (data ?? []) as MessageRow[];
  return (
    <>
      <h1>Sohbet</h1>
      <div className="stack thread">
        {messages.length === 0 ? <p className="empty">Henüz mesaj yok. İlk mesajı sen yaz.</p> : null}
        {messages.map((message) => (
          <p key={message.id} className={message.sender_id === user.id ? 'bubble mine' : 'bubble'}>
            {message.content}
          </p>
        ))}
      </div>
      <form className="stack" action={sendChat}>
        <input type="hidden" name="conversation_id" value={id} />
        <label htmlFor="content">Mesaj</label>
        <textarea id="content" name="content" required maxLength={2000} />
        <button className="btn" type="submit">
          Gönder
        </button>
      </form>
    </>
  );
}
