import * as Clipboard from 'expo-clipboard';
import type { ChatMessage } from '../types';

function messageCopyText(message: ChatMessage): string {
  if (message.deletedForAll) return 'Bu mesaj silindi';
  if (message.content?.trim()) return message.content;

  switch (message.messageType) {
    case 'image':
      return '📷 Fotoğraf';
    case 'video':
      return '🎬 Video';
    case 'audio':
      return '🎤 Ses kaydı';
    case 'location': {
      const location = (() => {
        try {
          const parsed = JSON.parse(message.content) as { label?: string; latitude?: number; longitude?: number };
          if (parsed.label) return `📍 ${parsed.label}`;
          if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
            return `📍 ${parsed.latitude.toFixed(5)}, ${parsed.longitude.toFixed(5)}`;
          }
        } catch {
          // ignore
        }
        return '📍 Konum';
      })();
      return location;
    }
    case 'file':
      return '📎 Dosya';
    case 'shared_post':
      return message.content || '📝 Gönderi';
    case 'shared_reel':
      return message.content || '🎬 Reel';
    case 'shared_profile':
      return message.content || '👤 Profil';
    case 'shared_marketplace_listing':
      return message.content || '🛒 Pazar ilanı';
    case 'shared_job_listing':
      return message.content || '💼 İş ilanı';
    case 'shared_staff_listing':
      return message.content || '👥 Personel talebi';
    case 'shared_vora_need':
      return message.content || '🤝 İhtiyaç ilanı';
    case 'call':
      return message.content || '📞 Arama';
    default:
      return message.content ?? '';
  }
}

export async function copyMessages(messages: ChatMessage[]): Promise<string> {
  const text = messages.map(messageCopyText).filter(Boolean).join('\n\n');
  if (!text) return '';
  await Clipboard.setStringAsync(text);
  return text;
}
