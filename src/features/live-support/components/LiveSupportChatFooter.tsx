import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { LiveSupportComposer, type LiveSupportComposerHandle } from '@/features/live-support/components/LiveSupportComposer';
import { LiveSupportTopicChips } from '@/features/live-support/components/LiveSupportTopicChips';
import {
  pickLiveSupportImageFromLibrary,
  pickLiveSupportVideoFromLibrary,
} from '@/features/live-support/services/liveSupportPickMedia';
import type { LiveSupportStatus, LiveSupportTopic } from '@/features/live-support/types';

type LiveSupportChatFooterProps = {
  threadStatus: LiveSupportStatus | null;
  messagesCount: number;
  isFreshSession?: boolean;
  sending: boolean;
  initialTopic?: LiveSupportTopic | null;
  suggestedDraft?: string;
  sendMessage: (
    content: string,
    topic?: LiveSupportTopic | null,
  ) => Promise<{ error: string | null }>;
  sendImage: (
    localUri: string,
    caption?: string,
    topic?: LiveSupportTopic | null,
    mimeType?: string,
  ) => Promise<{ error: string | null }>;
  sendVideo: (
    localUri: string,
    caption?: string,
    topic?: LiveSupportTopic | null,
    durationSec?: number,
    mimeType?: string,
  ) => Promise<{ error: string | null }>;
  onSent?: () => void;
};

export const LiveSupportChatFooter = memo(function LiveSupportChatFooter({
  threadStatus,
  messagesCount,
  isFreshSession = false,
  sending,
  initialTopic = null,
  suggestedDraft,
  sendMessage,
  sendImage,
  sendVideo,
  onSent,
}: LiveSupportChatFooterProps) {
  const composerRef = useRef<LiveSupportComposerHandle>(null);
  const [selectedTopic, setSelectedTopic] = useState<LiveSupportTopic | null>(initialTopic);
  const [error, setError] = useState<string | null>(null);
  const captionRef = useRef('');

  useEffect(() => {
    if (!suggestedDraft || messagesCount > 0) return;
    composerRef.current?.setDraft(suggestedDraft);
    if (initialTopic) setSelectedTopic(initialTopic);
  }, [initialTopic, messagesCount, suggestedDraft]);

  const applyTopic = useCallback((topic: { id: LiveSupportTopic; prompt: string }) => {
    setSelectedTopic(topic.id);
    const current = captionRef.current;
    if (!current.trim()) {
      composerRef.current?.setDraft(topic.prompt);
    }
  }, []);

  const clearAfterSend = useCallback(() => {
    composerRef.current?.clearDraft();
    captionRef.current = '';
    onSent?.();
  }, [onSent]);

  const handleSend = useCallback(
    async (content: string) => {
      if (content.length < 2) return;

      setError(null);
      captionRef.current = content;
      const { error: sendError } = await sendMessage(content, selectedTopic);
      if (sendError) {
        setError(sendError);
        composerRef.current?.setDraft(content);
        return;
      }

      clearAfterSend();
    },
    [clearAfterSend, selectedTopic, sendMessage],
  );

  const pickImage = useCallback(async () => {
    const asset = await pickLiveSupportImageFromLibrary();
    if (!asset?.uri) return;

    setError(null);
    const { error: sendError } = await sendImage(
      asset.uri,
      captionRef.current,
      selectedTopic,
      asset.mimeType ?? undefined,
    );
    if (sendError) {
      setError(sendError);
      return;
    }

    clearAfterSend();
  }, [clearAfterSend, selectedTopic, sendImage]);

  const pickVideo = useCallback(async () => {
    const picked = await pickLiveSupportVideoFromLibrary();
    if (!picked) return;

    setError(null);
    const { error: sendError } = await sendVideo(
      picked.uri,
      captionRef.current,
      selectedTopic,
      picked.durationSec,
    );
    if (sendError) {
      setError(sendError);
      return;
    }

    clearAfterSend();
  }, [clearAfterSend, selectedTopic, sendVideo]);

  const closedNote =
    isFreshSession
      ? null
      : threadStatus === 'closed'
        ? 'Bu sohbet kapatıldı. Yeni mesaj yazarsanız destek ekibine yeniden iletilir.'
        : threadStatus === 'no_response'
          ? 'Bu sohbet yanıt alınamadığı için kapatıldı. Yeni mesaj yazarsanız destek ekibine iletilir.'
          : threadStatus === 'resolved'
            ? 'Bu talep çözüldü olarak işaretlendi. Yeni mesaj yazarsanız destek ekibine iletilir.'
            : threadStatus === 'waiting_user'
              ? 'Destek ekibi ek bilgi istedi. Yanıtınızı aşağıdan yazabilirsiniz.'
              : null;

  const topicChips =
    messagesCount === 0 ? (
      <LiveSupportTopicChips selectedTopic={selectedTopic} onSelectTopic={applyTopic} />
    ) : null;

  return (
    <LiveSupportComposer
      ref={composerRef}
      defaultDraft={suggestedDraft}
      onSend={(content) => {
        captionRef.current = content;
        void handleSend(content);
      }}
      onPickImage={() => void pickImage()}
      onPickVideo={() => void pickVideo()}
      sending={sending}
      closedNote={closedNote}
      error={error}
      topicChips={topicChips}
    />
  );
});
